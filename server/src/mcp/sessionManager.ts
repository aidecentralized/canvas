// server/src/mcp/sessionManager.ts
import { v4 as uuidv4 } from "uuid";
import { ServerConfig } from "./manager.js"; // Assuming ServerConfig is here
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ToolRegistry } from "./toolRegistry.js"; // Import ToolRegistry

/**
 * Represents the state associated with a single user session.
 * This includes their API key, registered servers, active MCP client connections,
 * and the tools discovered from those servers.
 */
interface Session {
  /** Unique identifier for the session. */
  id: string;
  /** Anthropic API key provided by the user for this session. Stored server-side. */
  anthropicApiKey?: string;
  /** Timestamp when the session was created. */
  createdAt: Date;
  /** Timestamp of the last interaction with this session. Used for cleanup. */
  lastActive: Date;
  /** List of MCP server configurations registered by the user for this session. */
  servers: ServerConfig[];
  /** Map storing active MCP client connections for this session. Key: serverId, Value: MCP Client instance. */
  connectedClients: Map<string, Client>; // Map<serverId, Client>
  /** Session-specific registry holding tools discovered from connected servers. */
  toolRegistry: ToolRegistry; // Added: Session-specific tool registry
}

/**
 * Manages user sessions, storing session-specific data like API keys,
 * registered servers, and active MCP client connections.
 */
export class SessionManager {
  // ========================================================================
  // IMPORTANT: In-Memory Storage & Deployment Caveats
  // ========================================================================
  // This Map stores all active session data directly in the Node.js process memory.
  //
  // Limitations:
  // 1. Single Point of Failure: If this server instance crashes, all session data is lost.
  // 2. Scalability: Cannot scale horizontally (run multiple instances) without issues,
  //    unless specific measures are taken.
  //
  // Multi-Instance Deployment Issues (e.g., AWS EC2/Beanstalk without Docker/K8s):
  // - If deployed across multiple instances behind a load balancer WITHOUT session affinity
  //   (sticky sessions), requests from the same user might hit different instances.
  // - Each instance has its own independent `sessions` Map. An instance won't know about
  //   sessions created on other instances, leading to 401 errors (invalid session) or
  //   missing API keys/server registrations.
  //
  // Solutions for Multi-Instance Deployments:
  // 1. Sticky Sessions (Load Balancer Configuration):
  //    - Configure the Load Balancer (e.g., AWS ALB/ELB) to always route requests from
  //      a specific user (based on cookie or source IP) to the *same* backend instance.
  //    - Simpler to implement but less resilient if an instance fails (sessions on that
  //      instance are lost).
  // 2. External Shared Session Store (Recommended for Scalability/Resilience):
  //    - Refactor this class to use a distributed cache or database accessible by all instances.
  //    - Examples: Redis (AWS ElastiCache), Memcached, DynamoDB.
  //    - Session data (ID, API key, server list) would be stored/retrieved from the external store.
  //    - Caveat: Active `Client` objects (MCP connections) generally cannot be serialized and
  //      stored externally. Connection management logic would need to adapt:
  //      - Store `ServerConfig` in the external session.
  //      - When a session is loaded, check `connectedClients` map in the *current* instance.
  //      - If a client for a required server isn't present in the current instance's map,
  //        use the stored `ServerConfig` to establish a *new* connection within that instance
  //        (using `getOrCreateClient` logic).
  // ========================================================================
  private sessions: Map<string, Session> = new Map();

  // Session cleanup interval in milliseconds (e.g., 1 hour)
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000;
  // Session timeout duration in milliseconds (e.g., 24 hours of inactivity)
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

  constructor() {
    // Periodically run the cleanup routine to remove inactive sessions.
    setInterval(() => this.cleanupSessions(), this.CLEANUP_INTERVAL);
  }

