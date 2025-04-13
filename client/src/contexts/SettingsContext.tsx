// client/src/contexts/SettingsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

// Define the types locally instead of importing from a non-existent file
interface ServerConfig {
  id: string;
  name: string;
  url: string;
}

interface CredentialRequirement {
  id: string;
  name: string;
  description?: string;
  acquisition?: {
    url?: string;
    instructions?: string;
  };
}

interface ToolCredentialInfo {
  toolName: string;
  serverName: string;
  serverId: string;
  credentials: CredentialRequirement[];
}

interface ToolCredentialRequest {
  toolName: string;
  serverId: string;
  credentials: Record<string, string>;
}

// Fix for undefined environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

interface SettingsContextProps {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  nandaServers: ServerConfig[];
  registerNandaServer: (server: ServerConfig) => void;
  removeNandaServer: (id: string) => void;
  refreshRegistry: () => Promise<any>;
  getToolsWithCredentialRequirements: () => Promise<ToolCredentialInfo[]>;
  setToolCredentials: (
    toolName: string,
    serverId: string,
    credentials: Record<string, string>
  ) => Promise<boolean>;
  sessionId: string | null;
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
  sessionId: null,
});

export const useSettingsContext = () => useContext(SettingsContext);

// Local storage keys
const API_KEY_STORAGE_KEY = "nanda_api_key";
const NANDA_SERVERS_STORAGE_KEY = "nanda_servers";
const SESSION_ID_STORAGE_KEY = "nanda_session_id";

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}: SettingsProviderProps) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [nandaServers, setNandaServers] = useState<ServerConfig[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      // First, check if we have a stored session ID
      const storedSessionId = localStorage.getItem(SESSION_ID_STORAGE_KEY);
      if (storedSessionId) {
        console.log("Using stored session ID:", storedSessionId);
        setSessionId(storedSessionId);
        return;
      }
      
      // If no stored session, create a new one
      try {
        const response = await fetch(`${API_BASE_URL}/api/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to create session");
        }
        
        const data = await response.json();
        console.log("Created new session with ID:", data.sessionId);
        // Store the new session ID in localStorage for future use
        localStorage.setItem(SESSION_ID_STORAGE_KEY, data.sessionId);
        setSessionId(data.sessionId);
      } catch (error) {
        console.error("Error creating session:", error);
        // Fallback to a local session ID if needed
        const fallbackId = "local-" + Math.random().toString(36).substring(2, 15);
        console.log("Using fallback session ID:", fallbackId);
        localStorage.setItem(SESSION_ID_STORAGE_KEY, fallbackId);
        setSessionId(fallbackId);
      }
    };
    
    initSession();
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
    setNandaServers((prevServers: any) => {
      // Check if server with this ID already exists
      const existingIndex = prevServers.findIndex((s: any) => s.id === server.id);
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

      // Also register with backend with increased timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout
      
      fetch(`${API_BASE_URL}/api/servers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(server),
        signal: controller.signal
      })
      .then(response => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`Failed to register server: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log(`Server ${server.id} registered successfully:`, data);
      })
      .catch((error) => {
        console.error("Failed to register server with backend:", error);
      });

      return newServers;
    });
  }, []);

  // Remove Nanda server
  const removeNandaServer = useCallback((id: string) => {
    setNandaServers((prevServers: any) => {
      const newServers = prevServers.filter((server: any) => server.id !== id);
      localStorage.setItem(
        NANDA_SERVERS_STORAGE_KEY,
        JSON.stringify(newServers)
      );
      return newServers;
    });
  }, []);

  // Register servers with backend on initial load
  useEffect(() => {
    if (nandaServers.length > 0 && sessionId) {
      // Register all servers with the backend
      const registerAllServers = async () => {
        console.log("Registering servers with backend:", nandaServers);
        for (const server of nandaServers) {
          try {
            const response = await fetch(`${API_BASE_URL}/api/servers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Session-ID": sessionId,
              },
              body: JSON.stringify(server),
            });
            
            if (!response.ok) {
              throw new Error(`Failed to register server: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`Server ${server.id} registered successfully:`, data);
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
  }, [nandaServers, sessionId]);

  // Get tools that require credentials
  const getToolsWithCredentialRequirements = useCallback(async (): Promise<ToolCredentialInfo[]> => {
    if (!sessionId) {
      console.warn("Cannot get tools: No session ID available");
      return [];
    }
    
    console.log(`Fetching tools requiring credentials using session ID: ${sessionId}`);
    console.log(`Using API base URL: ${API_BASE_URL}`);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tools/credentials`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": sessionId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get tools: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Received non-JSON response:", contentType);
        return [];
      }

      const data = await response.json();
      console.log("Tools with credential requirements:", data);
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
      if (!sessionId) {
        console.warn("Cannot set credentials: No session ID available");
        return false;
      }
      
      console.log(`Setting credentials for tool ${toolName} from server ${serverId}`);
      
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tools/credentials`,
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
          throw new Error(`Failed to set credentials: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Credentials set successfully:", data);
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
        `${API_BASE_URL}/api/registry/refresh`,
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
        sessionId,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
