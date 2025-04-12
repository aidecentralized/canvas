// server/src/mcp/manager.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolRegistry } from "./toolRegistry";

export interface McpManager {
  discoverTools: () => Promise<Tool[]>;
  executeToolCall: (
    // sessionId: string,
    toolName: string,
    args: any
  ) => Promise<any>;
  registerServer: (serverConfig: ServerConfig) => Promise<void>;
  getAvailableServers: () => ServerConfig[];
  cleanup: () => Promise<void>;
}

export interface ServerConfig {
  id: string;
  name: string;
  url: string;
}

export function setupMcpManager(): McpManager {
  // Registry to keep track of available MCP tools
  const toolRegistry = new ToolRegistry();

  // Session manager to handle client sessions
  // const sessionManager = new SessionManager();

  // Available server configurations
  const servers: ServerConfig[] = [];

  // Cache of connected clients
  const connectedClients: Map<string, Client> = new Map();

  const registerServer = async (serverConfig: ServerConfig): Promise<void> => {
    servers.push(serverConfig);

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
        `Registered server ${serverConfig.name} with ${toolsResult?.tools?.length || 0
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
    }
  };

  // Discover all available tools for a session
  const discoverTools = async (): Promise<Tool[]> => {
    return toolRegistry.getAllTools();
  };

  // Execute a tool call
  const executeToolCall = async (
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
    for (const [serverId, client] of Array.from(connectedClients.entries())) {
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
    getAvailableServers,
    cleanup,
  };
}
