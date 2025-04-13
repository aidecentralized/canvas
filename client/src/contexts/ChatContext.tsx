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

// Fix for undefined environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'server-selection' | 'tool-execution' | 'error' | 'info';
  message: string;
  details?: any;
}

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
  activityLogs: LogEntry[];
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearLogs: () => void;
  addLogEntry: (type: LogEntry['type'], message: string, details?: any) => void;
}

const ChatContext = createContext<ChatContextProps>({
  messages: [],
  isLoading: false,
  activityLogs: [],
  sendMessage: async () => {},
  clearMessages: () => {},
  clearLogs: () => {},
  addLogEntry: () => {},
});

export const useChatContext = () => useContext(ChatContext);

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activityLogs, setActivityLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { apiKey } = useSettingsContext();
  const settingsContext = useSettingsContext();
  const fallbackSessionId = useRef<string>(uuidv4());
  
  // Get the session ID - use from settings context if available, fallback if not
  const getSessionId = useCallback(() => {
    return settingsContext.sessionId || fallbackSessionId.current;
  }, [settingsContext.sessionId]);

  // Add log entry
  const addLogEntry = useCallback((type: LogEntry['type'], message: string, details?: any) => {
    const newEntry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      type,
      message,
      details,
    };
    
    setActivityLogs(prevLogs => [...prevLogs, newEntry]);
  }, []);

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
          
          // Log tool usage
          addLogEntry('tool-execution', `Tool selected: ${item.name}`, {
            toolId: item.id,
            toolName: item.name,
            inputSummary: JSON.stringify(item.input).substring(0, 100) + (JSON.stringify(item.input).length > 100 ? '...' : '')
          });
        }
      }
    }

    // Log MCP server information if available
    if (response.serverInfo) {
      addLogEntry('server-selection', `MCP Server: ${response.serverInfo.id || 'Unknown'}`, response.serverInfo);
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
  }, [addLogEntry]);

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
        
        addLogEntry('error', 'Missing API key', { requiredSetting: 'API Key' });
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
        return;
      }

      setIsLoading(true);
      addLogEntry('info', 'Processing message', { messageText: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : '') });

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

        console.log(`Sending message to ${API_BASE_URL}/api/chat/completions with session ID: ${getSessionId()}`);
        addLogEntry('info', 'Sending request to API', { 
          endpoint: `${API_BASE_URL}/api/chat/completions`,
          sessionId: getSessionId()
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
            body: JSON.stringify({
              messages: apiMessages,
              tools: true,
            }),
          }
        );

        // Check the content type before trying to parse JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // Handle non-JSON response (like HTML error pages)
          const text = await response.text();
          console.error("Received non-JSON response:", text.substring(0, 200) + "...");
          addLogEntry('error', 'Invalid response format', { 
            contentType,
            statusCode: response.status,
            previewText: text.substring(0, 100) + '...'
          });
          throw new Error(`Invalid response from server: Not JSON (${response.status} ${response.statusText})`);
        }

        if (!response.ok) {
          const errorData = await response.json();
          addLogEntry('error', `Server error: ${response.status}`, errorData);
          throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        addLogEntry('info', 'Response received', { 
          statusCode: response.status,
          hasTools: responseData.content?.some((item: any) => item.type === 'tool_use') || false,
          serverInfo: responseData.serverInfo || 'Not provided'
        });

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
        addLogEntry('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { error });

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
    [apiKey, messages, processAssistantResponse, getSessionId, addLogEntry]
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setActivityLogs([]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        activityLogs,
        sendMessage,
        clearMessages,
        clearLogs,
        addLogEntry,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
