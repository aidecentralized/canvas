import React, { createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  ChatContextType,
  ChatThread,
  ChatMessage,
  MessageRole,
  MCPTool,
  ToolCall,
} from "@/types/chat";
import { streamChatWithClaude } from "@/api/anthropic";
import { streamChatWithOpenAI } from "@/api/openai";
import { useMCP } from "@/contexts/MCPContext";

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { callTool } = useMCP();

  // Load threads from localStorage on initial render
  useEffect(() => {
    const savedThreads = localStorage.getItem("chat-threads");
    const savedCurrentThreadId = localStorage.getItem("current-thread-id");

    if (savedThreads) {
      try {
        const parsedThreads: ChatThread[] = JSON.parse(savedThreads);
        // Convert date strings back to Date objects
        const threadsWithDates = parsedThreads.map((thread) => ({
          ...thread,
          createdAt: new Date(thread.createdAt),
          updatedAt: new Date(thread.updatedAt),
          messages: thread.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
        setThreads(threadsWithDates);
      } catch (err) {
        console.error("Error parsing saved threads:", err);
      }
    }

    if (savedCurrentThreadId) {
      setCurrentThreadId(savedCurrentThreadId);
    }
  }, []);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("chat-threads", JSON.stringify(threads));
  }, [threads]);

  // Save current thread ID to localStorage
  useEffect(() => {
    if (currentThreadId) {
      localStorage.setItem("current-thread-id", currentThreadId);
    }
  }, [currentThreadId]);

  const createThread = (): string => {
    const newThreadId = uuidv4();
    const now = new Date();

    const newThread: ChatThread = {
      id: newThreadId,
      title: "New Conversation",
      messages: [],
      toolCalls: [],
      createdAt: now,
      updatedAt: now,
      model:
        import.meta.env.VITE_DEFAULT_ANTHROPIC_MODEL ||
        "claude-3-5-sonnet-20241022",
      provider: "anthropic",
    };

    setThreads((prev) => [...prev, newThread]);
    setCurrentThreadId(newThreadId);

    return newThreadId;
  };

  const setCurrentThread = (threadId: string) => {
    setCurrentThreadId(threadId);
  };

  const addMessage = (threadId: string, role: MessageRole, content: string) => {
    const messageId = uuidv4();
    const now = new Date();

    const newMessage: ChatMessage = {
      id: messageId,
      role,
      content,
      timestamp: now,
    };

    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          return {
            ...thread,
            messages: [...thread.messages, newMessage],
            updatedAt: now,
            // If this is the first user message, set the title to a truncated version of it
            title:
              thread.messages.length === 0 && role === "user"
                ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
                : thread.title,
          };
        }
        return thread;
      })
    );

    return messageId;
  };

  const updateMessage = (
    threadId: string,
    messageId: string,
    content: string
  ) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          return {
            ...thread,
            messages: thread.messages.map((message) => {
              if (message.id === messageId) {
                return {
                  ...message,
                  content,
                };
              }
              return message;
            }),
            updatedAt: new Date(),
          };
        }
        return thread;
      })
    );
  };

  const addToolCall = (threadId: string, toolCall: ToolCall) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          return {
            ...thread,
            toolCalls: [...thread.toolCalls, toolCall],
            updatedAt: new Date(),
          };
        }
        return thread;
      })
    );
  };

  const updateToolCallResult = (
    threadId: string,
    index: number,
    result: unknown,
    error?: string
  ) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          const updatedToolCalls = [...thread.toolCalls];
          if (updatedToolCalls[index]) {
            updatedToolCalls[index] = {
              ...updatedToolCalls[index],
              result,
              error,
            };
          }

          return {
            ...thread,
            toolCalls: updatedToolCalls,
            updatedAt: new Date(),
          };
        }
        return thread;
      })
    );
  };

  const processChatResponse = async (
    threadId: string,
    response: {
      content: string;
      toolCalls: ToolCall[];
    }
  ) => {
    // Process tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (let i = 0; i < response.toolCalls.length; i++) {
        const toolCall = response.toolCalls[i];
        addToolCall(threadId, toolCall);

        try {
          // Execute the tool call
          const result = await callTool(
            toolCall.serverId,
            toolCall.toolName,
            toolCall.args
          );

          // Update with result
          updateToolCallResult(threadId, i, result);
        } catch (error) {
          console.error(`Error executing tool call:`, error);
          updateToolCallResult(
            threadId,
            i,
            null,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }
  };

  const sendMessage = async (content: string, tools: MCPTool[] = []) => {
    if (!currentThreadId) {
      // Create a new thread if none exists
      const newThreadId = createThread();
      setCurrentThreadId(newThreadId);
      await sendMessageToThread(newThreadId, content, tools);
    } else {
      await sendMessageToThread(currentThreadId, content, tools);
    }
  };

  const sendMessageToThread = async (
    threadId: string,
    content: string,
    tools: MCPTool[] = []
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Add user message to thread
      addMessage(threadId, "user", content);

      const thread = threads.find((t) => t.id === threadId);
      if (!thread) throw new Error(`Thread with ID ${threadId} not found`);

      // Get all messages from the thread
      const messages = thread.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        id: msg.id,
        timestamp: msg.timestamp,
      }));

      // Add the new user message
      messages.push({
        role: "user" as const,
        content,
        id: uuidv4(),
        timestamp: new Date(),
      });

      // Use different APIs based on the provider set for the thread
      if (thread.provider === "anthropic") {
        // Create a placeholder message for streaming updates
        const placeholderId = addMessage(threadId, "assistant", "");

        // Use streaming API for better UX
        const response = await streamChatWithClaude(
          messages,
          tools,
          thread.model,
          0.7,
          4000,
          (partialResponse) => {
            // Update the placeholder message with streamed content
            updateMessage(threadId, placeholderId, partialResponse);
          }
        );

        // Update the placeholder with final content
        updateMessage(threadId, placeholderId, response.content);

        // Process any tool calls
        if (response.toolCalls.length > 0) {
          await processChatResponse(threadId, response);
        }
      } else if (thread.provider === "openai") {
        // Create a placeholder message for streaming updates
        const placeholderId = addMessage(threadId, "assistant", "");

        // Use streaming API for better UX
        const response = await streamChatWithOpenAI(
          messages,
          tools,
          thread.model,
          0.7,
          4000,
          (partialResponse) => {
            // Update the placeholder message with streamed content
            updateMessage(threadId, placeholderId, partialResponse);
          }
        );

        // Update the placeholder with final content
        updateMessage(threadId, placeholderId, response.content);

        // Process any tool calls
        if (response.toolCalls.length > 0) {
          await processChatResponse(threadId, response);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);

      // Add error message to the thread
      addMessage(
        threadId,
        "assistant",
        `I'm sorry, something went wrong with processing your message. Error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  const clearThread = (threadId: string) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          return {
            ...thread,
            messages: [],
            toolCalls: [],
            updatedAt: new Date(),
          };
        }
        return thread;
      })
    );
  };

  const deleteThread = (threadId: string) => {
    setThreads((prev) => prev.filter((thread) => thread.id !== threadId));

    // If the deleted thread was the current one, set current to null
    if (currentThreadId === threadId) {
      setCurrentThreadId(null);
    }
  };

  const renameThread = (threadId: string, title: string) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          return {
            ...thread,
            title,
            updatedAt: new Date(),
          };
        }
        return thread;
      })
    );
  };

  const value: ChatContextType = {
    threads,
    currentThreadId,
    isLoading,
    error,
    createThread,
    setCurrentThread,
    addMessage,
    updateMessage,
    sendMessage,
    clearThread,
    deleteThread,
    renameThread,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to use the Chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
