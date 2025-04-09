// server/src/mcp/manager.ts
import { Server as SocketIoServer } from "socket.io";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolRegistry } from "./toolRegistry.js";
import { SessionManager } from "./sessionManager.js";
import { ToolInfo, ToolCredentialInfo } from "../../shared/types.js";

export interface McpManager {
  discoverTools: (sessionId: string) => Promise<ToolInfo[]>;
  executeToolCall: (
    sessionId: string,
    toolName: string,
    args: any
  ) => Promise<any>;
  registerServer: (serverConfig: ServerConfig) => Promise<void>;
  getAvailableServers: () => ServerConfig[];
  getToolsWithCredentialRequirements: (sessionId: string) => ToolCredentialInfo[];
  setToolCredentials: (
    sessionId: string, 
    toolName: string, 
    serverId: string, 
    credentials: Record<string, string>
  ) => Promise<boolean>;
  cleanup: () => Promise<void>;
}

export interface ServerConfig {
  id: string;
  name: string;
  url: string;
}

export function setupMcpManager(io: SocketIoServer): McpManager {
  // Registry to keep track of available MCP tools
  const toolRegistry = new ToolRegistry();

  // Session manager to handle client sessions
  const sessionManager = new SessionManager();

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
      // Remove the server from our list since we couldn't connect
      const index = servers.findIndex((s) => s.id === serverConfig.id);
      if (index !== -1) {
        servers.splice(index, 1);
      }
    }
  };

  // Discover all available tools for a session
  const discoverTools = async (sessionId: string): Promise<ToolInfo[]> => {
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

    const { client, tool, serverId } = toolInfo;

    try {
      // Get credentials for this tool if required
      const credentials = sessionManager.getToolCredentials(
        sessionId,
        toolName,
        serverId
      );

      // Add credentials to args if available
      const argsWithCredentials = credentials 
        ? { ...args, __credentials: credentials }
        : args;

      // Execute the tool via MCP
      const result = await client.callTool({
        name: toolName,
        arguments: argsWithCredentials,
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

  // Get tools that require credentials
  const getToolsWithCredentialRequirements = (sessionId: string): ToolCredentialInfo[] => {
    return toolRegistry.getToolsWithCredentialRequirements();
  };

  // Set credentials for a tool
  const setToolCredentials = async (
    sessionId: string,
    toolName: string,
    serverId: string,
    credentials: Record<string, string>
  ): Promise<boolean> => {
    try {
      sessionManager.setToolCredentials(
        sessionId,
        toolName,
        serverId,
        credentials
      );
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

  // Return the MCP manager interface
  return {
    discoverTools,
    executeToolCall,
    registerServer,
    getAvailableServers,
    getToolsWithCredentialRequirements,
    setToolCredentials,
    cleanup,
  };
}
