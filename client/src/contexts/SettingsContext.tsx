// client/src/contexts/SettingsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
// Import clearSession or the whole context if needed
import { useChatContext } from "./ChatContext";

interface ServerConfig {
  id: string;
  name: string;
  url: string;
  description?: string;
  types?: string[];
  tags?: string[];
  verified?: boolean;
  rating?: number;
}

interface SettingsContextProps {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  nandaServers: ServerConfig[];
  registryServers: ServerConfig[];
  setRegistryServers: (servers: ServerConfig[]) => void;
  registerNandaServer: (server: ServerConfig) => void;
  removeNandaServer: (id: string) => void;
  refreshRegistry: () => Promise<{ servers: ServerConfig[] }>;
}

const SettingsContext = createContext<SettingsContextProps>({
  apiKey: null,
  setApiKey: () => {},
  nandaServers: [],
  registryServers: [],
  setRegistryServers: () => {},
  registerNandaServer: () => {},
  removeNandaServer: () => {},
  refreshRegistry: async () => ({ servers: [] }),
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
  const [registryServers, setRegistryServers] = useState<ServerConfig[]>([]);
  // Get sessionId AND clearSession from ChatContext
  const { sessionId, clearSession } = useChatContext();

  // Load settings from local storage on mount (API key and servers)
  // This part doesn't need the session ID initially
  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKeyState(storedApiKey);
    }

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

  // Helper function to handle session errors in fetch calls
  const handleFetchError = useCallback(async (response: Response, defaultMessage: string) => {
    let errorData = { error: defaultMessage };
    try {
        errorData = await response.json();
    } catch (e) {
        console.warn("Could not parse error response JSON");
    }
    // Check for specific session errors
    if (response.status === 401 || (response.status === 400 && errorData.error?.includes("session"))) {
        clearSession(); // Use clearSession from ChatContext
        throw new Error(errorData.error || "Session invalid. Please refresh the page or try again.");
    }
    throw new Error(errorData.error || defaultMessage);
  }, [clearSession]); // Add clearSession dependency

  // Effect to sync loaded settings with the backend *once sessionId is available*
  useEffect(() => {
    // Only run if sessionId is available
    if (!sessionId) {
      console.log("SettingsContext: Waiting for session ID to sync with backend...");
      return;
    }
    console.log(`SettingsContext: Session ID ${sessionId} available. Syncing settings...`);

    // Sync API Key
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      // Use relative path '/' as fallback, relying on Nginx proxy
      fetch(`${process.env.REACT_APP_API_BASE_URL || ""}/api/settings/apikey`, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "X-Session-Id": sessionId, // Use sessionId from context
          },
          body: JSON.stringify({ apiKey: storedApiKey }),
      }).then(async response => { // Make async to use await
          if (response.ok) {
              console.log("API key synced with backend session.");
          } else {
              console.error("Failed to sync API key with backend session.");
              // Use handleFetchError to potentially clear the session
              try {
                  await handleFetchError(response, "Failed to sync API key");
              } catch (error) {
                  console.error("Error handled after API key sync failure:", error);
              }
          }
      }).catch(err => {
          console.error("Network error syncing API key:", err);
          // Network errors typically don't indicate invalid sessions, but could be handled further if needed
      });
    }

    // Sync Nanda Servers
    const storedServers = localStorage.getItem(NANDA_SERVERS_STORAGE_KEY);
    let initialServers: ServerConfig[] = [];
    if (storedServers) {
      try {
        const parsedServers = JSON.parse(storedServers);
        if (Array.isArray(parsedServers)) {
          initialServers = parsedServers;
        }
      } catch (error) {
        console.error("Failed to parse stored Nanda servers:", error);
      }
    }

    if (initialServers.length > 0) {
      const registerAllServers = async () => {
        console.log(`Registering ${initialServers.length} servers from local storage with backend session ${sessionId}...`);
        for (const server of initialServers) {
          try {
            // Use relative path '/' as fallback, relying on Nginx proxy
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || ""}/api/servers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Session-Id": sessionId, // Use sessionId from context
              },
              body: JSON.stringify(server),
            });
            if (!response.ok) {
                // Use handleFetchError here as well
                await handleFetchError(response, `Failed to register server ${server.id}`);
                // If handleFetchError throws, the loop might continue, but the session would be cleared.
                // Consider adding a check here if sessionId becomes null after handleFetchError.
            } else {
                 console.log(`Server ${server.id} registered successfully during initial sync.`);
            }
          } catch (error) {
            console.error(
              `Error registering server ${server.id} with backend session ${sessionId}:`,
              error
            );
            // If handleFetchError threw, the error is caught here.
            // If the session was cleared, subsequent fetches in this loop will likely fail or use a new session if obtained quickly.
          }
        }
        console.log("Finished registering servers from local storage.");
      };
      registerAllServers();
    }

  // Add handleFetchError to dependency array
  }, [sessionId, handleFetchError]);

  // Refresh servers from registry
  const refreshRegistry = useCallback(async (): Promise<{ servers: ServerConfig[] }> => { // Add explicit return type here
    // Check sessionId availability
    if (!sessionId) {
        console.error("Cannot refresh registry: Session ID not available.");
        throw new Error("Session ID not available. Please wait or reload.");
    }
    console.log(`Refreshing registry for session ${sessionId}...`);
    try {
      const response = await fetch(
        // Use relative path '/' as fallback, relying on Nginx proxy
        `${process.env.REACT_APP_API_BASE_URL || ""}/api/registry/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Id": sessionId, // Use sessionId from context
          },
        }
      );

      if (!response.ok) {
        // Use the error handler, passing the response and a default message
        await handleFetchError(response, "Failed to refresh registry");
        // handleFetchError throws, so execution stops here in case of error
        // If handleFetchError didn't throw, we'd need to ensure we don't proceed.
        // Since it throws, we can assume successful response below.
      }

      const data = await response.json();
      const fetchedServers = data.servers || [];
      console.log("Registry refresh successful, received servers:", fetchedServers.length);
      setRegistryServers(fetchedServers);
      return { servers: fetchedServers }; // Explicitly return the fetched servers

    } catch (error: any) {
      // Catch potential network errors or errors thrown by handleFetchError
      console.error("Error during registry refresh:", error);
      // Log specific details for NetworkError
      if (error instanceof TypeError && error.message.includes("fetch")) {
          console.error("NetworkError details: Is the server running? Check CORS and API_BASE_URL.");
      }
      // Re-throw or handle as needed (e.g., show toast)
      // Ensure a value is returned or error is thrown to satisfy the Promise type
      throw new Error(`Registry refresh failed: ${error.message}`);
    }
  }, [sessionId, handleFetchError]); // Add handleFetchError dependency

  // Update registerNandaServer
  const registerNandaServer = useCallback((server: ServerConfig) => {
    // Check sessionId availability
    if (!sessionId) {
        console.error("Cannot register server: Session ID not available.");
        // Optionally show a toast error
        return;
    }
    console.log(`Registering server ${server.id} for session ${sessionId}`);

    setNandaServers((prevServers) => {
      // ... (local state update logic remains the same) ...
      const existingIndexById = prevServers.findIndex((s) => s.id === server.id);
      const existingIndexByUrl = prevServers.findIndex((s) => s.url === server.url);
      let newServers: ServerConfig[];

      if (existingIndexById >= 0) {
        newServers = [...prevServers];
        newServers[existingIndexById] = server;
      }
      else if (existingIndexByUrl >= 0) {
        newServers = [...prevServers];
        newServers[existingIndexByUrl] = server;
      }
      else {
        newServers = [...prevServers, server];
      }
      localStorage.setItem(NANDA_SERVERS_STORAGE_KEY, JSON.stringify(newServers));


      // Register with backend
      // Use relative path '/' as fallback, relying on Nginx proxy
      fetch(`${process.env.REACT_APP_API_BASE_URL || ""}/api/servers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId, // Use sessionId from context
        },
        body: JSON.stringify(server),
      })
        .then(async response => {
          if (!response.ok) {
            // Use the helper function
            await handleFetchError(response, "Failed to register server with backend");
          }
          // If response is ok, log success
          console.log("Server registered successfully with backend.");
        })
        .catch((error) => {
          console.error("Failed to register server with backend:", error);
          // Rollback or notify user might be needed here depending on the error type
          // If it was a session error, clearSession was already called by handleFetchError
        });

      return newServers;
    });
  // Add sessionId and handleFetchError to dependency array
  }, [sessionId, handleFetchError]);

  // Update removeNandaServer
  const removeNandaServer = useCallback((id: string) => {
    // Check sessionId availability
     if (!sessionId) {
        console.error("Cannot remove server: Session ID not available.");
        // Optionally show a toast error
        return;
    }
    console.log(`Removing server ${id} for session ${sessionId}`);

    // ... (local state update logic remains the same) ...
    setNandaServers((prevServers) => {
      const newServers = prevServers.filter((server) => server.id !== id);
      localStorage.setItem(
        NANDA_SERVERS_STORAGE_KEY,
        JSON.stringify(newServers)
      );
      return newServers;
    });


    // Call backend to unregister the server
    // Use relative path '/' as fallback, relying on Nginx proxy
    fetch(`${process.env.REACT_APP_API_BASE_URL || ""}/api/servers/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
         "X-Session-Id": sessionId, // Use sessionId from context
      },
    })
    .then(async response => {
       if (!response.ok) {
         // Use the helper function
         await handleFetchError(response, "Failed to unregister server with backend");
       }
       // If response is ok, log success
       console.log("Server unregistered successfully on backend.");
    })
    .catch((error) => {
      console.error("Failed to unregister server with backend:", error);
      // Rollback or notify user might be needed here
    });

  // Add sessionId and handleFetchError to dependency array
  }, [sessionId, handleFetchError]);


  // Update setApiKey
  const setApiKey = useCallback((key: string) => {
    // Check sessionId availability
    if (!sessionId) {
        console.error("Cannot set API key: Session ID not available.");
        // Optionally show a toast error
        return;
    }
    console.log(`Setting API key for session ${sessionId}...`);

    // Update local state and storage
    setApiKeyState(key);
    localStorage.setItem(API_KEY_STORAGE_KEY, key);

    // Call backend to associate key with session
    // Use relative path '/' as fallback, relying on Nginx proxy
    fetch(`${process.env.REACT_APP_API_BASE_URL || ""}/api/settings/apikey`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Session-Id": sessionId, // Use sessionId from context
        },
        body: JSON.stringify({ apiKey: key }),
    }).then(async response => {
        if (!response.ok) {
            // Use the helper function
            await handleFetchError(response, "Failed to set API key on backend session");
        } else {
            console.log("API key successfully set on backend session.");
        }
    }).catch(err => {
        console.error("Error setting API key on backend:", err);
        // Rollback or notify user might be needed here
    });

  // Add sessionId and handleFetchError to dependency array
  }, [sessionId, handleFetchError]);

  return (
    <SettingsContext.Provider
      value={{
        apiKey,
        setApiKey,
        nandaServers,
        registryServers,
        setRegistryServers,
        registerNandaServer,
        removeNandaServer,
        refreshRegistry,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
