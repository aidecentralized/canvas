import React from "react";
import { ChatMessage as ChatMessageType } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import { UserIcon, CommandLineIcon } from "@heroicons/react/24/solid";

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLoading = false,
}) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // Format the timestamp
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"} ${
        isSystem ? "opacity-75" : ""
      }`}
    >
      {/* Avatar and content container */}
      <div
        className={`flex gap-3 max-w-3xl ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
            isUser
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
              : isSystem
              ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              : "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300"
          }`}
        >
          {isUser ? (
            <UserIcon className="h-5 w-5" />
          ) : (
            <CommandLineIcon className="h-5 w-5" />
          )}
        </div>

        {/* Message content */}
        <div className="flex flex-col">
          {/* Message bubble */}
          <div
            className={`px-4 py-2 rounded-lg ${
              isUser
                ? "bg-primary-500 text-white dark:bg-primary-600"
                : isSystem
                ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 italic"
                : "bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
            } ${isLoading ? "animate-pulse" : ""}`}
          >
            {/* Render markdown for assistant messages, plain text for user messages */}
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <ReactMarkdown
                className="markdown prose dark:prose-invert prose-sm max-w-none"
                components={{
                  // Style code blocks
                  code: (props: any) => {
                    const { node, inline, className, children, ...rest } =
                      props;
                    const match = /language-(\w+)/.exec(className || "");
                    if (!inline && match) {
                      return (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-md my-2 overflow-hidden">
                          <div className="flex justify-between px-4 py-1 bg-gray-100 dark:bg-gray-800 text-xs">
                            <span>{match[1]}</span>
                          </div>
                          <pre className="p-4 overflow-x-auto">
                            <code className={className} {...rest}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <code
                        className={`${className} bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm`}
                        {...rest}
                      >
                        {children}
                      </code>
                    );
                  },
                  // Style tables
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className="border-collapse border border-gray-300 dark:border-gray-700 my-4">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 bg-gray-100 dark:bg-gray-800">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      {children}
                    </td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Timestamp */}
          <div
            className={`text-xs text-gray-500 mt-1 ${
              isUser ? "text-right" : "text-left"
            }`}
          >
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
