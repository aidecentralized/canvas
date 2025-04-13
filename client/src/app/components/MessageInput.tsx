// client/src/components/MessageInput.tsx
import React, { useState, useRef } from "react";
import {
  Textarea,
  Button,
  useToast,
  Flex,
  Icon,
} from "@chakra-ui/react";
import { FaPaperPlane, FaSpinner } from "react-icons/fa";
import { useChatContext } from "../contexts/ChatContext";
import { useSettingsContext } from "../contexts/SettingsContext";

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState("");
  const { sendMessage, isLoading } = useChatContext();
  const { apiKey } = useSettingsContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  const handleSubmit = () => {
    if (!message.trim()) return;

    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your Anthropic API key in the settings.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    sendMessage(message);
    setMessage("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <Flex>
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        resize="none"
        rows={1}
        mr={2}
        flexGrow={1}
        disabled={isLoading}
        maxLength={3000}
        sx={{
          "&::-webkit-scrollbar": {
            width: "8px",
            borderRadius: "8px",
            backgroundColor: `rgba(255, 255, 255, 0.05)`,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: `rgba(255, 255, 255, 0.1)`,
            borderRadius: "8px",
          },
        }}
      />
      <Button
        colorScheme="crimson"
        onClick={handleSubmit}
        isDisabled={!message.trim() || isLoading}
        height="auto"
        alignSelf="stretch"
      >
        {isLoading ? (
          <Icon as={FaSpinner} className="spin" />
        ) : (
          <Icon as={FaPaperPlane} />
        )}
      </Button>
    </Flex>
  );
};

export default MessageInput;
