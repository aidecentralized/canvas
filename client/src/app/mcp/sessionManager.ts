"use client"
// server/src/mcp/sessionManager.ts
import { v4 as uuidv4 } from "uuid";

interface Session {
  id: string;
  anthropicApiKey?: string;
  createdAt: Date;
  lastActive: Date;
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

    this.sessions.set(sessionId, {
      id: sessionId,
      createdAt: now,
      lastActive: now,
    });

    return sessionId;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);

    if (session) {
      // Update last active time
      session.lastActive = new Date();
      this.sessions.set(sessionId, session);
    }

    return session;
  }

  setAnthropicApiKey(sessionId: string, apiKey: string): void {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.anthropicApiKey = apiKey;
      session.lastActive = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  getAnthropicApiKey(sessionId: string): string | undefined {
    return this.sessions.get(sessionId)?.anthropicApiKey;
  }

  private cleanupSessions(): void {
    const now = new Date();
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      const inactiveTime = now.getTime() - session.lastActive.getTime();

      if (inactiveTime > SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
