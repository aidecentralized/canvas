// client/src/contexts/ChatContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
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
  const sessionId = useRef<string>(uuidv4());

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
      if (!apiKey) {
        console.error("API key not set");
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

        // Send request to our backend
        const response = await fetch(
          `${
            process.env.REACT_APP_API_BASE_URL || "http://localhost:3000"
          }/api/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": apiKey,
              "X-Session-Id": sessionId.current,
            },
            body: JSON.stringify({
              messages: apiMessages,
              tools: true,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        const responseData = await response.json();
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
    [apiKey, messages, processAssistantResponse]
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
