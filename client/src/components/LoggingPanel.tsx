import React, { useRef, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Icon,
  Heading,
  Badge,
  VStack,
  Divider,
  useColorModeValue,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import { FaTools, FaExchangeAlt, FaArrowRight, FaArrowLeft } from "react-icons/fa";

// Define the shape of our log entry
export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "tool_call" | "request" | "response";
  toolName?: string;
  data: any;
  isError?: boolean;
}

interface LoggingPanelProps {
  logs: LogEntry[];
}

const LoggingPanel: React.FC<LoggingPanelProps> = ({ logs }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new logs come in
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Get the right icon for the log type
  const getIconForLogType = (type: string) => {
    switch (type) {
      case "tool_call":
        return FaTools;
      case "request":
        return FaArrowRight;
      case "response":
        return FaArrowLeft;
      default:
        return FaExchangeAlt;
    }
  };

  // Get color scheme based on log type
  const getColorScheme = (type: string, isError?: boolean) => {
    if (isError) return "red";
    
    switch (type) {
      case "tool_call":
        return "purple";
      case "request":
        return "blue";
      case "response":
        return "green";
      default:
        return "gray";
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <Box
      width="100%"
      height="100%"
      overflowY="auto"
      bg="dark.200"
      p={3}
      borderRadius="md"
      boxShadow="inset 0 2px 10px rgba(0, 0, 0, 0.2)"
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
      <Heading size="sm" mb={3} display="flex" alignItems="center">
        <Icon as={FaExchangeAlt} mr={2} color="primary.300" />
        Activity Log
      </Heading>
      
      <Divider mb={3} borderColor="whiteAlpha.200" />
      
      {logs.length === 0 ? (
        <Flex 
          justify="center" 
          align="center" 
          height="100px" 
          color="whiteAlpha.600"
          bg="rgba(0, 0, 0, 0.2)"
          borderRadius="md"
          p={4}
        >
          <Text>No activity logged yet</Text>
        </Flex>
      ) : (
        <VStack spacing={2} align="stretch">
          {logs.map((log) => (
            <Accordion 
              key={log.id} 
              allowToggle 
              borderRadius="md" 
              overflow="hidden"
            >
              <AccordionItem 
                border="none" 
                mb={2} 
                bg="rgba(0, 0, 0, 0.2)"
                borderRadius="md"
              >
                <AccordionButton 
                  py={2} 
                  px={3}
                  _hover={{ bg: "rgba(255, 255, 255, 0.05)" }}
                  borderRadius="md"
                >
                  <Flex width="100%" justifyContent="space-between" alignItems="center">
                    <Flex alignItems="center">
                      <Flex
                        alignItems="center"
                        justifyContent="center"
                        bg={`${getColorScheme(log.type, log.isError)}.900`}
                        color={`${getColorScheme(log.type, log.isError)}.300`}
                        p={1.5}
                        borderRadius="md"
                        mr={2}
                      >
                        <Icon as={getIconForLogType(log.type)} boxSize={3} />
                      </Flex>
                      <Text fontSize="sm" fontWeight="medium">
                        {log.type === "tool_call" 
                          ? `Tool: ${log.toolName}` 
                          : log.type === "request" 
                            ? "Request" 
                            : "Response"}
                      </Text>
                    </Flex>
                    
                    <Flex alignItems="center">
                      <Badge 
                        size="sm" 
                        variant="subtle" 
                        colorScheme={getColorScheme(log.type, log.isError)}
                        fontSize="xs"
                        mr={2}
                      >
                        {log.isError ? "Error" : log.type}
                      </Badge>
                      <Text fontSize="xs" color="whiteAlpha.600" fontFamily="monospace">
                        {formatTime(log.timestamp)}
                      </Text>
                    </Flex>
                  </Flex>
                  <AccordionIcon />
                </AccordionButton>
                
                <AccordionPanel 
                  pb={4} 
                  bg="rgba(0, 0, 0, 0.3)" 
                  borderTop="1px solid rgba(255, 255, 255, 0.05)"
                >
                  <Box
                    as="pre"
                    width="100%"
                    p={3}
                    bg="rgba(0, 0, 0, 0.4)"
                    borderRadius="md"
                    fontSize="xs"
                    fontFamily="monospace"
                    overflowX="auto"
                    color="whiteAlpha.800"
                  >
                    {JSON.stringify(log.data, null, 2)}
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          ))}
          <div ref={logsEndRef} />
        </VStack>
      )}
    </Box>
  );
};

export default LoggingPanel; 