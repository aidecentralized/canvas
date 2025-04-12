// server/src/mcp/manager.ts
import { Server as SocketIoServer } from "socket.io";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
// ToolRegistry import is no longer needed here, but keep if ServerConfig uses it indirectly
// import { ToolRegistry } from "./toolRegistry.js";
import { SessionManager } from "./sessionManager.js"; // Import SessionManager
import { RegistryClient } from "../registry/client.js";

export interface McpManager {
  discoverTools: (sessionId: string) => Promise<Tool[]>;
  executeToolCall: (
    sessionId: string,
    toolName: string,
    args: any
  ) => Promise<any>;
  registerServer: (sessionId: string, serverConfig: ServerConfig) => Promise<void>; // Added sessionId
  unregisterServer: (sessionId: string, serverId: string) => Promise<void>; // Added sessionId
  fetchRegistryServers: () => Promise<ServerConfig[]>; // Removed registerServers flag
  getAvailableServers: (sessionId: string) => ServerConfig[]; // Added sessionId
  // cleanup: () => Promise<void>; // Removed, handled by SessionManager
}

export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  description?: string;
  types?: string[];
  tags?: string[];
  verified?: boolean;
  rating?: number;
}

export function setupMcpManager(
  io: SocketIoServer,
  sessionManager: SessionManager, // Inject SessionManager
  registryUrl?: string,
  registryApiKey?: string
): McpManager {
  // REMOVED global toolRegistry instance
  // const toolRegistry = new ToolRegistry();

  // Registry client if URL is provided
  const registryClient = registryUrl
    ? new RegistryClient({
        url: registryUrl,
        apiKey: registryApiKey,
      })
    : null;

  // Fetch servers from registry (Does NOT register them anymore)
  const fetchRegistryServers = async (): Promise<ServerConfig[]> => {
    if (!registryClient) {
      console.warn("Registry client not configured. Cannot fetch registry servers.");
      return [];
    }
    try {
      console.log("Fetching servers from registry...");
      const registryServers = await registryClient.getServers();
      console.log(`Fetched ${registryServers.length} servers from registry.`);
      return registryServers;
    } catch (error) {
      console.error("Error fetching servers from registry:", error);
      return [];
    }
  };

  // Register a server for a specific session
  const registerServer = async (sessionId: string, serverConfig: ServerConfig): Promise<void> => {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found.`);
    }
    // Get the session-specific tool registry
    const sessionToolRegistry = sessionManager.getSessionToolRegistry(sessionId);
    if (!sessionToolRegistry) {
        // This should ideally not happen if session exists
        throw new Error(`ToolRegistry not found for session ${sessionId}.`);
    }

    console.log(`Registering server ${serverConfig.id} for session ${sessionId}`);

    // Check if already registered *in this session* by URL or ID before connecting
    const existingServer = session.servers.find(s => s.id === serverConfig.id || s.url === serverConfig.url);
    if (existingServer) {
        console.log(`Server ${serverConfig.id} (${serverConfig.url}) already registered or URL conflict in session ${sessionId}. Updating metadata.`);
        if (existingServer.url === serverConfig.url) {
            sessionManager.addSessionServer(sessionId, serverConfig);
            return;
        }
        await unregisterServer(sessionId, existingServer.id);
    }

    try {
      // Create MCP client for this server using SSE transport
      const sseUrl = new URL(serverConfig.url);
      const transport = new SSEClientTransport(sseUrl);

      const client = new Client({
        name: `mcp-host-session-${sessionId}`, // Session-specific client name
        version: "1.0.0",
      });

      await client.connect(transport);

      // Fetch available tools from the server
      const toolsResult = await client.listTools();

      // Add server and client to the session
      sessionManager.addSessionServer(sessionId, serverConfig);
      sessionManager.addSessionClient(sessionId, serverConfig.id, client);

      // Register tools in the SESSION-SPECIFIC registry
      if (toolsResult?.tools) {
        // Use sessionToolRegistry here
        sessionToolRegistry.registerTools(serverConfig.id, client, toolsResult.tools);
        console.log(
          `Registered server ${serverConfig.name} with ${toolsResult.tools.length} tools for session ${sessionId}`
        );
      } else {
        console.log(
          `Registered server ${serverConfig.name} with 0 tools for session ${sessionId}`
        );
      }

    } catch (error) {
      console.error(
        `Failed to connect to MCP server ${serverConfig.name} for session ${sessionId}:`,
        error
      );
      // Important: Do not add server/client to session if connection failed
      throw error; // Re-throw error to inform the caller
    }
  };

  // Unregister a server for a specific session
  const unregisterServer = async (sessionId: string, serverId: string): Promise<void> => {
    console.log(`Unregistering server ${serverId} for session ${sessionId}`);
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      console.warn(`Session ${sessionId} not found during unregistration.`);
      return; // Or throw error?
    }
    // Get the session-specific tool registry
    const sessionToolRegistry = sessionManager.getSessionToolRegistry(sessionId);

    // Close and remove client connection from session
    const client = sessionManager.getSessionClient(sessionId, serverId);
    if (client) {
        try {
            await client.close();
            console.log(`Closed client connection for server ${serverId} in session ${sessionId}.`);
        } catch (error) {
            console.error(`Error closing client connection for ${serverId} in session ${sessionId}:`, error);
        }
    } else {
        console.warn(`No active client found for server ${serverId} in session ${sessionId} to close.`);
    }
    sessionManager.removeSessionClient(sessionId, serverId);


    // Remove server config from session
    const removed = sessionManager.removeSessionServer(sessionId, serverId);
    if (!removed) {
        console.warn(`Server ${serverId} not found in session ${sessionId} list.`);
    }

    // Remove tools associated with this server from the SESSION-SPECIFIC registry
    if (sessionToolRegistry) {
        sessionToolRegistry.removeToolsByServerId(serverId);
        console.log(`Removed tools associated with server ${serverId} from session ${sessionId} registry.`);
    } else {
        console.warn(`ToolRegistry not found for session ${sessionId} during unregistration.`);
    }
  };

  // Discover tools available for a specific session
  const discoverTools = async (sessionId: string): Promise<Tool[]> => {
    const sessionServers = sessionManager.getSessionServers(sessionId);
    const sessionToolRegistry = sessionManager.getSessionToolRegistry(sessionId);

    if (!sessionToolRegistry) {
        console.warn(`ToolRegistry not found for session ${sessionId} during tool discovery.`);
        return [];
    }

    const availableTools: Tool[] = [];
    const toolNames = new Set<string>();
    const activeServerIds = new Set(sessionServers.map(s => s.id));

    // Get all tools from the session's registry
    const allSessionTools = sessionToolRegistry.getAllToolsWithInfo();

    for (const toolInfo of allSessionTools) {
        // Only include tools whose server is currently registered in the session
        if (activeServerIds.has(toolInfo.serverId)) {
            if (!toolNames.has(toolInfo.tool.name)) {
                availableTools.push(toolInfo.tool);
                toolNames.add(toolInfo.tool.name);
            }
        }
    }
    return availableTools;
  };

  // Execute a tool call within a specific session
  const executeToolCall = async (
    sessionId: string,
    toolName: string,
    args: any
  ): Promise<any> => {
    // Get the session-specific tool registry
    const sessionToolRegistry = sessionManager.getSessionToolRegistry(sessionId);
    if (!sessionToolRegistry) {
        throw new Error(`ToolRegistry not found for session ${sessionId}`);
    }

    // Find tool in the SESSION-SPECIFIC registry
    const toolInfo = sessionToolRegistry.getToolInfo(toolName);
    if (!toolInfo) {
      throw new Error(`Tool ${toolName} not found in registry for session ${sessionId}`);
    }

    const { serverId } = toolInfo;
    // Get the session-specific client connection
    const client = sessionManager.getSessionClient(sessionId, serverId);

    if (!client) {
      // Check if the server is still supposed to be registered for the session
      const sessionServers = sessionManager.getSessionServers(sessionId);
      if (!sessionServers.some(s => s.id === serverId)) {
          throw new Error(`Server ${serverId} (for tool ${toolName}) is not registered in session ${sessionId}`);
      }
      // If server is registered but client is missing, it indicates an internal error or connection issue
      throw new Error(`Client for server ${serverId} not found or not connected in session ${sessionId}, though server is registered.`);
    }

    try {
      // Execute the tool via MCP using the session-specific client
      console.log(`Executing tool ${toolName} via server ${serverId} for session ${sessionId}`);
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });
      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolName} for session ${sessionId}:`, error);
      throw error;
    }
  };

  // Get available server configurations for a specific session
  const getAvailableServers = (sessionId: string): ServerConfig[] => {
    return sessionManager.getSessionServers(sessionId);
  };

  // Removed cleanup method, SessionManager handles it

  // Return the MCP manager interface
  return {
    discoverTools,
    executeToolCall,
    registerServer,
    unregisterServer,
    fetchRegistryServers,
    getAvailableServers,
    // cleanup, // Removed
  };
}
