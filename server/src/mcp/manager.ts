// server/src/mcp/manager.ts
import { Server as SocketIoServer } from "socket.io";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js"; // Correct import path for Tool type
import { SessionManager } from "./sessionManager.js";
import { ToolRegistry } from "./toolRegistry.js"; // Needed for session.toolRegistry
import { RegistryClient } from "../registry/client.js"; // Import RegistryClient

// Define ServerConfig interface
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

export interface McpManager {
  registerServer: (sessionId: string, serverConfig: ServerConfig) => Promise<void>;
  unregisterServer: (sessionId: string, serverId: string) => Promise<void>;
  getAvailableServers: (sessionId: string) => ServerConfig[];
  discoverTools: (sessionId: string) => Promise<Tool[]>;
  executeToolCall: (
    sessionId: string,
    toolName: string,
    args: any
  ) => Promise<any>;
  fetchRegistryServers: () => Promise<ServerConfig[]>;
}

export function setupMcpManager(
  io: SocketIoServer,
  sessionManager: SessionManager, // Inject SessionManager
  registryUrl?: string, // Optional registry URL
  registryApiKey?: string
): McpManager {

  // Registry client if URL is provided
  const registryClient = registryUrl
    ? new RegistryClient({
        url: registryUrl,
        apiKey: registryApiKey,
      })
    : null;

  // Helper to get or create MCP client for a session/server
  const getOrCreateClient = async (sessionId: string, serverConfig: ServerConfig): Promise<Client | null> => {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        console.error(`[McpManager] Session ${sessionId} not found in getOrCreateClient.`);
        return null;
    }

    let client = session.connectedClients.get(serverConfig.id);
    if (client) { // Check if client exists in map
        console.log(`[McpManager] Reusing existing client for server ${serverConfig.id} in session ${sessionId}`);
        // Optional: Add a ping or status check here if the SDK supports it
        try {
            // Example: await client.ping(); // If a ping method exists
            // If the SDK requires an explicit check or action to verify connection, add it here.
            // If listTools itself serves as a connection check, this block might be simpler.
            return client;
        } catch (checkError) {
            console.warn(`[McpManager] Existing client for ${serverConfig.id} failed check. Reconnecting. Error:`, checkError);
            // Attempt to close the potentially defunct client before creating a new one
            client.close().catch(err => console.error(`[McpManager] Error closing defunct client for ${serverConfig.id}: ${err}`));
            sessionManager.removeSessionClient(sessionId, serverConfig.id); // Ensure removal
            // Proceed to create a new client below
        }
    }

    console.log(`[McpManager] Creating new client for server ${serverConfig.id} (${serverConfig.url}) in session ${sessionId}`);
    try {
        client = new Client({ url: serverConfig.url }); // Assuming default transport or configure SSE if needed

        // Event listeners removed - error handling should be done around specific operations (listTools, callTool)

        // Explicit connect call removed - assuming implicit connection on first RPC or handled by SDK constructor

        // Add client to session *before* attempting discovery
        sessionManager.addSessionClient(sessionId, serverConfig.id, client);

        // Discover tools immediately (acts as connection test)
        try {
            const listToolsResult = await client.listTools();
            const tools: Tool[] = (listToolsResult && Array.isArray((listToolsResult as any).tools))
                ? (listToolsResult as any).tools
                : [];

            console.log(`[McpManager] Discovered ${tools.length} tools from ${serverConfig.id} for session ${sessionId}`);

            if (tools.length > 0) {
                session.toolRegistry.registerTools(serverConfig.id, client, tools);
            } else {
                 console.warn(`[McpManager] No tools found or unexpected format from listTools for ${serverConfig.id}`);
            }
        } catch (discoveryError) {
            console.error(`[McpManager] Error discovering tools from ${serverConfig.id} for session ${sessionId}:`, discoveryError);
            // If discovery fails, the connection likely failed. Close and remove the client.
            client.close().catch(err => console.error(`[McpManager] Error closing client after discovery failure for ${serverConfig.id}: ${err}`));
            sessionManager.removeSessionClient(sessionId, serverConfig.id); // Ensure removal on discovery failure
            return null; // Indicate failure to create/connect/discover
        }

        return client;
    } catch (error) {
        console.error(`[McpManager] Failed to create client for server ${serverConfig.id} in session ${sessionId}:`, error);
        // Ensure removal if client creation itself failed (e.g., invalid URL format in SDK constructor)
        sessionManager.removeSessionClient(sessionId, serverConfig.id);
        return null;
    }
  };

  const registerServer = async (sessionId: string, serverConfig: ServerConfig): Promise<void> => {
    console.log(`[McpManager] Registering server ${serverConfig.id} for session ${sessionId}`);
    const added = sessionManager.addSessionServer(sessionId, serverConfig);
    if (!added) {
        throw new Error(`Session ${sessionId} not found.`);
    }
    // Attempt to connect and discover tools
    await getOrCreateClient(sessionId, serverConfig);
  };

  const unregisterServer = async (sessionId: string, serverId: string): Promise<void> => {
    console.log(`[McpManager] Unregistering server ${serverId} for session ${sessionId}`);
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        console.warn(`[McpManager] Session ${sessionId} not found during unregisterServer.`);
        return; // Or throw? Consistent with registerServer, maybe throw.
    }

    // Close and remove client connection
    const client = session.connectedClients.get(serverId);
    if (client) {
        // Attempt to close, but don't wait indefinitely. Handle potential errors.
        client.close().catch(err => console.error(`[McpManager] Error closing client during unregister for ${serverId} in session ${sessionId}: ${err}`));
        // Remove client from session manager immediately after initiating close
        sessionManager.removeSessionClient(sessionId, serverId);
    } else {
        // Ensure removal from map even if client wasn't found (e.g., connection failed initially)
        sessionManager.removeSessionClient(sessionId, serverId);
    }


    // Remove server config from session list
    sessionManager.removeSessionServer(sessionId, serverId);

    // Remove tools associated with this server from the session's registry
    session.toolRegistry.removeToolsByServerId(serverId); // Corrected method name
    console.log(`[McpManager] Server ${serverId} and its tools removed for session ${sessionId}`);
  };

  const getAvailableServers = (sessionId: string): ServerConfig[] => {
    return sessionManager.getSessionServers(sessionId);
  };

  const discoverTools = async (sessionId: string): Promise<Tool[]> => {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        console.error(`[McpManager] Session ${sessionId} not found during discoverTools.`);
        return [];
    }
    console.log(`[McpManager] Discovering tools for session ${sessionId}`);

    // Optional: Could add logic here to re-discover tools from connected clients if needed.
    // For now, rely on discovery during connection via getOrCreateClient.

    // Return all tools currently registered for the session
    return session.toolRegistry.getAllTools(); // Use session's toolRegistry
  };

  const executeToolCall = async (
    sessionId: string,
    toolName: string,
    args: any
  ): Promise<any> => {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        throw new Error(`Session ${sessionId} not found.`);
    }
    console.log(`[McpManager] Executing tool '${toolName}' for session ${sessionId}`);

    // Find tool in the SESSION-SPECIFIC registry
    const toolInfo = session.toolRegistry.getToolInfo(toolName); // Use session's toolRegistry
    if (!toolInfo) {
      throw new Error(`Tool '${toolName}' not found in registry for session ${sessionId}`);
    }

    const { serverId } = toolInfo;
    // Get the session-specific client connection
    let client = session.connectedClients.get(serverId);

    // If client is missing, attempt to reconnect
    if (!client) { // Check only if client exists in map
      const serverConfig = session.servers.find(s => s.id === serverId);
      if (serverConfig) {
          console.warn(`[McpManager] Client for ${serverId} not found. Attempting reconnect for session ${sessionId}...`);
          client = await getOrCreateClient(sessionId, serverConfig); // Re-assign client
          if (!client) {
              throw new Error(`Failed to reconnect to server ${serverId} for tool '${toolName}' in session ${sessionId}`);
          }
      } else {
          // This case should ideally not happen if toolInfo was found, but handle defensively
          throw new Error(`Server config for server ${serverId} not found for tool '${toolName}' in session ${sessionId}, despite tool being registered.`);
      }
    }

    try {
      // Execute the tool via MCP using the session-specific client
      console.log(`[McpManager] Executing tool ${toolName} via server ${serverId} for session ${sessionId}`);
      // Use callTool with a single object argument containing name and arguments
      const result = await client.callTool({ name: toolName, arguments: args }); // Pass object { name, arguments }
      return result;
    } catch (error) {
      console.error(`[McpManager] Error executing tool ${toolName} for session ${sessionId}:`, error);
      throw error; // Re-throw the execution error
    }
  };

  // Fetch servers from registry (Does NOT register them)
  const fetchRegistryServers = async (): Promise<ServerConfig[]> => {
    if (!registryClient) {
      console.log("[McpManager] Registry client not configured. Cannot fetch registry servers.");
      return [];
    }
    try {
      console.log("[McpManager] Fetching servers from central registry...");
      const servers = await registryClient.getServers();
      console.log(`[McpManager] Fetched ${servers.length} servers from registry.`);
      // Map registry format to ServerConfig, ensuring required fields are present
      return servers.map(s => ({
          id: s.id, // Assuming registry provides a unique ID
          name: s.name || s.id, // Fallback name if needed
          url: s.url, // Assuming registry provides the correct SSE URL
          description: s.description,
          tags: s.tags,
          verified: s.verified,
          rating: s.rating,
          types: s.types,
          // Add other fields if needed
      })).filter(s => s.url); // Ensure URL is present
    } catch (error) {
      console.error("[McpManager] Error fetching servers from registry:", error);
      return []; // Return empty on error
    }
  };

  // Return the MCP manager interface
  return {
    registerServer,
    unregisterServer,
    getAvailableServers,
    discoverTools,
    executeToolCall,
    fetchRegistryServers,
  };
}
