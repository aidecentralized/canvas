// server/src/mcp/types.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export interface ToolInfo {
  serverId: string;
  serverName: string;
  client: Client;
  tool: Tool;
  credentialRequirements?: CredentialRequirement[];
  inputSchema?: any;
  description?: string;
  name?: string;
  rating?: number;
}

export interface CredentialRequirement {
  id: string;
  name: string;
  description?: string;
  acquisition?: {
    url?: string;
    instructions?: string;
  };
}

export interface ToolCredentialInfo {
  toolName: string;
  serverName: string;
  serverId: string;
  credentials: CredentialRequirement[];
}

// Resource interfaces based on MCP specification
export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  result?: {
    content: any[];
    isError?: boolean;
  };
}

export interface ToolResult {
  content: any[];
  isError?: boolean;
  serverInfo?: {
    id: string;
    name: string;
  };
}

export interface McpManager {
  discoverTools: (sessionId: string) => Promise<ToolInfo[]>;
  executeToolCall: (
    sessionId: string,
    toolName: string,
    args: any
  ) => Promise<any>;
  registerServer: (serverConfig: ServerConfig) => Promise<boolean>;
  getAvailableServers: () => ServerConfig[];
  getToolsWithCredentialRequirements: (sessionId: string) => ToolCredentialInfo[];
  setToolCredentials: (
    sessionId: string, 
    toolName: string, 
    serverId: string, 
    credentials: Record<string, string>
  ) => Promise<boolean>;
  // Resource-related methods
  listResources: (sessionId: string, serverId?: string) => Promise<Resource[]>;
  listResourceTemplates: (sessionId: string, serverId?: string) => Promise<ResourceTemplate[]>;
  readResource: (sessionId: string, uri: string) => Promise<ResourceContent[]>;
  subscribeToResource: (sessionId: string, uri: string) => Promise<boolean>;
  unsubscribeFromResource: (sessionId: string, uri: string) => Promise<boolean>;
  cleanup: () => Promise<void>;
  getSessionManager: () => any;
  fetchRegistryServers: () => Promise<ServerConfig[]>;
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