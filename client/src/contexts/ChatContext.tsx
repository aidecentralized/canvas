// client/src/contexts/ChatContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useSettingsContext } from "./SettingsContext";
import { useLoggingContext } from "./LoggingContext";
import { v4 as uuidv4 } from "uuid";

// Fix for undefined environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

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
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextProps>({
  messages: [],
  isLoading: false,
  sendMessage: async () => {},
  clearMessages: () => {},
});

export const useChatContext = () => useContext(ChatContext);

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { apiKey } = useSettingsContext();
  const settingsContext = useSettingsContext();
  const fallbackSessionId = useRef<string>(uuidv4());
  
  // Get access to the logging context
  const { logToolCall, logRequest, logResponse } = useLoggingContext();
  
  // Get the session ID - use from settings context if available, fallback if not
  const getSessionId = useCallback(() => {
    return settingsContext.sessionId || fallbackSessionId.current;
  }, [settingsContext.sessionId]);

  // Watch for tool results and log them
  useEffect(() => {
    // Find the latest message that has tool calls
    const lastMessageWithTools = [...messages].reverse().find(
      (msg) => msg.toolCalls && msg.toolCalls.length > 0
    );

    // If we have a message with tools, check for new results to log
    if (lastMessageWithTools?.toolCalls) {
      lastMessageWithTools.toolCalls.forEach((toolCall) => {
        // Only log if there's a result and we haven't logged it already
        if (toolCall.result) {
          // Log the tool result
          logResponse({
            toolName: toolCall.name,
            toolId: toolCall.id,
            result: toolCall.result.content,
          }, toolCall.result.isError);
        }
      });
    }
  }, [messages, logResponse]);

  // Process assistant response to extract tool calls
  const processAssistantResponse = useCallback((response: any) => {
    console.log("Raw response from API:", response);
    
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
          
          // Log tool call to the logging panel
          logToolCall(item.name, item.input);
        }
      }
    }

    // If the content isn't already an array, convert it to one
    const processedContent = Array.isArray(response.content) 
      ? response.content 
      : [{ type: "text", text: typeof response.content === "string" 
            ? response.content 
            : "Response received in unexpected format" }];

    return {
      content: processedContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }, [logToolCall]);

  // Send a message to the assistant
  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!apiKey) {
        console.error("API key not set");
        // Add error message about missing API key
        const errorMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: {
            type: "text",
            text: "Error: Please set your Anthropic API key in the settings (gear icon) before sending messages."
          },
          timestamp: new Date(),
        };
        
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
        return;
      }

      setIsLoading(true);

      try {
        // Add user message
        const userMessage: Message = {
          id: uuidv4(),
          role: "user",
          content: { type: "text", text: messageText },
          timestamp: new Date(),
        };

        setMessages((prevMessages) => [...prevMessages, userMessage]);

        // Prepare messages for API
        const apiMessages = [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: Array.isArray(msg.content) ? msg.content : [msg.content],
        }));

        // Prepare the request body
        const requestBody = {
          messages: apiMessages,
          tools: true,
        };
        
        console.log(`Sending message to ${API_BASE_URL}/api/chat/completions with session ID: ${getSessionId()}`);
        
        // Log the request to the logging panel
        logRequest({
          endpoint: `${API_BASE_URL}/api/chat/completions`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": "***REDACTED***", // Don't log actual API key
            "X-Session-Id": getSessionId(),
          },
          body: requestBody,
        });
        
        // Send request to our backend
        const response = await fetch(
          `${API_BASE_URL}/api/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": apiKey,
              "X-Session-Id": getSessionId(),
            },
            body: JSON.stringify(requestBody),
          }
        );

        // Check the content type before trying to parse JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // Handle non-JSON response (like HTML error pages)
          const text = await response.text();
          console.error("Received non-JSON response:", text.substring(0, 200) + "...");
          
          // Log the error response
          logResponse({
            error: "Invalid response format (not JSON)",
            status: response.status,
            statusText: response.statusText,
            preview: text.substring(0, 200) + "...",
          }, true);
          
          throw new Error(`Invalid response from server: Not JSON (${response.status} ${response.statusText})`);
        }

        if (!response.ok) {
          const errorData = await response.json();
          
          // Log the error response
          logResponse({
            error: errorData.error || `Server error: ${response.status} ${response.statusText}`,
            status: response.status,
            statusText: response.statusText,
          }, true);
          
          throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        
        // Log the successful response
        logResponse(responseData);

        // Process the response to extract tool calls
        const { content, toolCalls } = processAssistantResponse(responseData);

        // Add assistant message
        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content,
          timestamp: new Date(),
          toolCalls,
        };

        setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      } catch (error) {
        console.error("Error sending message:", error);

        // Add error message
        const errorMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: {
            type: "text",
            text: `Error: ${
              error instanceof Error
                ? error.message
                : "Failed to communicate with the assistant"
            }`,
          },
          timestamp: new Date(),
        };

        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, messages, processAssistantResponse, getSessionId, logRequest, logResponse]
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        sendMessage,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