  /**
   * Creates a new session with a unique ID and initializes its state.
   * @returns The newly generated session ID.
   */
  createSession(): string {
    const sessionId = uuidv4();
    const now = new Date();
    console.log(`[SessionManager] Creating new session with ID: ${sessionId}`);

    // Initialize the session object in the in-memory map.
    this.sessions.set(sessionId, {
      id: sessionId,
      createdAt: now,
      lastActive: now, // Initially set lastActive to creation time
      servers: [], // Start with no registered servers
      connectedClients: new Map(), // Start with no active client connections
      toolRegistry: new ToolRegistry(), // Create a dedicated tool registry for this session
    });
    console.log(`[SessionManager] Session ${sessionId} created and stored. Total sessions: ${this.sessions.size}`);
    return sessionId;
  }

  /**
   * Retrieves a session by its ID. Updates the session's lastActive timestamp if found.
   * @param sessionId The ID of the session to retrieve.
   * @returns The Session object if found, otherwise undefined.
   */
  getSession(sessionId: string): Session | undefined {
    console.log(`[SessionManager] Attempting to get session with ID: ${sessionId}`);
    const session = this.sessions.get(sessionId);

    if (session) {
      console.log(`[SessionManager] Session ${sessionId} FOUND. Updating lastActive.`);
      // Update last active time on successful retrieval (indicates user activity).
      session.lastActive = new Date();
    } else {
      console.warn(`[SessionManager] Session ${sessionId} NOT FOUND.`);
    }

    return session;
  }

  /**
   * Associates an Anthropic API key with a specific session.
   * @param sessionId The ID of the session.
   * @param apiKey The Anthropic API key to store.
   * @returns True if the key was successfully set, false if the session was not found.
   */
  setAnthropicApiKey(sessionId: string, apiKey: string): boolean {
    console.log(`[SessionManager] Attempting to set API key for session: ${sessionId}`);
    // Retrieve session without necessarily updating lastActive just for setting the key.
    const session = this.sessions.get(sessionId);

    if (session) {
      // Store the API key within the session object.
      session.anthropicApiKey = apiKey;
      // Explicitly update lastActive time as this is a user modification action.
      session.lastActive = new Date();
      console.log(`[SessionManager] API key SET successfully for session: ${sessionId}. Key ends with: ...${apiKey.slice(-4)}`);
      return true;
    } else {
      console.warn(`[SessionManager] Failed to set API key: Session ${sessionId} NOT FOUND.`);
      return false;
    }
  }

  /**
   * Retrieves the Anthropic API key associated with a specific session.
   * Does not update the session's lastActive timestamp (read-only operation).
   * @param sessionId The ID of the session.
   * @returns The API key if found, otherwise undefined.
   */
  getAnthropicApiKey(sessionId: string): string | undefined {
    console.log(`[SessionManager] Attempting to get API key for session: ${sessionId}`);
    // Retrieve session data without marking it as active (read-only operation).
    const session = this.sessions.get(sessionId);
    const apiKey = session?.anthropicApiKey;
    if (apiKey) {
        console.log(`[SessionManager] API key FOUND for session ${sessionId}. Key ends with: ...${apiKey.slice(-4)}`);
    } else {
        console.warn(`[SessionManager] API key NOT FOUND for session ${sessionId}.`);
    }
    return apiKey;
  }

  // --- Server Management per Session ---

  /**
   * Gets the list of registered server configurations for a specific session.
   * @param sessionId The ID of the session.
   * @returns An array of ServerConfig objects, or an empty array if the session is not found.
   */
  getSessionServers(sessionId: string): ServerConfig[] {
    console.log(`[SessionManager] Getting servers for session: ${sessionId}`);
    return this.sessions.get(sessionId)?.servers || [];
  }

  /**
   * Adds or updates a server configuration within a specific session.
   * If a server with the same ID or URL already exists, it's updated. Otherwise, it's added.
   * @param sessionId The ID of the session.
   * @param serverConfig The server configuration to add or update.
   * @returns True if the server was added/updated, false if the session was not found.
   */
  addSessionServer(sessionId: string, serverConfig: ServerConfig): boolean {
    console.log(`[SessionManager] Attempting to add/update server ${serverConfig.id} for session: ${sessionId}`);
    const session = this.sessions.get(sessionId);
    if (!session) {
        console.warn(`[SessionManager] Failed to add server: Session ${sessionId} NOT FOUND.`);
        return false;
    }

    // Check if a server with the same ID or URL already exists in this session.
    const existingIndex = session.servers.findIndex(
      (s) => s.id === serverConfig.id || s.url === serverConfig.url
    );
    if (existingIndex !== -1) {
      // Update existing server configuration.
      session.servers[existingIndex] = serverConfig;
      console.log(`[SessionManager] Updated server ${serverConfig.id} for session ${sessionId}`);
    } else {
      // Add new server configuration to the session's list.
      session.servers.push(serverConfig);
      console.log(`[SessionManager] Added server ${serverConfig.id} to session ${sessionId}`);
    }
    // Update lastActive time as this is a user modification.
    session.lastActive = new Date();
    return true;
  }

