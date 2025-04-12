"use client"
// client/src/contexts/ChatContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { mcpManager, useSettingsContext } from "./SettingsContext";
import { v4 as uuidv4 } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";

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
  sendMessage: async () => { },
  clearMessages: () => { },
});

export const useChatContext = () => useContext(ChatContext);

interface ChatProviderProps {
  children: React.ReactNode;
}

export class Chat {
  private anthropic: Anthropic | undefined;
  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true // Warning: setting this to allow Anthropic to run in browser, however this exposes apiKey.
    })
  }
  async getAvailableTools() {
    let availableTools = []
    const discoveredTools = await mcpManager.discoverTools();
    return availableTools = discoveredTools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      input_schema: tool.inputSchema
    }))
  }
  async getChatCompletion(messages: MessageParam[]) {
    const availableTools = await this.getAvailableTools()
    const completion = await this.anthropic!.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 10000,
      messages,
      tools: availableTools.length > 0 ? availableTools : undefined,
    });
    // process tool calls if present
    const finalMessages = [...messages];
    let finalResponse = completion;

    // Check if there are any tool calls in the response
    const toolUses = completion.content.filter((c) => c.type === "tool_use");

    if (toolUses.length > 0) {
      // Add the assistant's response with tool calls
      finalMessages.push({
        role: "assistant",
        content: completion.content,
      });

      // Process each tool call
      for (const toolUse of toolUses) {
        try {
          const result = await mcpManager.executeToolCall(
            toolUse.name,
            toolUse.input
          );

          // Add the tool result to the messages
          finalMessages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result.content.map((c: any) => {
                  if (c.type === "text") {
                    return {
                      type: "text",
                      text: c.text,
                    };
                  }
                  return c;
                }),
              },
            ],
          });
        } catch (error) {
          console.error(`Error executing tool ${toolUse.name}:`, error);

          // Add a tool error result
          finalMessages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: [
                  {
                    type: "text",
                    text: `Error executing tool: ${(error as any).message || "Unknown error"
                      }`,
                  },
                ],
              },
            ],
          });
        }
      }

      // Get a new completion with all the tool results
      finalResponse = await this.anthropic!.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 10000,
        messages: finalMessages,
      });
    }

    return finalResponse
  }
}





export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { apiKey } = useSettingsContext();
  const sessionId = useRef<string>(uuidv4());
  // const chat = useRef(new Chat(""))

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

        const chat = new Chat(apiKey)
        const res = await chat.getChatCompletion(apiMessages).catch(() => {
          throw new Error("Failed to send message");
        })


        // Process the response to extract tool calls
        const { content, toolCalls } = processAssistantResponse(res);

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
            text: `Error: ${error instanceof Error
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
