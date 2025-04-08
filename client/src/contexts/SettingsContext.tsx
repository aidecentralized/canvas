// client/src/contexts/SettingsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ServerConfig, ToolCredentialInfo, ToolCredentialRequest } from "../../shared/types";

interface SettingsContextProps {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  nandaServers: ServerConfig[];
  registerNandaServer: (server: ServerConfig) => void;
  removeNandaServer: (id: string) => void;
  refreshRegistry: () => Promise<{ servers: ServerConfig[] }>;
  getToolsWithCredentialRequirements: () => Promise<ToolCredentialInfo[]>;
  setToolCredentials: (
    toolName: string, 
    serverId: string, 
    credentials: Record<string, string>
  ) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextProps>({
  apiKey: null,
  setApiKey: () => {},
  nandaServers: [],
  registerNandaServer: () => {},
  removeNandaServer: () => {},
  refreshRegistry: async () => ({ servers: [] }),
  getToolsWithCredentialRequirements: async () => [],
  setToolCredentials: async () => false,
});

export const useSettingsContext = () => useContext(SettingsContext);

// Local storage keys
const API_KEY_STORAGE_KEY = "nanda_host_api_key";
const NANDA_SERVERS_STORAGE_KEY = "nanda_host_servers";

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [nandaServers, setNandaServers] = useState<ServerConfig[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to create session");
        }
        
        const data = await response.json();
        setSessionId(data.sessionId);
      } catch (error) {
        console.error("Error creating session:", error);
        // Fallback to a local session ID if needed
        setSessionId("local-" + Math.random().toString(36).substring(2, 15));
      }
    };
    
    createSession();
  }, []);

  // Load settings from local storage on mount
  useEffect(() => {
    // Load API key
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKeyState(storedApiKey);
    }

    // Load Nanda servers
    const storedServers = localStorage.getItem(NANDA_SERVERS_STORAGE_KEY);
    if (storedServers) {
      try {
        const parsedServers = JSON.parse(storedServers);
        if (Array.isArray(parsedServers)) {
          setNandaServers(parsedServers);
        }
      } catch (error) {
        console.error("Failed to parse stored Nanda servers:", error);
      }
    }
  }, []);

  // Save API key to local storage
  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  }, []);

  // Register Nanda server
  const registerNandaServer = useCallback((server: ServerConfig) => {
    setNandaServers((prevServers) => {
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
      localStorage.setItem(
        NANDA_SERVERS_STORAGE_KEY,
        JSON.stringify(newServers)
      );

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

  // Remove Nanda server
  const removeNandaServer = useCallback((id: string) => {
    setNandaServers((prevServers) => {
      const newServers = prevServers.filter((server) => server.id !== id);
      localStorage.setItem(
        NANDA_SERVERS_STORAGE_KEY,
        JSON.stringify(newServers)
      );
      return newServers;
    });
  }, []);

  // Register servers with backend on initial load
  useEffect(() => {
    if (nandaServers.length > 0) {
      // Register all servers with the backend
      const registerAllServers = async () => {
        for (const server of nandaServers) {
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

  // Get tools that require credentials
  const getToolsWithCredentialRequirements = useCallback(async (): Promise<ToolCredentialInfo[]> => {
    if (!sessionId) return [];
    
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/tools/credentials`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": sessionId,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get tools with credential requirements");
      }

      const data = await response.json();
      return data.tools || [];
    } catch (error) {
      console.error("Error getting tools with credential requirements:", error);
      return [];
    }
  }, [sessionId]);

  // Set credentials for a tool
  const setToolCredentials = useCallback(
    async (
      toolName: string,
      serverId: string,
      credentials: Record<string, string>
    ): Promise<boolean> => {
      if (!sessionId) return false;
      
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/tools/credentials`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-ID": sessionId,
            },
            body: JSON.stringify({
              toolName,
              serverId,
              credentials,
            } as ToolCredentialRequest),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to set tool credentials");
        }

        const data = await response.json();
        return data.success || false;
      } catch (error) {
        console.error(`Error setting credentials for tool ${toolName}:`, error);
        return false;
      }
    },
    [sessionId]
  );

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
        nandaServers,
        registerNandaServer,
        removeNandaServer,
        refreshRegistry,
        getToolsWithCredentialRequirements,
        setToolCredentials,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
