import type {
  Tool,
  Resource,
  Prompt,
} from "@modelcontextprotocol/sdk/types.d.ts";
import { ServerConfig, ServerConnectionStatus } from "@/lib/mcp/connection";

export interface MCPContextType {
  servers: ServerConfig[];
  status: ServerConnectionStatus;
  tools: Record<string, Tool[]>;
  resources: Record<string, Resource[]>;
  prompts: Record<string, Prompt[]>;
  isLoading: boolean;
  error: string | null;
  connectServer: (serverId: string) => Promise<void>;
  disconnectServer: (serverId: string) => Promise<void>;
  toggleServerEnabled: (serverId: string, enabled: boolean) => Promise<void>;
  addServer: (server: ServerConfig) => Promise<void>;
  removeServer: (serverId: string) => Promise<void>;
  updateServer: (server: ServerConfig) => Promise<void>;
  callTool: (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<unknown>;
  loadResource: (
    serverId: string,
    resourceName: string,
    args?: Record<string, unknown>
  ) => Promise<unknown>;
  refreshTools: (serverId?: string) => Promise<void>;
  refreshResources: (serverId?: string) => Promise<void>;
  refreshPrompts: (serverId?: string) => Promise<void>;
  discoverServers: () => Promise<ServerConfig[]>;
}

export interface ServerSummary {
  id: string;
  name: string;
  description?: string;
  provider?: string;
  types?: string[];
  tags?: string[];
  verified?: boolean;
  uptime?: number;
  connected: boolean;
  toolCount: number;
  resourceCount: number;
  promptCount: number;
}

export interface ToolSuggestion {
  serverId: string;
  tool: Tool;
  relevanceScore: number;
  serverConnected: boolean;
}

export interface MCPLogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
}
