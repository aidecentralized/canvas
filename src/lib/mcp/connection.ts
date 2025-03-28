import { SimpleEventEmitter as EventEmitter } from "./eventEmitter.ts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const isBrowser = typeof window !== "undefined";
export type TransportType = "stdio" | "sse";

export interface ServerConfig {
  id: string;
  name: string;
  description?: string;
  transport: {
    type: TransportType;
    config: StdioTransportConfig | SSETransportConfig;
  };
  enabled: boolean;
}

export interface StdioTransportConfig {
  command: string;
  args: string[];
}

export interface SSETransportConfig {
  url: string;
  messageEndpoint?: string;
  headers?: Record<string, string>;
}

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
}

export type ServerConnectionStatus = Record<string, ConnectionStatus>;

export class MCPConnectionManager extends EventEmitter {
  private clients: Map<string, Client> = new Map();
  private configs: Map<string, ServerConfig> = new Map();
  private status: ServerConnectionStatus = {};
  private initialized = false;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  public async initialize(configs: ServerConfig[]): Promise<void> {
    if (this.initialized) {
      await this.disconnect();
    }

    this.configs.clear();
    this.clients.clear();
    this.status = {};

    // Register all server configs
    for (const config of configs) {
      this.configs.set(config.id, config);
      this.status[config.id] = { connected: false };

      // Connect to enabled servers
      if (config.enabled) {
        try {
          await this.connect(config.id);
        } catch (error) {
          console.error(`Failed to connect to server ${config.id}:`, error);
          this.status[config.id] = {
            connected: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }

    this.initialized = true;
    this.emit("statusChanged", { ...this.status });
  }

  public async connect(serverId: string): Promise<void> {
    if (this.clients.has(serverId)) {
      return; // Already connected
    }

    const config = this.configs.get(serverId);
    if (!config) {
      throw new Error(`Server configuration not found for ID: ${serverId}`);
    }

    try {
      const client = await this.createClient(config);
      this.clients.set(serverId, client);
      this.status[serverId] = { connected: true };
      this.emit("statusChanged", { ...this.status });
      this.emit("serverConnected", serverId);
    } catch (error) {
      this.status[serverId] = {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      };
      this.emit("statusChanged", { ...this.status });
      throw error;
    }
  }

  public async disconnect(serverId?: string): Promise<void> {
    if (serverId) {
      // Disconnect a specific server
      const client = this.clients.get(serverId);
      if (client) {
        try {
          await client.close();
        } catch (error) {
          console.error(`Error disconnecting client ${serverId}:`, error);
        }
        this.clients.delete(serverId);
        this.status[serverId] = { connected: false };
      }
    } else {
      // Disconnect all servers
      for (const [id, client] of this.clients.entries()) {
        try {
          await client.close();
        } catch (error) {
          console.error(`Error disconnecting client ${id}:`, error);
        }
      }
      this.clients.clear();
      for (const id in this.status) {
        this.status[id] = { connected: false };
      }
    }

    this.emit("statusChanged", { ...this.status });
  }

  public async getTools(serverId?: string): Promise<Record<string, any>> {
    if (serverId) {
      const client = this.clients.get(serverId);
      if (!client) {
        throw new Error(`No connected client for server ID: ${serverId}`);
      }

      try {
        const tools = await client.listTools();
        return { [serverId]: tools };
      } catch (error) {
        console.error(`Failed to get tools from server ${serverId}:`, error);
        return { [serverId]: [] };
      }
    } else {
      // Get tools from all connected servers
      const result: Record<string, any> = {};

      for (const [id, client] of this.clients.entries()) {
        try {
          const tools = await client.listTools();
          result[id] = tools;
        } catch (error) {
          console.error(`Failed to get tools from server ${id}:`, error);
          result[id] = [];
        }
      }

      return result;
    }
  }

  public async getResources(serverId?: string): Promise<Record<string, any>> {
    if (serverId) {
      const client = this.clients.get(serverId);
      if (!client) {
        throw new Error(`No connected client for server ID: ${serverId}`);
      }

      try {
        const resources = await client.listResources();
        return { [serverId]: resources };
      } catch (error) {
        console.error(
          `Failed to get resources from server ${serverId}:`,
          error
        );
        return { [serverId]: [] };
      }
    } else {
      // Get resources from all connected servers
      const result: Record<string, any> = {};

      for (const [id, client] of this.clients.entries()) {
        try {
          const resources = await client.listResources();
          result[id] = resources;
        } catch (error) {
          console.error(`Failed to get resources from server ${id}:`, error);
          result[id] = [];
        }
      }

      return result;
    }
  }

  public async getPrompts(serverId?: string): Promise<Record<string, any>> {
    if (serverId) {
      const client = this.clients.get(serverId);
      if (!client) {
        throw new Error(`No connected client for server ID: ${serverId}`);
      }

      try {
        const prompts = await client.listPrompts();
        return { [serverId]: prompts };
      } catch (error) {
        console.error(`Failed to get prompts from server ${serverId}:`, error);
        return { [serverId]: [] };
      }
    } else {
      // Get prompts from all connected servers
      const result: Record<string, any> = {};

      for (const [id, client] of this.clients.entries()) {
        try {
          const prompts = await client.listPrompts();
          result[id] = prompts;
        } catch (error) {
          console.error(`Failed to get prompts from server ${id}:`, error);
          result[id] = [];
        }
      }

      return result;
    }
  }

  public async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No connected client for server ID: ${serverId}`);
    }

    return client.callTool({
      name: toolName,
      arguments: args,
    });
  }

  public async loadResource(
    serverId: string,
    resourceUri: string
  ): Promise<unknown> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No connected client for server ID: ${serverId}`);
    }

    try {
      return await client.readResource({
        uri: resourceUri,
      });
    } catch (error) {
      console.error(`Failed to load resource: ${resourceUri}`, error);
      throw new Error(
        `Failed to load resource: ${resourceUri}. Original error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  public getStatus(): ServerConnectionStatus {
    return { ...this.status };
  }

  public getServerConfigs(): ServerConfig[] {
    return Array.from(this.configs.values());
  }

  public isConnected(serverId: string): boolean {
    return !!this.status[serverId]?.connected;
  }

  private async createClient(config: ServerConfig): Promise<Client> {
    let transport;

    if (isBrowser && config.transport.type === "stdio") {
      console.warn(
        "StdioClientTransport is not supported in browser environments"
      );
      throw new Error(
        "StdioClientTransport is not available in browser environments"
      );
    }

    // Create the appropriate transport based on config
    if (config.transport.type === "stdio") {
      const stdioConfig = config.transport.config as StdioTransportConfig;
      transport = new StdioClientTransport({
        command: stdioConfig.command,
        args: stdioConfig.args,
      });
    } else if (config.transport.type === "sse") {
      const sseConfig = config.transport.config as SSETransportConfig;
      // Create a URL object for SSE transport
      const url = new URL(sseConfig.url);
      transport = new SSEClientTransport(url);
    } else {
      throw new Error(
        `Unsupported transport type: ${(config.transport as any).type}`
      );
    }

    // Create client with client info and options
    const client = new Client(
      {
        name: config.name,
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    // Connect to the server
    await client.connect(transport);

    return client;
  }
}

// Singleton instance
const connectionManager = new MCPConnectionManager();
export default connectionManager;
