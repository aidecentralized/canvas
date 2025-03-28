import React, { useEffect, useRef } from "react";
import { useChat } from "@/contexts/ChatContext";
import ChatMessage from "./ChatMessage";

interface ChatThreadProps {
  threadId: string;
}

const ChatThread: React.FC<ChatThreadProps> = ({ threadId }) => {
  const { threads, isLoading } = useChat();
  const endRef = useRef<HTMLDivElement>(null);

  // Find the thread
  const thread = threads.find((t) => t.id === threadId);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [thread?.messages]);

  if (!thread) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Thread not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {thread.messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <h3 className="text-xl font-medium mb-2">Start a new conversation</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
            Ask a question or provide a task. The AI can access various tools to
            help you.
          </p>
        </div>
      ) : (
        thread.messages.map((message, index) => {
          // Find any tool calls that happened after this message if it's an assistant message
          const associatedToolCalls =
            message.role === "assistant" && index < thread.messages.length - 1
              ? thread.toolCalls.filter(
                  (tc) => tc.result !== undefined || tc.error !== undefined
                )
              : [];

          return (
            <div key={message.id}>
              <ChatMessage
                message={message}
                isLoading={
                  isLoading &&
                  index === thread.messages.length - 1 &&
                  message.role === "assistant"
                }
              />

              {/* Render tool call results if any */}
              {associatedToolCalls.length > 0 && (
                <div className="ml-12 mt-2 space-y-2">
                  {associatedToolCalls.map((toolCall, tcIndex) => (
                    <div
                      key={`${message.id}-tool-${tcIndex}`}
                      className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm"
                    >
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Tool: {toolCall.toolName}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span className="font-mono">
                          {JSON.stringify(toolCall.args, null, 2)}
                        </span>
                      </div>

                      {toolCall.error ? (
                        <div className="text-red-500 dark:text-red-400 text-sm">
                          Error: {toolCall.error}
                        </div>
                      ) : (
                        <div className="text-sm">
                          <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded">
                            {typeof toolCall.result === "string"
                              ? toolCall.result
                              : JSON.stringify(toolCall.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Add loading indicator if messages are being processed */}
      {isLoading &&
        thread.messages.length > 0 &&
        thread.messages[thread.messages.length - 1].role === "user" && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="animate-pulse flex space-x-1">
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
            </div>
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}

      {/* Invisible element to scroll to */}
      <div ref={endRef} />
    </div>
  );
};

export default ChatThread;
