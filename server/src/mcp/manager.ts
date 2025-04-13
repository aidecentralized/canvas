// server/src/mcp/manager.ts
import { Server as SocketIoServer } from "socket.io";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolRegistry } from "./toolRegistry.js";
import { SessionManager } from "./sessionManager.js";
import { McpManager, ToolCall, ToolInfo, ToolResult, CredentialRequirement, ServerConfig, ToolCredentialInfo } from './types.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { RegistryClient } from "../registry/client.js";

// Add configuration for server persistence only
const STORAGE_DIR = process.env.MCP_STORAGE_DIR || path.join(process.cwd(), 'storage');
const SERVERS_FILE = path.join(STORAGE_DIR, 'servers.json');

// Ensure the storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Create servers file if it doesn't exist - with empty array
if (!fs.existsSync(SERVERS_FILE)) {
  fs.writeFileSync(SERVERS_FILE, JSON.stringify([], null, 2));
}

// Ensure the file is only readable by the server process
try {
  fs.chmodSync(SERVERS_FILE, 0o600);
} catch (error) {
  console.warn('Unable to set file permissions, server configuration may not be secure');
}

// Load servers from file
const loadServers = (): ServerConfig[] => {
  try {
    const data = fs.readFileSync(SERVERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading servers:', error);
    return [];
  }
};

// Save servers to file
const saveServers = (servers: ServerConfig[]) => {
  try {
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2));
  } catch (error) {
    console.error('Error saving servers:', error);
  }
};

