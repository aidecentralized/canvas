// client/src/contexts/SettingsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

interface ServerConfig {
  id: string;
  name: string;
  url: string;
}

interface SettingsContextProps {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  mcpServers: ServerConfig[];
  registerMcpServer: (server: ServerConfig) => void;
  removeMcpServer: (id: string) => void;
  refreshRegistry: () => Promise<{ servers: ServerConfig[] }>;
}

const SettingsContext = createContext<SettingsContextProps>({
  apiKey: null,
  setApiKey: () => {},
  mcpServers: [],
  registerMcpServer: () => {},
  removeMcpServer: () => {},
  refreshRegistry: async () => ({ servers: [] }),
});

export const useSettingsContext = () => useContext(SettingsContext);

// Local storage keys
const API_KEY_STORAGE_KEY = "mcp_host_api_key";
const MCP_SERVERS_STORAGE_KEY = "mcp_host_servers";

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [mcpServers, setMcpServers] = useState<ServerConfig[]>([]);

  // Load settings from local storage on mount
  useEffect(() => {
    // Load API key
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKeyState(storedApiKey);
    }

    // Load MCP servers
    const storedServers = localStorage.getItem(MCP_SERVERS_STORAGE_KEY);
    if (storedServers) {
      try {
        const parsedServers = JSON.parse(storedServers);
        if (Array.isArray(parsedServers)) {
          setMcpServers(parsedServers);
        }
      } catch (error) {
        console.error("Failed to parse stored MCP servers:", error);
      }
    }
  }, []);

  // Save API key to local storage
  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  }, []);

  // Register MCP server
  const registerMcpServer = useCallback((server: ServerConfig) => {
    setMcpServers((prevServers) => {
      // Check if server with this ID already exists
      const existingIndex = prevServers.findIndex((s) => s.id === server.id);
      let newServers: ServerConfig[];

      if (existingIndex >= 0) {
        // Update existing server
        newServers = [...prevServers];
        newServers[existingIndex] = server;
      } else {
        // Add new server
        newServers = [...prevServers, server];
      }

      // Save to local storage
      localStorage.setItem(MCP_SERVERS_STORAGE_KEY, JSON.stringify(newServers));

      // Also register with backend
      fetch(`${process.env.REACT_APP_API_BASE_URL}/api/servers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(server),
      }).catch((error) => {
        console.error("Failed to register server with backend:", error);
      });

      return newServers;
    });
  }, []);

  // Remove MCP server
  const removeMcpServer = useCallback((id: string) => {
    setMcpServers((prevServers) => {
      const newServers = prevServers.filter((server) => server.id !== id);
      localStorage.setItem(MCP_SERVERS_STORAGE_KEY, JSON.stringify(newServers));
      return newServers;
    });
  }, []);

  // Register servers with backend on initial load
  useEffect(() => {
    if (mcpServers.length > 0) {
      // Register all servers with the backend
      const registerAllServers = async () => {
        for (const server of mcpServers) {
          try {
            await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/servers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(server),
            });
          } catch (error) {
            console.error(
              `Failed to register server ${server.id} with backend:`,
              error
            );
          }
        }
      };

      registerAllServers();
    }
  }, []);

  // Refresh servers from registry
  const refreshRegistry = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/registry/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to refresh servers from registry"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error refreshing servers from registry:", error);
      throw error;
    }
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        apiKey,
        setApiKey,
        mcpServers,
        registerMcpServer,
        removeMcpServer,
        refreshRegistry,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
