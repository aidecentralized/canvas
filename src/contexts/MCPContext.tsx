import React, { createContext, useContext, useEffect, useState } from "react";
import { Tool, Resource, Prompt } from "@modelcontextprotocol/sdk/types.js";
import connectionManager, {
  ServerConfig,
  ServerConnectionStatus,
} from "@/lib/mcp/connection";
import { fetchServersFromRegistry } from "@/api/mcp-registry";

interface MCPContextProps {
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
  loadResource: (serverId: string, resourceUri: string) => Promise<unknown>;
  refreshTools: (serverId?: string) => Promise<void>;
  refreshResources: (serverId?: string) => Promise<void>;
  refreshPrompts: (serverId?: string) => Promise<void>;
  discoverServers: () => Promise<ServerConfig[]>;
}

const MCPContext = createContext<MCPContextProps | undefined>(undefined);

export const MCPProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [status, setStatus] = useState<ServerConnectionStatus>({});
  const [tools, setTools] = useState<Record<string, Tool[]>>({});
  const [resources, setResources] = useState<Record<string, Resource[]>>({});
  const [prompts, setPrompts] = useState<Record<string, Prompt[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize with saved servers from localStorage
  useEffect(() => {
    const loadSavedServers = async () => {
      try {
        setIsLoading(true);

        // Load saved servers from localStorage
        const savedServers = localStorage.getItem("mcp-servers");
        const initialServers: ServerConfig[] = savedServers
          ? JSON.parse(savedServers)
          : [];

        setServers(initialServers);

        // Initialize connection manager with saved servers
        await connectionManager.initialize(initialServers);
        setStatus(connectionManager.getStatus());

        // Load tools, resources, and prompts
        await refreshAllData();

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    };

    loadSavedServers();

    // Set up event listeners
    connectionManager.on("statusChanged", (newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      // Clean up event listeners
      connectionManager.removeAllListeners();
    };
  }, []);

  // Save servers to localStorage when they change
  useEffect(() => {
    localStorage.setItem("mcp-servers", JSON.stringify(servers));
  }, [servers]);

  // Connect to a server
  const connectServer = async (serverId: string) => {
    try {
      await connectionManager.connect(serverId);

      // Update tools and resources after connecting
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Disconnect from a server
  const disconnectServer = async (serverId: string) => {
    try {
      await connectionManager.disconnect(serverId);

      // Remove tools and resources for this server
      setTools((prev) => {
        const newTools = { ...prev };
        delete newTools[serverId];
        return newTools;
      });

      setResources((prev) => {
        const newResources = { ...prev };
        delete newResources[serverId];
        return newResources;
      });

      setPrompts((prev) => {
        const newPrompts = { ...prev };
        delete newPrompts[serverId];
        return newPrompts;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Toggle server enabled state
  const toggleServerEnabled = async (serverId: string, enabled: boolean) => {
    try {
      const updatedServers = servers.map((server) =>
        server.id === serverId ? { ...server, enabled } : server
      );

      setServers(updatedServers);

      if (enabled) {
        await connectServer(serverId);
      } else {
        await disconnectServer(serverId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Add a new server
  const addServer = async (server: ServerConfig) => {
    try {
      // Check if server with this ID already exists
      if (servers.some((s) => s.id === server.id)) {
        throw new Error(`Server with ID ${server.id} already exists`);
      }

      setServers((prev) => [...prev, server]);

      // Connect if enabled
      if (server.enabled) {
        await connectServer(server.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Remove a server
  const removeServer = async (serverId: string) => {
    try {
      // Disconnect if connected
      if (connectionManager.isConnected(serverId)) {
        await disconnectServer(serverId);
      }

      setServers((prev) => prev.filter((server) => server.id !== serverId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Update a server
  const updateServer = async (server: ServerConfig) => {
    try {
      // Check if server exists
      if (!servers.some((s) => s.id === server.id)) {
        throw new Error(`Server with ID ${server.id} not found`);
      }

      // First disconnect if connected
      if (connectionManager.isConnected(server.id)) {
        await disconnectServer(server.id);
      }

      // Update the server in state
      setServers((prev) => prev.map((s) => (s.id === server.id ? server : s)));

      // Reconnect if enabled
      if (server.enabled) {
        await connectServer(server.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Call a tool on a server
  const callTool = async (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => {
    try {
      return await connectionManager.callTool(serverId, toolName, args);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Load a resource from a server
  const loadResource = async (serverId: string, resourceUri: string) => {
    try {
      return await connectionManager.loadResource(serverId, resourceUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Refresh tools for a specific server or all servers
  const refreshTools = async (serverId?: string) => {
    try {
      const newTools = await connectionManager.getTools(serverId);
      setTools((prev) => ({ ...prev, ...newTools }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Refresh resources for a specific server or all servers
  const refreshResources = async (serverId?: string) => {
    try {
      const newResources = await connectionManager.getResources(serverId);
      setResources((prev) => ({ ...prev, ...newResources }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Refresh prompts for a specific server or all servers
  const refreshPrompts = async (serverId?: string) => {
    try {
      const newPrompts = await connectionManager.getPrompts(serverId);
      setPrompts((prev) => ({ ...prev, ...newPrompts }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Refresh all data
  const refreshAllData = async () => {
    try {
      await refreshTools();
      await refreshResources();
      await refreshPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Discover servers from registry
  const discoverServers = async (): Promise<ServerConfig[]> => {
    try {
      setIsLoading(true);
      const discoveredServers = await fetchServersFromRegistry();
      setIsLoading(false);
      return discoveredServers;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
      throw err;
    }
  };

  const contextValue: MCPContextProps = {
    servers,
    status,
    tools,
    resources,
    prompts,
    isLoading,
    error,
    connectServer,
    disconnectServer,
    toggleServerEnabled,
    addServer,
    removeServer,
    updateServer,
    callTool,
    loadResource,
    refreshTools,
    refreshResources,
    refreshPrompts,
    discoverServers,
  };

  return (
    <MCPContext.Provider value={contextValue}>{children}</MCPContext.Provider>
  );
};

// Custom hook to use the MCP context
export const useMCP = () => {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error("useMCP must be used within a MCPProvider");
  }
  return context;
};
