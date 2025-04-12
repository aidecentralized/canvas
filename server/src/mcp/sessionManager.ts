// server/src/mcp/sessionManager.ts
import { v4 as uuidv4 } from "uuid";
import { ServerConfig } from "./manager.js"; // Assuming ServerConfig is here
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ToolRegistry } from "./toolRegistry.js"; // Import ToolRegistry

interface Session {
  id: string;
  anthropicApiKey?: string;
  createdAt: Date;
  lastActive: Date;
  servers: ServerConfig[];
  connectedClients: Map<string, Client>; // Map<serverId, Client>
  toolRegistry: ToolRegistry; // Added: Session-specific tool registry
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  // Session cleanup interval in milliseconds (1 hour)
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000;

  constructor() {
    // Set up session cleanup
    setInterval(() => this.cleanupSessions(), this.CLEANUP_INTERVAL);
  }

  createSession(): string {
    const sessionId = uuidv4();
    const now = new Date();
    console.log(`[SessionManager] Creating new session with ID: ${sessionId}`); // Added log

    this.sessions.set(sessionId, {
      id: sessionId,
      createdAt: now,
      lastActive: now,
      servers: [],
      connectedClients: new Map(),
      toolRegistry: new ToolRegistry(), // Initialize session-specific registry
    });
    console.log(`[SessionManager] Session ${sessionId} created and stored. Total sessions: ${this.sessions.size}`); // Added log
    return sessionId;
  }

  getSession(sessionId: string): Session | undefined {
    console.log(`[SessionManager] Attempting to get session with ID: ${sessionId}`); // Modified log
    const session = this.sessions.get(sessionId);

    if (session) {
      console.log(`[SessionManager] Session ${sessionId} FOUND. Updating lastActive.`); // Modified log
      // Update last active time
      session.lastActive = new Date();
      // No need to set again, map holds the reference
      // this.sessions.set(sessionId, session);
    } else {
      console.warn(`[SessionManager] Session ${sessionId} NOT FOUND.`); // Modified log
    }

    return session;
  }

  setAnthropicApiKey(sessionId: string, apiKey: string): boolean {
    console.log(`[SessionManager] Attempting to set API key for session: ${sessionId}`); // Added log
    const session = this.sessions.get(sessionId); // Use getSession to update lastActive implicitly if needed, though maybe not desired here. Let's stick to direct get.
    // const session = this.getSession(sessionId); // Alternative: updates lastActive

    if (session) {
      session.anthropicApiKey = apiKey;
      session.lastActive = new Date(); // Explicitly update lastActive on modification
      // No need to set again, map holds the reference
      // this.sessions.set(sessionId, session);
      console.log(`[SessionManager] API key SET successfully for session: ${sessionId}. Key ends with: ...${apiKey.slice(-4)}`); // Added log with partial key
      return true;
    } else {
      console.warn(`[SessionManager] Failed to set API key: Session ${sessionId} NOT FOUND.`); // Added log
      return false;
    }
  }

  getAnthropicApiKey(sessionId: string): string | undefined {
    console.log(`[SessionManager] Attempting to get API key for session: ${sessionId}`); // Added log
    const session = this.sessions.get(sessionId); // Don't update lastActive just for getting key
    const apiKey = session?.anthropicApiKey;
    if (apiKey) {
        console.log(`[SessionManager] API key FOUND for session ${sessionId}. Key ends with: ...${apiKey.slice(-4)}`); // Added log
    } else {
        console.warn(`[SessionManager] API key NOT FOUND for session ${sessionId}.`); // Added log
    }
    return apiKey;
  }

  // --- Server Management per Session ---

  getSessionServers(sessionId: string): ServerConfig[] {
    console.log(`[SessionManager] Getting servers for session: ${sessionId}`); // Added log
    return this.sessions.get(sessionId)?.servers || [];
  }

  addSessionServer(sessionId: string, serverConfig: ServerConfig): boolean {
    console.log(`[SessionManager] Attempting to add/update server ${serverConfig.id} for session: ${sessionId}`); // Added log
    const session = this.sessions.get(sessionId);
    if (!session) {
        console.warn(`[SessionManager] Failed to add server: Session ${sessionId} NOT FOUND.`); // Added log
        return false;
    }

    const existingIndex = session.servers.findIndex(
      (s) => s.id === serverConfig.id || s.url === serverConfig.url
    );
    if (existingIndex !== -1) {
      // Update existing server
      session.servers[existingIndex] = serverConfig;
      console.log(`[SessionManager] Updated server ${serverConfig.id} for session ${sessionId}`); // Modified log
    } else {
      // Add new server
      session.servers.push(serverConfig);
      console.log(`[SessionManager] Added server ${serverConfig.id} to session ${sessionId}`); // Modified log
    }
    session.lastActive = new Date();
    return true;
  }

