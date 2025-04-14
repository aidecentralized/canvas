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
  Badge,
  Tooltip,
  Divider,
  Image,
} from "@chakra-ui/react";
import { FaRobot, FaUser, FaTools, FaRegLightbulb } from "react-icons/fa";
import { useChatContext } from "../contexts/ChatContext";
import { useSettingsContext } from "../contexts/SettingsContext";
import MessageInput from "./MessageInput";
import MessageContent from "./MessageContent";
import ToolCallDisplay from "./ToolCallDisplay";
import ActivityLog from "./ActivityLog";

const ChatInterface: React.FC = () => {
  const theme = useTheme();
  const { messages, isLoading } = useChatContext();
  const settingsContext = useSettingsContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Log the session ID to help debug
  useEffect(() => {
    console.log("ChatInterface using session ID:", settingsContext.sessionId);
  }, [settingsContext.sessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getMessageGradient = (isUser: boolean) => {
    return isUser 
      ? "linear-gradient(135deg, var(--chakra-colors-primary-500) 0%, var(--chakra-colors-primary-600) 100%)" 
      : "linear-gradient(135deg, var(--chakra-colors-dark-200) 0%, var(--chakra-colors-dark-300) 100%)";
  };

  return (
    <Box
      width="100%"
      maxWidth="1200px"
      height="80vh"
      {...theme.glassmorphism.card}
      p={0}
      position="relative"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)"
    >
      {/* Chat header */}
      <Flex
        bg="linear-gradient(90deg, var(--chakra-colors-dark-300) 0%, var(--chakra-colors-dark-400) 100%)"
        p={4}
        borderBottom="1px solid rgba(255, 255, 255, 0.08)"
        align="center"
        justify="space-between"
      >
        <Flex align="center">
          <Image 
            src="/NANDA.png" 
            alt="NANDA Logo" 
            boxSize="32px" 
            mr={3}
            display="inline-block"
            verticalAlign="middle"
          />
          <Text 
            fontWeight="bold" 
            fontSize="lg"
            lineHeight="32px"
            display="inline-flex"
            alignItems="center"
          >
            NANDA Chat Interface
          </Text>
        </Flex>
      </Flex>

      <Flex direction="row" flex="1" overflow="hidden">
        {/* Messages container */}
        <VStack
          flex="1"
          overflow="auto"
          spacing={4}
          p={4}
          align="stretch"
          bg="linear-gradient(135deg, var(--chakra-colors-dark-300) 0%, var(--chakra-colors-dark-400) 100%)"
          css={{
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "rgba(0, 0, 0, 0.1)",
              borderRadius: "3px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: "3px",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.25)",
              },
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
              color="whiteAlpha.800"
            >
              <Icon 
                as={FaTools} 
                boxSize={16} 
                color="primary.400" 
                mb={6}
              />
              <Text fontSize="2xl" fontWeight="bold" mb={3} bgGradient="linear(to-r, primary.300, secondary.300)" bgClip="text">
                Welcome to NANDA Chat Interface
              </Text>
              <Text mb={6} maxW="md" lineHeight="tall">
                This AI uses the NANDA Protocol to enhance capabilities with
                tools. Ask me anything, and I'll try to help by using my
                intelligence and other tools and knowledge.
              </Text>
            </Flex>
          ) : (
            messages
              .filter(message => !message.isIntermediate)
              .map((message, index) => (
              <Box
                key={index}
                alignSelf={message.role === "user" ? "flex-end" : "flex-start"}
                maxWidth="80%"
                bg={getMessageGradient(message.role === "user")}
                color="white"
                p={4}
                borderRadius="2xl"
                borderTopRightRadius={message.role === "user" ? "0" : "2xl"}
                borderTopLeftRadius={message.role === "user" ? "2xl" : "0"}
                boxShadow="0 3px 10px rgba(0, 0, 0, 0.1)"
                position="relative"
                _after={message.role === "user" ? {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  right: "-12px",
                  width: 0,
                  height: 0,
                  borderTop: "12px solid var(--chakra-colors-primary-500)",
                  borderRight: "12px solid transparent",
                } : {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: "-12px",
                  width: 0,
                  height: 0,
                  borderTop: "12px solid var(--chakra-colors-dark-200)",
                  borderLeft: "12px solid transparent",
                }}
              >
                <Flex align="center" mb={2}>
                  <Tooltip 
                    label={message.role === "user" ? "You" : "Assistant"} 
                    placement="top" 
                    hasArrow
                  >
                    <Flex
                      align="center"
                      justify="center"
                      boxSize="24px"
                      mr={2}
                    >
                      {message.role === "user" ? (
                        <Icon as={FaUser} boxSize={3} color="primary.500" />
                      ) : (
                        <Image 
                          src="/NANDA.png" 
                          alt="NANDA Logo" 
                          boxSize="18px"
                          display="inline-block"
                          verticalAlign="middle"
                        />
                      )}
                    </Flex>
                  </Tooltip>
                  <Text fontWeight="bold" fontSize="sm">
                    {message.role === "user" ? "You" : "Assistant"}
                  </Text>
                  <Text ml={2} fontSize="xs" color={message.role === "user" ? "whiteAlpha.800" : "whiteAlpha.700"}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              bg="linear-gradient(135deg, var(--chakra-colors-dark-200) 0%, var(--chakra-colors-dark-300) 100%)"
              color="white"
              p={4}
              borderRadius="2xl"
              borderTopLeftRadius="0"
              boxShadow="0 3px 10px rgba(0, 0, 0, 0.1)"
              position="relative"
              _after={{
                content: '""',
                position: "absolute",
                top: 0,
                left: "-12px",
                width: 0,
                height: 0,
                borderTop: "12px solid var(--chakra-colors-dark-200)",
                borderLeft: "12px solid transparent",
              }}
            >
              <Flex align="center" mb={2}>
                <Flex
                  align="center"
                  justify="center"
                  boxSize="24px"
                  mr={2}
                >
                  <Image 
                    src="/NANDA.png" 
                    alt="NANDA Logo" 
                    boxSize="18px"
                    display="inline-block"
                    verticalAlign="middle"
                  />
                </Flex>
                <Text fontWeight="bold">Assistant</Text>
              </Flex>
              <Flex align="center">
                <Box
                  className="typing-indicator"
                  height="8px"
                  width="8px"
                  borderRadius="full"
                  bg="primary.400"
                  mr="3px"
                  animation="pulse 1s infinite"
                />
                <Box
                  className="typing-indicator"
                  height="8px"
                  width="8px"
                  borderRadius="full"
                  bg="primary.400"
                  mr="3px"
                  animation="pulse 1s infinite 0.2s"
                />
                <Box
                  className="typing-indicator"
                  height="8px"
                  width="8px"
                  borderRadius="full"
                  bg="primary.400"
                  animation="pulse 1s infinite 0.4s"
                />
                <style>
                  {`
                  @keyframes pulse {
                    0% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                    100% { opacity: 0.3; transform: scale(0.8); }
                  }
                  `}
                </style>
                <Text ml={3}>Thinking...</Text>
              </Flex>
            </Box>
          )}

          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </VStack>

        {/* Activity Log Panel */}
        <Box width="300px" bg="#25201F" p={2} borderLeft="1px solid" borderColor="#583030">
          <ActivityLog />
        </Box>
      </Flex>

      {/* Input area */}
      <Box
        p={4}
        borderTop="1px solid rgba(255, 255, 255, 0.08)"
        bg="linear-gradient(180deg, var(--chakra-colors-dark-300) 0%, var(--chakra-colors-dark-400) 100%)"
      >
        <MessageInput />
      </Box>
    </Box>
  );
};

export default ChatInterface;
