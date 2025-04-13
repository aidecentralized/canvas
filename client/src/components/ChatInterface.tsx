import React, { useRef, useEffect } from "react";
import {
  Box,
  Flex,
  VStack,
  Text,
  useTheme,
  Icon,
  Button,
  useColorModeValue, // Import useColorModeValue
} from "@chakra-ui/react";
import { FaRobot, FaUser, FaTools } from "react-icons/fa";
import { useChatContext } from "../contexts/ChatContext";
import MessageInput from "./MessageInput";
import MessageContent from "./MessageContent";
import ToolCallDisplay from "./ToolCallDisplay";

const ChatInterface: React.FC = () => {
  const theme = useTheme();
  const { messages, isLoading, setCurrentInputText } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Define colors based on theme mode
  const headerBg = useColorModeValue("rgba(255, 255, 255, 0.3)", "rgba(0, 0, 0, 0.2)");
  const headerBorder = useColorModeValue("rgba(0, 0, 0, 0.1)", "rgba(255, 255, 255, 0.1)");
  const assistantMsgBg = useColorModeValue("gray.100", "rgba(0, 0, 0, 0.3)");
  const userMsgBg = useColorModeValue("crimson.500", "crimson.600"); // Adjusted for better light mode contrast
  const inputAreaBg = useColorModeValue("rgba(255, 255, 255, 0.3)", "rgba(0, 0, 0, 0.2)");
  const inputAreaBorder = useColorModeValue("rgba(0, 0, 0, 0.1)", "rgba(255, 255, 255, 0.1)");
  const scrollbarTrackBg = useColorModeValue("rgba(0, 0, 0, 0.05)", "rgba(0, 0, 0, 0.1)");
  const scrollbarThumbBg = useColorModeValue("rgba(0, 0, 0, 0.2)", "rgba(255, 255, 255, 0.2)");
  const emptyChatColor = useColorModeValue("gray.600", "whiteAlpha.700");
  const interfaceBg = useColorModeValue("rgba(255, 255, 255, 0.6)", "rgba(26, 32, 44, 0.7)"); // Use theme values
  const interfaceBorder = useColorModeValue("rgba(0, 0, 0, 0.1)", "rgba(255, 255, 255, 0.18)"); // Use theme values

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
      height="80vh" // Increased height to occupy more vertical space
      // Apply functional glassmorphism style object directly
      sx={theme.glassmorphism.card} // Apply the style object directly
      p={0}
      position="relative"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Chat header */}
      <Flex
        bg={headerBg} // Use theme-aware value
        p={4}
        borderBottom="1px solid"
        borderBottomColor={headerBorder} // Use theme-aware value
        align="center"
      >
        <Icon as={FaRobot} boxSize={5} mr={2} color="crimson.200" />
        <Text fontWeight="bold" fontSize="lg">
          Nanda Chat Interface
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
            background: scrollbarTrackBg, // Use theme-aware value
          },
          "&::-webkit-scrollbar-thumb": {
            background: scrollbarThumbBg, // Use theme-aware value
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
            color={emptyChatColor} // Use theme-aware value
          >
            <Icon as={FaTools} boxSize={12} mb={4} color="crimson.300" />
            <Text fontSize="xl" fontWeight="bold" mb={2}>
              Welcome to Nanda Chat Interface
            </Text>
            <Text mb={4}>
              This AI uses the Nanda Protocol to enhance capabilities with
              tools. Ask me anything, and I'll try to help by using my
              intelligence and other tools and knowledge.
            </Text>
            <Box>
              <Text fontWeight="semibold" mb={2}>
                Try asking:
              </Text>
              <Button
                size="sm"
                variant="outline" // Theme handles outline variant colors
                mb={2}
                onClick={() => {
                  // Set the input text using the context setter
                  setCurrentInputText("What tools do you have available?");
                  // Focus on the textarea
                  const textarea = document.querySelector('textarea');
                  if (textarea) {
                    textarea.focus();
                  }
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
              bg={message.role === "user" ? userMsgBg : assistantMsgBg} // Use theme-aware values
              color={message.role === "user" ? "white" : "inherit"} // Inherit color for assistant
              p={6} 
              borderRadius="lg"
              borderTopRightRadius={message.role === "user" ? "0" : "lg"}
              borderTopLeftRadius={message.role === "user" ? "lg" : "0"}
              // wordBreak="break-word" // Ensures text wraps within the box
              // boxShadow="md" // Adds a subtle shadow for better visibility
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
            bg={assistantMsgBg} // Use theme-aware value
            color="inherit" // Inherit color
            p={6} 
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
        borderTop="1px solid"
        borderTopColor={inputAreaBorder} // Use theme-aware value
        bg={inputAreaBg} // Use theme-aware value
      >
        <MessageInput />
      </Box>
    </Box>
  );
};

export default ChatInterface;
