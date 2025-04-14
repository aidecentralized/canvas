// client/src/contexts/ChatContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect, // Import useEffect
  useRef, // Import useRef
} from "react";
import { useSettingsContext } from "./SettingsContext"; // Keep this if needed elsewhere, but apiKey check is removed from sendMessage
import { v4 as uuidv4 } from "uuid";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: any;
  timestamp: Date;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: any;
    result?: {
      content: any[];
      isError?: boolean;
    };
  }>;
}

interface ChatContextProps {
  messages: Message[];
  isLoading: boolean;
  currentInputText: string;
  setCurrentInputText: (text: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  /** The current session ID. Null if not yet initialized or cleared. */
  sessionId: string | null; // Session ID can be null initially
  /** Function to clear the current session ID from state and local storage. */
  clearSession: () => void; // Function to clear session
}

const ChatContext = createContext<ChatContextProps>({
  messages: [],
  isLoading: false,
  currentInputText: "",
  setCurrentInputText: () => {},
  sendMessage: async () => {},
  clearMessages: () => {},
  sessionId: null, // Default to null
  clearSession: () => {}, // Default function
});

export const useChatContext = () => useContext(ChatContext);

// Define API Base URL with a default for deployment
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ?? "http://localhost:4000"; // Default to server port

interface ChatProviderProps {
  children: React.ReactNode;
}

const SESSION_ID_STORAGE_KEY = "sessionId"; // Define key for localStorage

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInputText, setCurrentInputText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null); // Session ID state
  const messagesRef = useRef<Message[]>(messages); // Ref to hold current messages

  // Update messagesRef whenever messages state changes
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * Clears the session ID from React state and browser's local storage.
   * This typically happens if the backend indicates the session is invalid (e.g., 401 error).
   * The user might need to refresh the page to get a new session.
   */
  const clearSession = useCallback(() => {
    console.warn("Clearing session ID from state and local storage.");
    setSessionId(null); // Clear from state
    localStorage.removeItem(SESSION_ID_STORAGE_KEY); // Clear from storage
    // Consider adding a user notification here (e.g., via toast)
    // Optionally clear messages: setMessages([]);
  }, []);

  /**
   * Effect runs once on component mount to initialize the session ID.
   * 1. Checks local storage for an existing session ID.
   * 2. If found, uses it.
   * 3. If not found, requests a new session ID from the backend's /api/session endpoint.
   * 4. Stores the obtained session ID in both state and local storage.
   */
  useEffect(() => {
    const initializeSession = async () => {
      const storedSessionId = localStorage.getItem(SESSION_ID_STORAGE_KEY);
      if (storedSessionId) {
        console.log("Found session ID in storage:", storedSessionId);
        // Optional: Validate session ID with backend here if needed
        setSessionId(storedSessionId);
      } else {
        console.log("No session ID in storage, requesting new one...");
        try {
          // Use relative path '/' as fallback, relying on Nginx proxy
          const response = await fetch(`${API_BASE_URL}/api/session`, {
            method: "POST",
          });
          if (!response.ok) {
            throw new Error(`Failed to create session (${response.status})`);
          }
          const data = await response.json();
          if (data.sessionId) {
            console.log("Received new session ID:", data.sessionId);
            setSessionId(data.sessionId);
            localStorage.setItem(SESSION_ID_STORAGE_KEY, data.sessionId);
          } else {
            throw new Error("No session ID received from server");
          }
        } catch (error) {
          console.error("Error initializing session:", error);
          // Handle error appropriately (e.g., show error message)
        }
      }
    };
    initializeSession();
  }, []); // Run only on mount

  // Process assistant response to extract tool calls
  const processAssistantResponse = useCallback((response: any) => {
    const toolCalls = [];

    // Check for tool_use items in the content array
    if (response.content && Array.isArray(response.content)) {
      for (const item of response.content) {
        if (item.type === "tool_use") {
          toolCalls.push({
            id: item.id,
            name: item.name,
            input: item.input,
          });
        }
      }
    }

    return {
      content: response.content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }, []);

  /**
   * Sends a user message to the backend chat completion endpoint.
   * Includes the current session ID in the 'X-Session-Id' header.
   * Handles responses, including potential tool calls and errors.
   */
  const sendMessage = useCallback(
    async (messageText: string) => {
      // Use sessionId state directly
      if (!sessionId) {
        console.error("Session ID not available yet. Cannot send message.");
        // Optionally show a toast or handle this case in the UI component
        return;
      }
      // API key check removed - handled server-side per session
      const trimmedMessage = messageText.trim();
      if (!trimmedMessage) {
        console.warn("Attempted to send an empty message.");
        return;
      }

      // Clear input immediately
      const textToSend = currentInputText; // Capture current input before clearing
      setCurrentInputText("");
      setIsLoading(true);

      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: [{ type: "text", text: textToSend }], // Ensure content is an array
        timestamp: new Date(),
      };

      // Determine the next state of messages using the ref for the most current state
      const nextMessages = [...messagesRef.current, userMessage];

      // Update the state *after* calculating the next state
      setMessages(nextMessages);

      try {
        // Prepare messages for API using the calculated next state (nextMessages)
        const apiMessages = nextMessages.map((msg) => ({
          role: msg.role,
          // Ensure content is always an array for the API
          content: Array.isArray(msg.content) ? msg.content : [msg.content],
        }));

        // Log the messages being sent to the backend API
        console.log("Sending messages to backend:", JSON.stringify(apiMessages, null, 2));

        const response = await fetch(
          // Use relative path '/' as fallback, relying on Nginx proxy
          `${API_BASE_URL}/api/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-Id": sessionId, // Use sessionId state
            },
            body: JSON.stringify({
              messages: apiMessages, // Send the calculated next state
              tools: true,
            }),
          }
        );

        if (!response.ok) {
          let errorData = { error: `Failed to send message (${response.status})` };
          try {
            errorData = await response.json();
          } catch (e) {
             console.warn("Could not parse error response JSON");
          }

          // Check for specific session errors
          if (response.status === 401 || (response.status === 400 && errorData.error?.includes("session"))) {
             clearSession(); // Clear the invalid session
             throw new Error(errorData.error || "Session invalid. Please refresh the page or try again.");
          }
          // Check for Anthropic specific errors passed through
          if (errorData.error?.includes("Anthropic API Error")) {
              console.error("Anthropic API Error received from backend:", errorData);
              throw new Error(errorData.error); // Throw the specific error message
          }
          throw new Error(errorData.error || `Failed to send message (${response.status})`);
        } else {
          const responseData = await response.json();
          const { content, toolCalls } = processAssistantResponse(responseData);

          const assistantMessage: Message = {
            id: uuidv4(),
            role: "assistant",
            content,
            timestamp: new Date(),
            toolCalls,
          };

          // Update messages state with the assistant's response
          // Use functional update here is fine as it's based on the previous state *after* user message was added
          setMessages((prevMessages) => [...prevMessages, assistantMessage]);
        }

      } catch (error) {
        console.error("Error sending message:", error);

        const errorMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: [{ // Ensure error content is also an array
            type: "text",
            text: `Error: ${
              error instanceof Error
                ? error.message
                : "Failed to communicate with the assistant"
            }`,
          }],
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [processAssistantResponse, sessionId, clearSession, currentInputText] // Removed messagesRef from deps, it's a ref
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Render children immediately; components consuming sessionId should handle the null state.

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        currentInputText, // Pass renamed state
        setCurrentInputText, // Pass renamed setter
        sendMessage,
        clearMessages,
        sessionId, // Pass sessionId state
        clearSession, // Pass clearSession function
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