  /**
   * Removes a server configuration from a specific session by its ID.
   * Note: This only removes the configuration. Associated client connections and tools
   * should be handled separately by the caller (e.g., in McpManager.unregisterServer).
   * @param sessionId The ID of the session.
   * @param serverId The ID of the server configuration to remove.
   * @returns True if the server was removed, false if the session or server was not found.
   */
  removeSessionServer(sessionId: string, serverId: string): boolean {
    console.log(`[SessionManager] Attempting to remove server ${serverId} from session: ${sessionId}`);
    const session = this.sessions.get(sessionId);
    if (!session) {
        console.warn(`[SessionManager] Failed to remove server: Session ${sessionId} NOT FOUND.`);
        return false;
    }

    const serverIndex = session.servers.findIndex((s) => s.id === serverId);
    if (serverIndex !== -1) {
      const removed = session.servers.splice(serverIndex, 1);
      console.log(`[SessionManager] Removed server config ${removed[0].id} from session ${sessionId}`);
      session.lastActive = new Date();
      return true;
    }
    console.warn(`[SessionManager] Server config ${serverId} not found in session ${sessionId} during removal attempt.`);
    return false;
  }

  // --- Client Connection Management per Session ---

  /**
   * Retrieves an active MCP client connection for a specific server within a session.
   * @param sessionId The ID of the session.
   * @param serverId The ID of the server.
   * @returns The MCP Client instance if connected, otherwise undefined.
   */
  getSessionClient(sessionId: string, serverId: string): Client | undefined {
    console.log(`[SessionManager] Getting client for server ${serverId} in session: ${sessionId}`);
    // Retrieve the client instance from the session's map.
    return this.sessions.get(sessionId)?.connectedClients.get(serverId);
  }

  /**
   * Adds or replaces an active MCP client connection for a specific server within a session.
   * If a client for the same serverId already exists, it attempts to close the old one first.
   * @param sessionId The ID of the session.
   * @param serverId The ID of the server the client is connected to.
   * @param client The active MCP Client instance.
   * @returns True if the client was added, false if the session was not found.
   */
  addSessionClient(
    sessionId: string,
    serverId: string,
    client: Client
  ): boolean {
    console.log(`[SessionManager] Attempting to add client for server ${serverId} to session: ${sessionId}`);
    const session = this.sessions.get(sessionId);
    if (!session) {
        console.warn(`[SessionManager] Failed to add client: Session ${sessionId} NOT FOUND.`);
        return false;
    }

    // Ensure any previous connection for this server in this session is closed.
    const existingClient = session.connectedClients.get(serverId);
    if (existingClient) {
        console.warn(`[SessionManager] Closing existing client for ${serverId} before adding new one in session ${sessionId}.`);
        existingClient.close().catch(err => console.error(`[SessionManager] Error closing existing client for ${serverId} in session ${sessionId}:`, err));
    }

    // Store the new client instance in the session's map.
    session.connectedClients.set(serverId, client);
    console.log(`[SessionManager] Added client for server ${serverId} to session ${sessionId}`);
    session.lastActive = new Date(); // Update lastActive as adding/connecting is an activity
    return true;
  }

