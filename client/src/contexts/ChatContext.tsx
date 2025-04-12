// client/src/contexts/ChatContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect, // Import useEffect
  useRef, // Import useRef
} from "react";
import { useSettingsContext } from "./SettingsContext";
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
  currentInputText: string; // Renamed from inputMessage
  setCurrentInputText: (text: string) => void; // Renamed from setInputMessage
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  sessionId: string | null; // Expose sessionId for potential debugging/use
  clearSession: () => void; // Add clearSession function signature
}

const ChatContext = createContext<ChatContextProps>({
  messages: [],
  isLoading: false,
  currentInputText: "", // Renamed from inputMessage
  setCurrentInputText: () => {}, // Renamed from setInputMessage
  sendMessage: async () => {},
  clearMessages: () => {},
  sessionId: null, // Initialize sessionId as null
  clearSession: () => {}, // Add clearSession to default context value
});

export const useChatContext = () => useContext(ChatContext);

interface ChatProviderProps {
  children: React.ReactNode;
}

const SESSION_ID_STORAGE_KEY = "sessionId"; // Define key for localStorage

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInputText, setCurrentInputText] = useState(""); // Renamed state and setter
  const { apiKey } = useSettingsContext();
  // Use state for sessionId
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Ref to hold the latest messages state for use in sendMessage
  const messagesRef = useRef<Message[]>(messages);

  // Keep the ref updated whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Function to clear session state and storage
  const clearSession = useCallback(() => {
    console.error("Session invalid or expired. Clearing local session.");
    localStorage.removeItem(SESSION_ID_STORAGE_KEY);
    setSessionId(null); // Clear session state
    // Optionally: Add a toast notification here to inform the user
  }, []);

  // Effect to fetch/create session ID on mount
  useEffect(() => {
    const initializeSession = async () => {
      // Prevent re-initialization if sessionId is already set
      if (sessionId) return;

      let currentSessionId = localStorage.getItem(SESSION_ID_STORAGE_KEY);

      if (!currentSessionId) {
        console.log("No session ID found in localStorage, creating new session...");
        try {
          const response = await fetch(
            // Use relative path '/' as fallback, relying on Nginx proxy
            `${process.env.REACT_APP_API_BASE_URL || ""}/api/session`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          if (!response.ok) {
            console.error("Failed to create session:", response.status, response.statusText); // Log error details
            throw new Error(`Failed to create session: ${response.statusText}`);
          }
          const data = await response.json();
          currentSessionId = data.sessionId;
          if (currentSessionId) {
            localStorage.setItem(SESSION_ID_STORAGE_KEY, currentSessionId);
            console.log("New session created and stored:", currentSessionId);
          } else {
            console.error("Server did not return a session ID."); // Log missing ID
            // Handle error appropriately - maybe show a message to the user
            // ...
          }
        } catch (error) {
          console.error("Error creating session:", error); // Log network or other errors
          // Handle error appropriately
          // ...
        }
      } else {
        console.log("Found session ID in localStorage:", currentSessionId); // Log existing ID
      }

      if (currentSessionId) {
        setSessionId(currentSessionId);
        console.log("Session ID set in context:", currentSessionId); // Confirm context update
      }
    };

    initializeSession();
  }, [sessionId]); // Keep sessionId dependency to prevent re-running if already set

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

  // Send a message to the assistant
  const sendMessage = useCallback(
    async (messageText: string) => {
      // Use sessionId state directly
      if (!sessionId) {
        console.error("Session ID not available yet. Cannot send message.");
        // Optionally show a toast or handle this case in the UI component
        return;
      }
      // Remove API key check here - it's now handled in MessageInput.tsx
      // if (!apiKey) {
      //   console.error("API key not set");
      //   return;
      // }
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
          `${process.env.REACT_APP_API_BASE_URL || ""}/api/chat/completions`,
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

  // Render children immediately, but UI elements relying on sessionId should handle null state
  // if (!sessionId) {
  //     // Optionally return a loading indicator, but better to handle in consuming components
  //     return <div>Loading session...</div>;
  // }

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
