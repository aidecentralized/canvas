// client/src/components/ChatInterface.tsx
import React, { useRef, useEffect } from "react";
import {
  Box,
  Flex,
  VStack,
  Text,
  useTheme,
  Icon,
  Button,
} from "@chakra-ui/react";
import { FaRobot, FaUser, FaTools } from "react-icons/fa";
import { useChatContext } from "../contexts/ChatContext";
import MessageInput from "./MessageInput";
import MessageContent from "./MessageContent";
import ToolCallDisplay from "./ToolCallDisplay";

const ChatInterface: React.FC = () => {
  const theme = useTheme();
  const { messages, isLoading } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <Box
      width="100%"
      maxWidth="1200px" // Increased max width for larger screens
      height="90vh" // Increased height to occupy more vertical space
      {...theme.glassmorphism.card}
      p={0}
      position="relative"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Chat header */}
      <Flex
        bg="rgba(0, 0, 0, 0.2)"
        p={4}
        borderBottom="1px solid rgba(255, 255, 255, 0.1)"
        align="center"
      >
        <Icon as={FaRobot} boxSize={5} mr={2} color="crimson.200" />
        <Text fontWeight="bold" fontSize="lg">
          MCP Chatbot
        </Text>
      </Flex>

      {/* Messages container */}
      <VStack
        flex="1"
        overflow="auto"
        spacing={4}
        p={4}
        align="stretch"
        css={{
          "&::-webkit-scrollbar": {
            width: "4px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(0, 0, 0, 0.1)",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "2px",
          },
        }}
      >
        {messages.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            height="100%"
            px={8}
            textAlign="center"
            color="whiteAlpha.700"
          >
            <Icon as={FaTools} boxSize={12} mb={4} color="crimson.300" />
            <Text fontSize="xl" fontWeight="bold" mb={2}>
              Welcome to MCP Chatbot
            </Text>
            <Text mb={4}>
              This chatbot uses the Model Context Protocol to enhance
              capabilities with tools. Ask me anything, and I'll try to help!
            </Text>
            <Box>
              <Text fontWeight="semibold" mb={2}>
                Try asking:
              </Text>
              <Button
                size="sm"
                variant="outline"
                mb={2}
                onClick={() => {
                  // Add example prompt handler
                }}
              >
                "What tools do you have available?"
              </Button>
            </Box>
          </Flex>
        ) : (
          messages.map((message, index) => (
            <Box
              key={index}
              alignSelf={message.role === "user" ? "flex-end" : "flex-start"}
              maxWidth="80%"
              bg={
                message.role === "user" ? "crimson.600" : "rgba(0, 0, 0, 0.3)"
              }
              color="white"
              p={3}
              borderRadius="lg"
              borderTopRightRadius={message.role === "user" ? "0" : "lg"}
              borderTopLeftRadius={message.role === "user" ? "lg" : "0"}
              wordBreak="break-word" // Ensures text wraps within the box
              boxShadow="md" // Adds a subtle shadow for better visibility
            >
              <Flex align="center" mb={2}>
                <Icon
                  as={message.role === "user" ? FaUser : FaRobot}
                  boxSize={4}
                  mr={2}
                  color={message.role === "user" ? "white" : "crimson.200"}
                />
                <Text fontWeight="bold" fontSize="sm">
                  {" "}
                  // Adjusted font size for better alignment
                  {message.role === "user" ? "You" : "Assistant"}
                </Text>
              </Flex>

              {/* Handle different content types */}
              <MessageContent content={message.content} />

              {/* Display tool calls if present */}
              {message.role === "assistant" &&
                message.toolCalls &&
                message.toolCalls.length > 0 && (
                  <Box mt={3}>
                    {message.toolCalls.map((toolCall, idx) => (
                      <ToolCallDisplay key={idx} toolCall={toolCall} />
                    ))}
                  </Box>
                )}
            </Box>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Box
            alignSelf="flex-start"
            maxWidth="80%"
            bg="rgba(0, 0, 0, 0.3)"
            color="white"
            p={3}
            borderRadius="lg"
            borderTopLeftRadius="0"
          >
            <Flex align="center" mb={2}>
              <Icon as={FaRobot} boxSize={4} mr={2} color="crimson.200" />
              <Text fontWeight="bold">Assistant</Text>
            </Flex>
            <Text>Thinking...</Text>
          </Box>
        )}

        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </VStack>

      {/* Input area */}
      <Box
        p={4}
        borderTop="1px solid rgba(255, 255, 255, 0.1)"
        bg="rgba(0, 0, 0, 0.2)"
      >
        <MessageInput />
      </Box>
    </Box>
  );
};

export default ChatInterface;
