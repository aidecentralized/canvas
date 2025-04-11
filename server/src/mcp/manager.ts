// server/src/mcp/manager.ts
import { Server as SocketIoServer } from "socket.io";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolRegistry } from "./toolRegistry.js";
import { SessionManager } from "./sessionManager.js";
import { RegistryClient } from "../registry/client.js";

export interface McpManager {
  discoverTools: (sessionId: string) => Promise<Tool[]>;
  executeToolCall: (
    sessionId: string,
    toolName: string,
    args: any
  ) => Promise<any>;
  registerServer: (serverConfig: ServerConfig) => Promise<void>;
  fetchRegistryServers: () => Promise<ServerConfig[]>;
  getAvailableServers: () => ServerConfig[];
  cleanup: () => Promise<void>;
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
  registryUrl?: string,
  registryApiKey?: string
): McpManager {
  // Registry to keep track of available MCP tools
  const toolRegistry = new ToolRegistry();

  // Session manager to handle client sessions
  const sessionManager = new SessionManager();

  // Available server configurations
  const servers: ServerConfig[] = [];

  // Cache of connected clients
  const connectedClients: Map<string, Client> = new Map();

  // Registry client if URL is provided
  const registryClient = registryUrl
    ? new RegistryClient({
        url: registryUrl,
        apiKey: registryApiKey,
      })
    : null;

  // Fetch servers from registry
  // In the fetchRegistryServers function
  const fetchRegistryServers = async (): Promise<ServerConfig[]> => {
    if (!registryClient) {
      return [];
    }

    try {
      const registryServers = await registryClient.getServers();

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

  // In the registerServer function
  const registerServer = async (serverConfig: ServerConfig): Promise<void> => {
    // Check if server with same URL already exists
    const existingUrlIndex = servers.findIndex(
      (s) => s.url === serverConfig.url
    );

    if (existingUrlIndex !== -1) {
      // A server with this URL already exists, update it
      const existingId = servers[existingUrlIndex].id;
      console.log(
        `Updating server with URL ${serverConfig.url} (existing ID: ${existingId}, new ID: ${serverConfig.id})`
      );

      // Clean up old client connection if IDs differ
      if (existingId !== serverConfig.id && connectedClients.has(existingId)) {
        const oldClient = connectedClients.get(existingId);
        try {
          await oldClient?.close();
        } catch (error) {
          console.error(
            `Error closing old client connection for ${existingId}:`,
            error
          );
        }
        connectedClients.delete(existingId);

        // Remove tools from the old server
        toolRegistry.removeToolsByServerId(existingId);
      }

      // Update the server entry
      servers[existingUrlIndex] = serverConfig;
    } else {
      // Check if ID already exists
      const existingIdIndex = servers.findIndex(
        (s) => s.id === serverConfig.id
      );
      if (existingIdIndex !== -1) {
        // Update existing server with same ID
        servers[existingIdIndex] = serverConfig;
      } else {
        // Add new server
        servers.push(serverConfig);
      }
    }

    try {
      // Create MCP client for this server using SSE transport
      const sseUrl = new URL(serverConfig.url);
      const transport = new SSEClientTransport(sseUrl);

      const client = new Client({
        name: "mcp-host",
        version: "1.0.0",
      });

      await client.connect(transport);

      // Fetch available tools from the server
      const toolsResult = await client.listTools();

      // Register tools in our registry
      if (toolsResult?.tools) {
        toolRegistry.registerTools(serverConfig.id, client, toolsResult.tools);
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
      // Remove the server from our list since we couldn't connect
      const index = servers.findIndex((s) => s.id === serverConfig.id);
      if (index !== -1) {
        servers.splice(index, 1);
      }
      throw error;
    }
  };

  // Discover all available tools for a session
  const discoverTools = async (sessionId: string): Promise<Tool[]> => {
    return toolRegistry.getAllTools();
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

    const { client, tool } = toolInfo;

    try {
      // Execute the tool via MCP
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw error;
    }
  };

  // Get all available server configurations
  const getAvailableServers = (): ServerConfig[] => {
    return [...servers];
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

  // Return the MCP manager interface
  return {
    discoverTools,
    executeToolCall,
    registerServer,
    fetchRegistryServers,
    getAvailableServers,
    cleanup,
  };
}
