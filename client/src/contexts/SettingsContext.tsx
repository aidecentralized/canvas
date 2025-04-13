// client/src/contexts/SettingsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
// Import ChatContext to access sessionId and clearSession function.
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
  setApiKey: (key: string) => void; // Correct signature: sessionId is internal now
  nandaServers: ServerConfig[];
  registryServers: ServerConfig[];
  setRegistryServers: (servers: ServerConfig[]) => void;
  registerNandaServer: (server: ServerConfig) => void;
  removeNandaServer: (id: string) => void;
  refreshRegistry: () => Promise<{ servers: ServerConfig[] }>;
}

const SettingsContext = createContext<SettingsContextProps>({
  apiKey: null,
  setApiKey: () => {}, // Correct default
  nandaServers: [],
  registryServers: [],
  setRegistryServers: () => {},
  registerNandaServer: () => {},
  removeNandaServer: () => {},
  refreshRegistry: async () => ({ servers: [] }),
});

export const useSettingsContext = () => useContext(SettingsContext);

// Local storage keys for persisting settings in the browser.
const API_KEY_STORAGE_KEY = "nanda_host_api_key";
const NANDA_SERVERS_STORAGE_KEY = "nanda_host_servers";

// Define API Base URL (points to the backend server)
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ?? "http://localhost:4000";

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [nandaServers, setNandaServers] = useState<ServerConfig[]>([]);
  const [registryServers, setRegistryServers] = useState<ServerConfig[]>([]);
  // Get sessionId AND clearSession from ChatContext.
  // sessionId is crucial for making authenticated backend calls.
  // clearSession is used to handle session invalidation errors during API calls.
  const { sessionId, clearSession } = useChatContext();

  /**
   * Effect runs once on mount to load API key and registered server list
   * from the browser's local storage into the React state.
   * This happens *before* the session ID might be available from ChatContext.
   */
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

  /**
   * Helper function to centralize error handling for fetch calls,
   * specifically checking for session-related errors (401, 400)
   * and calling clearSession if detected.
   */
  const handleFetchError = useCallback(async (response: Response, defaultMessage: string) => {
    let errorData = { error: defaultMessage };
    try {
        errorData = await response.json();
    } catch (e) { console.warn("Could not parse error response JSON"); }

    // Check for session invalidation status codes or error messages.
    if (response.status === 401 || (response.status === 400 && errorData.error?.includes("session"))) {
        console.error(`Session error detected (${response.status}). Clearing session.`);
        clearSession(); // Use clearSession from ChatContext to invalidate the session client-side.
        throw new Error(errorData.error || "Session invalid. Please refresh the page or try again.");
    }
    // Throw other errors for specific handling.
    throw new Error(errorData.error || defaultMessage);
  }, [clearSession]); // Depends on clearSession from ChatContext.

  /**
   * Effect runs whenever the `sessionId` changes (specifically, when it becomes available after initialization).
   * Its purpose is to synchronize the settings loaded from local storage (API key, servers)
   * with the backend session state. This ensures the backend has the correct context
   * associated with the current session ID for subsequent operations like chat completions.
   */
  useEffect(() => {
    // Only proceed if we have a valid session ID from ChatContext.
    if (!sessionId) {
      console.log("SettingsContext: Waiting for session ID to sync settings with backend...");
      return;
    }
    console.log(`SettingsContext: Session ID ${sessionId} available. Syncing settings with backend...`);

    // --- Sync API Key ---
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      console.log(`SettingsContext: Syncing stored API key for session ${sessionId}...`);
      // Send the stored API key to the backend's /api/settings/apikey endpoint.
      fetch(`${API_BASE_URL}/api/settings/apikey`, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "X-Session-Id": sessionId, // Include session ID in header.
          },
          body: JSON.stringify({ apiKey: storedApiKey }),
      }).then(async response => {
          if (response.ok) {
              console.log(`SettingsContext: API key synced successfully for session ${sessionId}.`);
          } else {
              console.error(`SettingsContext: Failed to sync API key for session ${sessionId}.`);
              // Use handleFetchError to check for session invalidation.
              try { await handleFetchError(response, "Failed to sync API key"); }
              catch (error) { console.error("Error handled after API key sync failure:", error); }
          }
      }).catch(err => {
          console.error("Network error syncing API key:", err);
      });
    }

    // --- Sync Nanda Servers ---
    const storedServers = localStorage.getItem(NANDA_SERVERS_STORAGE_KEY);
    let initialServers: ServerConfig[] = [];
    if (storedServers) { /* ... parsing logic ... */
      try {
        const parsedServers = JSON.parse(storedServers);
        if (Array.isArray(parsedServers)) {
          initialServers = parsedServers;
        }
      } catch (error) { console.error("Failed to parse stored Nanda servers:", error); }
    }


    if (initialServers.length > 0) {
      // Register each server stored locally with the backend session.
      const registerAllServers = async () => {
        console.log(`SettingsContext: Registering ${initialServers.length} servers from local storage with backend session ${sessionId}...`);
        for (const server of initialServers) {
          try {
            // Send server config to the backend's /api/servers endpoint.
            const response = await fetch(`${API_BASE_URL}/api/servers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Session-Id": sessionId, // Include session ID in header.
              },
              body: JSON.stringify(server),
            });
            if (!response.ok) {
                console.error(`SettingsContext: Failed to register server ${server.id} for session ${sessionId}.`);
                // Use handleFetchError to check for session invalidation.
                await handleFetchError(response, `Failed to register server ${server.id}`);
                // If session is cleared by handleFetchError, subsequent calls in this loop might fail.
            } else {
                 console.log(`SettingsContext: Server ${server.id} registered successfully during initial sync for session ${sessionId}.`);
            }
          } catch (error) {
            console.error(`Error registering server ${server.id} with backend session ${sessionId}:`, error);
            // If handleFetchError threw, the error is caught here.
          }
        }
        console.log(`SettingsContext: Finished registering servers from local storage for session ${sessionId}.`);
      };
      registerAllServers();
    }

  // This effect depends on `sessionId` becoming available and the stable `handleFetchError` function.
  }, [sessionId, handleFetchError]);

  /**
   * Fetches the list of servers from the central MCP registry via the backend.
   * Requires a valid session ID for the backend request authorization/context.
   * Updates the `registryServers` state upon success.
   */
  const refreshRegistry = useCallback(async (): Promise<{ servers: ServerConfig[] }> => {
    // Ensure session ID is available before making the backend call.
    if (!sessionId) {
        console.error("Cannot refresh registry: Session ID not available.");
        throw new Error("Session ID not available. Please wait or reload.");
    }
    console.log(`Refreshing registry via backend for session ${sessionId}...`);
    try {
      // Call the backend endpoint to trigger registry fetch.
      const response = await fetch(
        `${API_BASE_URL}/api/registry/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Id": sessionId, // Include session ID in header.
          },
        }
      );

      if (!response.ok) {
        // Use the error handler to check for session errors.
        await handleFetchError(response, "Failed to refresh registry");
      }

      const data = await response.json();
      const fetchedServers = data.servers || [];
      console.log("Registry refresh successful, received servers:", fetchedServers.length);
      // Update the local state with the fetched servers.
      setRegistryServers(fetchedServers);
      return { servers: fetchedServers };

    } catch (error: any) {
      console.error("Error during registry refresh:", error);
      // ... (error logging) ...
      if (error instanceof TypeError && error.message.includes("fetch")) {
          console.error("NetworkError details: Is the server running? Check CORS and API_BASE_URL.");
      }
      throw new Error(`Registry refresh failed: ${error.message}`);
    }
  }, [sessionId, handleFetchError]); // Depends on sessionId and handleFetchError.

  /**
   * Registers a Nanda server both locally (React state + browser local storage)
   * and sends the configuration to the backend to associate it with the current session.
   * Requires a valid session ID.
   */
  const registerNandaServer = useCallback((server: ServerConfig) => {
    if (!sessionId) { /* ... session check ... */
        console.error("Cannot register server: Session ID not available.");
        return;
    }
    console.log(`Registering server ${server.id} locally and with backend session ${sessionId}`);

    // Update local state and storage first.
    setNandaServers((prevServers) => {
      // ... (local state update logic) ...
      const existingIndexById = prevServers.findIndex((s) => s.id === server.id);
      const existingIndexByUrl = prevServers.findIndex((s) => s.url === server.url);
      let newServers: ServerConfig[];
      if (existingIndexById >= 0) { newServers = [...prevServers]; newServers[existingIndexById] = server; }
      else if (existingIndexByUrl >= 0) { newServers = [...prevServers]; newServers[existingIndexByUrl] = server; }
      else { newServers = [...prevServers, server]; }
      localStorage.setItem(NANDA_SERVERS_STORAGE_KEY, JSON.stringify(newServers));


      // Then, register with the backend session.
      fetch(`${API_BASE_URL}/api/servers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId, // Include session ID in header.
        },
        body: JSON.stringify(server),
      })
        .then(async response => {
          if (!response.ok) {
            // Use the helper function to handle potential session errors.
            await handleFetchError(response, "Failed to register server with backend");
          } else {
            console.log(`Server ${server.id} registered successfully with backend session ${sessionId}.`);
          }
        })
        .catch((error) => {
          console.error(`Failed to register server ${server.id} with backend:`, error);
          // Consider rollback or user notification if backend call fails.
        });

      return newServers;
    });
  }, [sessionId, handleFetchError]); // Depends on sessionId and handleFetchError.

  /**
   * Removes a Nanda server both locally (React state + browser local storage)
   * and sends a request to the backend to unregister it from the current session.
   * Requires a valid session ID.
   */
  const removeNandaServer = useCallback((id: string) => {
     if (!sessionId) { /* ... session check ... */
        console.error("Cannot remove server: Session ID not available.");
        return;
    }
    console.log(`Removing server ${id} locally and from backend session ${sessionId}`);

    // Update local state and storage first.
    setNandaServers((prevServers) => {
      const newServers = prevServers.filter((server) => server.id !== id);
      localStorage.setItem(NANDA_SERVERS_STORAGE_KEY, JSON.stringify(newServers));
      return newServers;
    });

    // Then, unregister from the backend session.
    fetch(`${API_BASE_URL}/api/servers/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
         "X-Session-Id": sessionId, // Include session ID in header.
      },
    })
    .then(async response => {
       if (!response.ok) {
         // Use the helper function to handle potential session errors.
         await handleFetchError(response, "Failed to unregister server with backend");
       } else {
         console.log(`Server ${id} unregistered successfully on backend session ${sessionId}.`);
       }
    })
    .catch((error) => {
      console.error(`Failed to unregister server ${id} with backend:`, error);
      // Consider rollback or user notification if backend call fails.
    });

  }, [sessionId, handleFetchError]); // Depends on sessionId and handleFetchError.


  /**
   * Sets the Anthropic API key locally (React state + browser local storage)
   * and sends it to the backend to associate it with the current session.
   * Requires a valid session ID.
   */
  const setApiKey = useCallback((key: string) => {
    if (!sessionId) { /* ... session check ... */
        console.error("Cannot set API key: Session ID not available.");
        return;
    }
    console.log(`Setting API key locally and associating with backend session ${sessionId}...`);

    // Update local state and storage first.
    setApiKeyState(key);
    localStorage.setItem(API_KEY_STORAGE_KEY, key);

    // Then, send to the backend to associate with the session.
    fetch(`${API_BASE_URL}/api/settings/apikey`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Session-Id": sessionId, // Include session ID in header.
        },
        body: JSON.stringify({ apiKey: key }),
    }).then(async response => {
        if (!response.ok) {
            // Use the helper function to handle potential session errors.
            await handleFetchError(response, "Failed to set API key on backend session");
        } else {
            console.log(`API key successfully set on backend session ${sessionId}.`);
        }
    }).catch(err => {
        console.error("Error setting API key on backend:", err);
        // Consider rollback or user notification if backend call fails.
    });

  }, [sessionId, handleFetchError]); // Depends on sessionId and handleFetchError.

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