  /**
   * Removes an active MCP client connection for a specific server from a session.
   * Attempts to gracefully close the client connection before removing it.
   * @param sessionId The ID of the session.
   * @param serverId The ID of the server whose client connection should be removed.
   * @returns True if the client was found and removed, false otherwise.
   */
  removeSessionClient(sessionId: string, serverId: string): boolean {
    console.log(`[SessionManager] Attempting to remove client for server ${serverId} from session ${sessionId}`);
    const session = this.sessions.get(sessionId);
    if (!session) {
        console.warn(`[SessionManager] Failed to remove client: Session ${sessionId} NOT FOUND.`);
        return false;
    }

    const client = session.connectedClients.get(serverId);
    if (client) {
      // Attempt to close the connection gracefully.
      console.log(`[SessionManager] Closing client for server ${serverId} in session ${sessionId} during removal.`);
      client.close().catch(err => console.error(`[SessionManager] Error closing client for ${serverId} in session ${sessionId} during removal:`, err));
      // Remove the client from the session's map.
      session.connectedClients.delete(serverId);
      console.log(`[SessionManager] Removed client for server ${serverId} from session ${sessionId}`);
      session.lastActive = new Date(); // Update lastActive as this is a user-driven action (via unregister)
      return true;
    }
    console.warn(`[SessionManager] Client for server ${serverId} not found in session ${sessionId} during removal attempt.`);
    return false;
  }

  /**
   * Retrieves the map of all active client connections for a session.
   * @param sessionId The ID of the session.
   * @returns A Map where keys are server IDs and values are Client instances, or an empty Map if the session is not found.
   */
  getAllSessionClients(sessionId: string): Map<string, Client> {
    return this.sessions.get(sessionId)?.connectedClients || new Map();
  }

  // --- Tool Registry Management per Session ---

  /**
   * Retrieves the session-specific tool registry.
   * @param sessionId The ID of the session.
   * @returns The ToolRegistry instance for the session, or undefined if the session is not found.
   */
  getSessionToolRegistry(sessionId: string): ToolRegistry | undefined {
    return this.sessions.get(sessionId)?.toolRegistry;
  }

  // --- Cleanup ---

  /**
   * Periodically called routine to remove expired sessions based on inactivity.
   * Iterates through all sessions and removes those whose `lastActive` timestamp
   * exceeds the `SESSION_TIMEOUT`. Also attempts to close associated MCP client connections.
   */
  private async cleanupSessions(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    console.log(`[SessionManager] Running periodic session cleanup. Current sessions: ${this.sessions.size}`);

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActive.getTime();

      // Check if the session has been inactive for longer than the timeout period.
      if (inactiveTime > this.SESSION_TIMEOUT) {
        console.log(`[SessionManager] Cleaning up expired session: ${sessionId} (Inactive for ${Math.round(inactiveTime / 1000 / 60)} minutes)`);
        // Close all associated MCP client connections for the expired session.
        for (const [serverId, client] of session.connectedClients.entries()) {
          try {
            await client.close();
            console.log(`[SessionManager] Closed client for server ${serverId} in expired session ${sessionId}`);
          } catch (error) {
            console.error(`[SessionManager] Error closing client for server ${serverId} in expired session ${sessionId}:`, error);
          }
        }
        // Remove the session from the in-memory map.
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
        console.log(`[SessionManager] Session cleanup finished. Removed ${cleanedCount} expired sessions. Remaining sessions: ${this.sessions.size}`);
    } else {
        console.log(`[SessionManager] Session cleanup finished. No sessions expired.`);
    }
  }

  /**
   * Graceful shutdown cleanup. Closes all active MCP client connections across all sessions.
   * Intended to be called when the server process is terminating (e.g., on SIGTERM).
   */
  async cleanupAllSessions(): Promise<void> {
    console.log(`[SessionManager] Cleaning up all sessions (${this.sessions.size}) during shutdown...`);
    for (const [sessionId, session] of this.sessions.entries()) {
        console.log(`[SessionManager] Cleaning up connections for session ${sessionId}...`);
        for (const [serverId, client] of session.connectedClients.entries()) {
            try {
                await client.close();
                console.log(`Closed client for server ${serverId} in session ${sessionId} during shutdown.`);
            } catch (error) {
                console.error(`Error closing client for server ${serverId} in session ${sessionId} during shutdown:`, error);
            }
        }
    }
    // Clear the entire sessions map.
    this.sessions.clear();
    console.log("[SessionManager] All sessions cleared.");
  }
}
