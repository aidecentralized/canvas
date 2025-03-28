import React, { useState, useRef, useEffect } from "react";
import {
  PaperAirplaneIcon,
  WrenchScrewdriverIcon,
  StopIcon,
} from "@heroicons/react/24/solid";
import { useChat } from "@/contexts/ChatContext";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
  showToolSelector: boolean;
  onToggleToolSelector: () => void;
  selectedToolCount: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  showToolSelector,
  onToggleToolSelector,
  selectedToolCount,
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isLoading } = useChat();

  // Auto-resize the textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      await onSendMessage(message);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative bg-white dark:bg-gray-800 rounded-lg shadow"
    >
      <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg relative">
        {/* Tools button */}
        <button
          type="button"
          onClick={onToggleToolSelector}
          className={`p-2 rounded-l-lg ${
            showToolSelector
              ? "bg-primary-50 text-primary-600 dark:bg-primary-900 dark:text-primary-300"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          title="Select tools"
        >
          <WrenchScrewdriverIcon className="h-5 w-5" />
          {selectedToolCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {selectedToolCount}
            </span>
          )}
        </button>

        {/* Text input area */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type a message..."
          className="flex-grow py-3 px-4 bg-transparent border-none focus:ring-0 resize-none max-h-48 h-12"
          rows={1}
        />

        {/* Submit or stop button */}
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className={`p-2 rounded-r-lg ${
            isLoading
              ? "bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-300"
              : disabled || !message.trim()
              ? "text-gray-400 cursor-not-allowed"
              : "bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900 dark:text-primary-300 dark:hover:bg-primary-800"
          }`}
          title={isLoading ? "Stop generation" : "Send message"}
        >
          {isLoading ? (
            <StopIcon className="h-5 w-5" />
          ) : (
            <PaperAirplaneIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