  removeSessionServer(sessionId: string, serverId: string): boolean {
    console.log(`[SessionManager] Attempting to remove server ${serverId} from session: ${sessionId}`); // Added log
    const session = this.sessions.get(sessionId);
    if (!session) {
        console.warn(`[SessionManager] Failed to remove server: Session ${sessionId} NOT FOUND.`); // Added log
        return false;
    }

    const serverIndex = session.servers.findIndex((s) => s.id === serverId);
    if (serverIndex !== -1) {
      const removed = session.servers.splice(serverIndex, 1);
      console.log(`[SessionManager] Removed server ${removed[0].id} from session ${sessionId}`); // Modified log
      session.lastActive = new Date();
      return true;
    }
    console.warn(`[SessionManager] Server ${serverId} not found in session ${sessionId} during removal attempt.`); // Added log
    return false;
  }

  // --- Client Connection Management per Session ---

  getSessionClient(sessionId: string, serverId: string): Client | undefined {
    console.log(`[SessionManager] Getting client for server ${serverId} in session: ${sessionId}`); // Added log
    return this.sessions.get(sessionId)?.connectedClients.get(serverId);
  }

  addSessionClient(
    sessionId: string,
    serverId: string,
    client: Client
  ): boolean {
    console.log(`[SessionManager] Attempting to add client for server ${serverId} to session: ${sessionId}`); // Added log
    const session = this.sessions.get(sessionId);
    if (!session) {
        console.warn(`[SessionManager] Failed to add client: Session ${sessionId} NOT FOUND.`); // Added log
        return false;
    }

    // Close existing client for this serverId if any
    const existingClient = session.connectedClients.get(serverId);
    if (existingClient) {
        existingClient.close().catch(err => console.error(`[SessionManager] Error closing existing client for ${serverId} in session ${sessionId}:`, err));
    }

    session.connectedClients.set(serverId, client);
    console.log(`[SessionManager] Added client for server ${serverId} to session ${sessionId}`); // Modified log
    session.lastActive = new Date();
    return true;
  }

  removeSessionClient(sessionId: string, serverId: string): boolean {
    console.log(`[SessionManager] Attempting to remove client for server ${serverId} from session ${sessionId}`); // Added log
    const session = this.sessions.get(sessionId);
    if (!session) {
        console.warn(`[SessionManager] Failed to remove client: Session ${sessionId} NOT FOUND.`); // Added log
        return false;
    }

    const client = session.connectedClients.get(serverId);
    if (client) {
      // Attempt to close connection before removing
      client.close().catch(err => console.error(`[SessionManager] Error closing client for ${serverId} in session ${sessionId} during removal:`, err)); // Modified log
      session.connectedClients.delete(serverId);
      console.log(`[SessionManager] Removed client for server ${serverId} from session ${sessionId}`); // Modified log
      session.lastActive = new Date();
      return true;
    }
    console.warn(`[SessionManager] Client for server ${serverId} not found in session ${sessionId} during removal attempt.`); // Added log
    return false;
  }

  getAllSessionClients(sessionId: string): Map<string, Client> {
    return this.sessions.get(sessionId)?.connectedClients || new Map();
  }

  // --- Tool Registry Management per Session ---

  getSessionToolRegistry(sessionId: string): ToolRegistry | undefined {
    return this.sessions.get(sessionId)?.toolRegistry;
  }

  // --- Cleanup ---

  private async cleanupSessions(): Promise<void> {
    const now = new Date();
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    console.log(`Running session cleanup. Current sessions: ${this.sessions.size}`);

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActive.getTime();

      if (inactiveTime > SESSION_TIMEOUT) {
        console.log(`Cleaning up expired session: ${sessionId}`);
        // Close all client connections for the expired session
        for (const [serverId, client] of session.connectedClients.entries()) {
          try {
            await client.close();
            console.log(`Closed client for server ${serverId} in expired session ${sessionId}`);
          } catch (error) {
            console.error(`Error closing client for server ${serverId} in expired session ${sessionId}:`, error);
          }
        }
        // Remove the session
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
        console.log(`Session cleanup finished. Removed ${cleanedCount} expired sessions.`);
    }
  }

  // Graceful shutdown cleanup
  async cleanupAllSessions(): Promise<void> {
    console.log(`Cleaning up all sessions (${this.sessions.size})...`);
    for (const [sessionId, session] of this.sessions.entries()) {
        for (const [serverId, client] of session.connectedClients.entries()) {
            try {
                await client.close();
                console.log(`Closed client for server ${serverId} in session ${sessionId} during shutdown.`);
            } catch (error) {
                console.error(`Error closing client for server ${serverId} in session ${sessionId} during shutdown:`, error);
            }
        }
    }
    this.sessions.clear();
    console.log("All sessions cleared.");
  }
}
