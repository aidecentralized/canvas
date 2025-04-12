import React, { useRef, useEffect } from "react";
import { Flex, Textarea, Button, Icon, useToast, Box, Tooltip } from "@chakra-ui/react"; // Import Tooltip
import { FaPaperPlane, FaSpinner } from "react-icons/fa";
import { useChatContext } from "../contexts/ChatContext";
import { useSettingsContext } from "../contexts/SettingsContext"; // Import useSettingsContext

const MessageInput: React.FC = () => {
  const {
    sendMessage,
    isLoading,
    currentInputText,
    setCurrentInputText,
    sessionId, // Get sessionId from context
  } = useChatContext();
  const { apiKey } = useSettingsContext(); // Get apiKey from SettingsContext
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  // Determine if input should be disabled
  const isApiKeyMissing = !apiKey;
  const isSessionMissing = !sessionId;
  const isDisabled = isLoading || isSessionMissing || isApiKeyMissing; // Simplified isDisabled logic

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [currentInputText]);

  const handleSubmit = () => {
    if (!currentInputText.trim()) return;

    // Check for session ID first
    if (!sessionId) {
        toast({
            title: "Session Not Ready",
            description: "Please wait for the session to initialize.",
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top",
        });
        return;
    }

    // Check for API key *before* calling sendMessage
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your Anthropic API key in the settings (gear icon).",
        status: "warning", // Changed to warning as it's a prerequisite
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      return; // Stop execution if API key is missing
    }

    // If checks pass, send the message
    sendMessage(currentInputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isDisabled) { // Also check isDisabled here
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentInputText(e.target.value);
  };

  return (
    <Box p={4} borderTopWidth="1px">
      <Flex align="center">
        <Textarea
          ref={textareaRef}
          value={currentInputText}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isSessionMissing
              ? "Initializing session..."
              : isApiKeyMissing
              ? "Please set your API key in settings..."
              : "Type your message..."
          }
          rows={1}
          resize="none"
          mr={2}
          isDisabled={isDisabled} // Use updated isDisabled
          overflowY="auto"
          sx={{
            "::-webkit-scrollbar": {
              width: "6px",
            },
            "::-webkit-scrollbar-thumb": {
              background: "gray.300",
              borderRadius: "3px",
            },
            "::-webkit-scrollbar-thumb:hover": {
              background: "gray.400",
            },
            "::-webkit-scrollbar-track": {
              background: "transparent",
            },
          }}
        />
        {/* Wrap Button with Tooltip */}
        <Tooltip
          label="Please set your API key in settings (gear icon)"
          placement="top"
          // Only show tooltip if disabled specifically due to missing API key
          isDisabled={!isDisabled || !isApiKeyMissing || isLoading || isSessionMissing}
          hasArrow
        >
          {/* Button needs to be wrapped for Tooltip to work when disabled */}
          <Box>
            <Button
              colorScheme="crimson"
              onClick={handleSubmit}
              isLoading={isLoading}
              // Disable based on overall isDisabled state OR if input is empty
              isDisabled={isDisabled || !currentInputText.trim()}
              aria-label="Send message"
              // Ensure pointer events are enabled even when disabled for Tooltip
              // pointerEvents={isDisabled ? 'none' : 'auto'} // This might interfere, let's test without first
            >
              {isLoading ? (
                <Icon as={FaSpinner} animation="spin 1s linear infinite" />
              ) : (
                <Icon as={FaPaperPlane} />
              )}
            </Button>
          </Box>
        </Tooltip>
      </Flex>
    </Box>
  );
};

export default MessageInput;
