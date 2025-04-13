import React from 'react';
import {
  Box,
  VStack,
  Text,
  Heading,
  Flex,
  Icon,
  Badge,
  Divider,
  Collapse,
  Button,
  useDisclosure,
  Tooltip,
} from '@chakra-ui/react';
import { FaServer, FaTools, FaExclamationTriangle, FaInfo, FaAngleDown, FaAngleUp, FaTrash } from 'react-icons/fa';
import { useChatContext } from '../contexts/ChatContext';
import type { LogEntry } from '../contexts/ChatContext';

const getLogIcon = (type: LogEntry['type']) => {
  switch (type) {
    case 'server-selection':
      return FaServer;
    case 'tool-execution':
      return FaTools;
    case 'error':
      return FaExclamationTriangle;
    case 'info':
    default:
      return FaInfo;
  }
};

const getLogColor = (type: LogEntry['type']) => {
  switch (type) {
    case 'server-selection':
      return 'blue';
    case 'tool-execution':
      return 'green';
    case 'error':
      return 'red';
    case 'info':
    default:
      return 'purple';
  }
};

const LogEntryItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const { isOpen, onToggle } = useDisclosure();
  const iconColor = `${getLogColor(log.type)}.400`;
  const bgColor = `${getLogColor(log.type)}.900`;
  const borderColor = `${getLogColor(log.type)}.700`;
  
  return (
    <Box
      p={3}
      borderRadius="md"
      bg={bgColor}
      borderLeft={`3px solid ${borderColor}`}
      mb={2}
      opacity={0.9}
      _hover={{ opacity: 1 }}
      transition="all 0.2s"
    >
      <Flex justify="space-between" align="center" onClick={onToggle} cursor="pointer">
        <Flex align="center">
          <Icon as={getLogIcon(log.type)} color={iconColor} mr={2} />
          <Text fontSize="sm" fontWeight="medium">
            {log.message}
          </Text>
        </Flex>
        <Flex align="center">
          <Text fontSize="xs" color="whiteAlpha.700" mr={2}>
            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
          <Icon as={isOpen ? FaAngleUp : FaAngleDown} />
        </Flex>
      </Flex>
      
      <Collapse in={isOpen} animateOpacity>
        <Box mt={3} fontSize="xs" bg="rgba(0,0,0,0.3)" p={2} borderRadius="sm">
          {log.details && (
            <VStack align="stretch" spacing={1}>
              {Object.entries(log.details).map(([key, value]) => (
                <Flex key={key}>
                  <Text fontWeight="bold" mr={1}>{key}:</Text>
                  <Text overflowX="auto" maxW="100%">
                    {typeof value === 'object' 
                      ? JSON.stringify(value, null, 2)
                      : String(value)
                    }
                  </Text>
                </Flex>
              ))}
            </VStack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

const ActivityLog: React.FC = () => {
  const { activityLogs, clearLogs } = useChatContext();
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });

  return (
    <Box
      width="100%"
      borderRadius="md"
      overflow="hidden"
      background="linear-gradient(to bottom, rgba(30, 30, 50, 0.9), rgba(20, 20, 35, 0.9))"
      borderColor="gray.700"
      borderWidth="1px"
    >
      <Flex 
        p={3} 
        justify="space-between" 
        align="center" 
        borderBottomWidth="1px" 
        borderBottomColor="gray.700"
        bg="gray.800"
      >
        <Flex align="center" onClick={onToggle} cursor="pointer">
          <Heading size="sm" fontWeight="medium">
            Activity Log
          </Heading>
          <Badge ml={2} colorScheme="purple">
            {activityLogs.length}
          </Badge>
          <Icon ml={2} as={isOpen ? FaAngleUp : FaAngleDown} />
        </Flex>
        <Tooltip label="Clear logs">
          <Button 
            size="xs" 
            variant="ghost" 
            colorScheme="red" 
            leftIcon={<Icon as={FaTrash} />}
            onClick={clearLogs}
          >
            Clear
          </Button>
        </Tooltip>
      </Flex>
      
      <Collapse in={isOpen} animateOpacity>
        <Box 
          maxH="300px" 
          overflowY="auto" 
          p={3} 
          css={{
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "rgba(0, 0, 0, 0.1)",
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
          {activityLogs.length === 0 ? (
            <Text color="gray.500" fontSize="sm" textAlign="center" p={4}>
              No activity logged yet
            </Text>
          ) : (
            <VStack spacing={2} align="stretch">
              {activityLogs.map((log) => (
                <LogEntryItem key={log.id} log={log} />
              ))}
            </VStack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default ActivityLog; 