export function setupMcpManager(io: SocketIoServer, registryUrl?: string, registryApiKey?: string): McpManager {
  console.log("--- McpManager setup initiated ---");
  
  // Registry to keep track of available MCP tools
  const toolRegistry = new ToolRegistry();

  // Session manager to handle client sessions
  const sessionManager = new SessionManager();

  // Available server configurations - load from storage
  const servers: ServerConfig[] = loadServers();

  // Cache of connected clients
  const connectedClients: Map<string, Client> = new Map();
  
  // Initialize registry client if URL is provided
  const registryClient = registryUrl
    ? new RegistryClient({
        url: registryUrl,
        apiKey: registryApiKey,
      })
    : null;

  const registerServer = async (serverConfig: ServerConfig): Promise<void> => {
    console.log(`Registering server: ${JSON.stringify(serverConfig)}`);
    
    // Check if this server already exists
    const existingIndex = servers.findIndex((s) => s.id === serverConfig.id);
    if (existingIndex !== -1) {
      servers[existingIndex] = serverConfig;
    } else {
      servers.push(serverConfig);
    }
    
    // Save updated server list
    saveServers(servers);

    try {
      // Create MCP client for this server using SSE transport
      const sseUrl = new URL(serverConfig.url);
      
      // Use standard SSE transport with default timeout
      const transport = new SSEClientTransport(sseUrl);

      const client = new Client({
        name: "mcp-host",
        version: "1.0.0",
        // Set the timeout at the client level
        defaultTimeout: 180000, // 3 minutes timeout
        // Add retry configuration
        retryConfig: {
          maxRetries: 3,
          initialDelay: 1000, // Start with 1 second delay
          maxDelay: 10000,    // Max 10 second delay
          backoffFactor: 2    // Exponential backoff factor
        }
      });

      await client.connect(transport);
      console.log(`Successfully connected to server: ${serverConfig.id}`);

      // Fetch available tools from the server
      const toolsResult = await client.listTools();
      console.log(`Tools discovered: ${JSON.stringify(toolsResult?.tools?.map(t => t.name) || [])}`);

      // Register tools in our registry
      if (toolsResult?.tools) {
        toolRegistry.registerTools(
          serverConfig.id, 
          serverConfig.name,
          client, 
          toolsResult.tools
        );
      }

      // Store the connected client for later use
      connectedClients.set(serverConfig.id, client);

      console.log(
        `Registered server ${serverConfig.name} with ${
          toolsResult?.tools?.length || 0
        } tools`
      );
    } catch (error) {
      console.error(
        `Failed to connect to MCP server ${serverConfig.name}:`,
        error
      );
      // We don't remove the server from our list anymore since it's persistent
      // Just log the error and continue
    }
  };

  // Discover all available tools for a session
  const discoverTools = async (sessionId: string): Promise<ToolInfo[]> => {
    const tools = toolRegistry.getAllTools();
    console.log(`Discovered tools for session ${sessionId}: ${JSON.stringify(tools.map(t => t.name))}`);
    return tools;
  };

  // Execute a tool call
  const executeToolCall = async (
    sessionId: string,
    toolName: string,
    args: any
  ): Promise<any> => {
    const toolInfo = toolRegistry.getToolInfo(toolName);
    if (!toolInfo) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const { client, tool, serverId } = toolInfo;
    const maxRetries = 2; // Maximum number of retries
    let retries = 0;
    let lastError: any = null;

    while (retries <= maxRetries) {
      try {
        // Get credentials for this tool if required
        const credentials = sessionManager.getToolCredentials(
          sessionId,
          toolName,
          serverId
        );
        
        // Enhanced logging to show credential details
        if (credentials) {
          const credKeys = Object.keys(credentials);
          console.log(`✅ Credentials retrieved successfully for ${toolName}, server ${serverId}`);
          console.log(`🔑 Retrieved credential keys: ${JSON.stringify(credKeys)}`);
          console.log(`✅ Executing tool ${toolName} with UI-provided credentials (attempt ${retries + 1}/${maxRetries + 1})`);
          console.log(`📝 Credential keys: ${JSON.stringify(credKeys)}`);
          
          // Log a snippet of each credential value for verification
          const credSnippets = {};
          for (const key of credKeys) {
            const value = credentials[key];
            if (typeof value === 'string') {
              // Only show first 4 chars to protect sensitive information
              credSnippets[key] = value.substring(0, 4) + '...';
            } else {
              credSnippets[key] = typeof value;
            }
          }
          console.log(`🔑 Credential snippets: ${JSON.stringify(credSnippets)}`);
        } else {
          console.log(`❌ No credentials found for tool ${toolName}, server ${serverId}`);
          console.log(`⚠️ Executing tool ${toolName} WITHOUT UI-provided credentials - may use AWS credentials`);
        }

        // Add credentials to args if available
        const argsWithCredentials = credentials 
          ? { ...args, __credentials: credentials }
          : args;

        // Execute the tool via MCP
        const result = await client.callTool({
          name: toolName,
          arguments: argsWithCredentials,
          // The timeout is set at client level already
        });

        // Add credential source to the result for debugging
        const enhancedResult = {
          ...result,
          content: Array.isArray(result.content) 
            ? result.content  // Remove debug info from the content
            : [{ 
                type: "text", 
                text: `Tool result for ${toolName}`,
              }]
        };

        console.log(`✅ Tool ${toolName} executed successfully after ${retries} retries`);
        return enhancedResult;
      } catch (error) {
        lastError = error;
        console.error(`Error executing tool ${toolName} (attempt ${retries + 1}/${maxRetries + 1}):`, error);
        
        // If it's a timeout error, try again
        if (error.code === -32001) { // This is the timeout error code
          retries++;
          if (retries <= maxRetries) {
            const backoffMs = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff up to 10 seconds
            console.log(`Retrying in ${backoffMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
        } else {
          // For non-timeout errors, don't retry
          break;
        }
      }
    }
    
    // If we're here, all retries failed
    console.error(`All ${maxRetries + 1} attempts to execute tool ${toolName} failed.`);

    // Create a fallback response for timeout errors
    if (lastError && lastError.code === -32001) {
      return {
        content: [
          {
            type: "text",
            text: `I'm sorry, but I couldn't get a response from the ${toolName} service. The request timed out after multiple attempts. This might be due to network issues or the service being temporarily unavailable.`,
          }
        ]
      };
    }
    
    // For other errors, throw the last error
    throw lastError;
  };

  // Get all available server configurations
  const getAvailableServers = (): ServerConfig[] => {
    console.log(`Available servers: ${JSON.stringify(servers.map(s => s.id))}`);
    return [...servers];
  };

  // Get tools that require credentials
  const getToolsWithCredentialRequirements = (sessionId: string): ToolCredentialInfo[] => {
    const tools = toolRegistry.getToolsWithCredentialRequirements();
    console.log(`Tools with credential requirements for session ${sessionId}: ${JSON.stringify(tools.map(t => t.toolName))}`);
    return tools;
  };

  // Set credentials for a tool
  const setToolCredentials = async (
    sessionId: string,
    toolName: string,
    serverId: string,
    credentials: Record<string, string>
  ): Promise<boolean> => {
    console.log(`Setting credentials for tool ${toolName} from server ${serverId}`);
    try {
      // Store credentials in session manager only (browser session)
      sessionManager.setToolCredentials(
        sessionId,
        toolName,
        serverId,
        credentials
      );
      
      console.log(`🔐 Storing credentials for tool: ${toolName}, server: ${serverId}`);
      console.log(`🔑 Credential keys: ${JSON.stringify(Object.keys(credentials))}`);
      console.log(`✅ Credentials stored successfully for ${toolName}`);
      
      return true;
    } catch (error) {
      console.error(`Error setting credentials for tool ${toolName}:`, error);
      return false;
    }
  };

  // Clean up connections when closing
  const cleanup = async (): Promise<void> => {
    for (const [serverId, client] of connectedClients.entries()) {
      try {
        await client.close();
        console.log(`Closed connection to server ${serverId}`);
      } catch (error) {
        console.error(`Error closing connection to server ${serverId}:`, error);
      }
    }
    connectedClients.clear();
  };

  // Fetch servers from registry
  const fetchRegistryServers = async (): Promise<ServerConfig[]> => {
    if (!registryClient) {
      console.log("Fetching servers from registry is not implemented yet.");
      return [];
    }

    try {
      console.log("Fetching servers from registry...");
      // Specify a high limit (e.g., 500) to get as many servers as possible
      const registryServers = await registryClient.getServers(500);
      console.log(`Fetched ${registryServers.length} servers from registry`);

      // Register all discovered servers
      for (const serverConfig of registryServers) {
        // Check if server is already registered by ID or URL
        const existingServerWithSameUrl = servers.find(
          (s) => s.url === serverConfig.url
        );

        if (existingServerWithSameUrl) {
          // Server with same URL exists, update it with new metadata but keep track
          console.log(
            `Server with URL ${serverConfig.url} already exists with ID ${existingServerWithSameUrl.id}, updating metadata`
          );

          // Update the existing server entry with new metadata
          Object.assign(existingServerWithSameUrl, {
            ...serverConfig,
            id: existingServerWithSameUrl.id, // Keep the original ID
          });
          
          // Save the updated server list
          saveServers(servers);
        } else if (!servers.some((s) => s.id === serverConfig.id)) {
          // This is a completely new server, register it
          try {
            await registerServer(serverConfig);
          } catch (error) {
            console.error(
              `Failed to register server ${serverConfig.name} from registry:`,
              error
            );
          }
        }
      }

      return registryServers;
    } catch (error) {
      console.error("Error fetching servers from registry:", error);
      return [];
    }
  };

  // Auto-register all servers from storage on startup
  const autoRegisterServers = async () => {
    console.log(`Auto-registering ${servers.length} servers from storage...`);
    for (const server of servers) {
      await registerServer(server);
    }
  };
  
  // Start auto-registration process in the background
  autoRegisterServers().catch(error => {
    console.error("Error auto-registering servers:", error);
  });

  // Return the MCP manager interface
  return {
    discoverTools,
    executeToolCall,
    registerServer,
    getAvailableServers,
    getToolsWithCredentialRequirements,
    setToolCredentials,
    cleanup,
    getSessionManager: () => sessionManager,
    fetchRegistryServers
  };
}
