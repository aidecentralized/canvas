// client/src/components/Header.tsx
import React from "react";
import { Box, Flex, IconButton, Heading, Icon, Tooltip } from "@chakra-ui/react";
import { FaCog, FaCode, FaListAlt, FaEye, FaEyeSlash } from "react-icons/fa";

interface HeaderProps {
  onOpenSettings: () => void;
  onToggleLogging?: () => void;
  showLoggingPanel?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  onOpenSettings, 
  onToggleLogging,
  showLoggingPanel = false
}) => {
  return (
    <Flex
      as="header"
      width="100%"
      justifyContent="space-between"
      alignItems="center"
      py={3}
      px={6}
      bg="rgba(0, 0, 0, 0.2)"
      backdropFilter="blur(10px)"
      borderBottom="1px solid rgba(255, 255, 255, 0.05)"
      position="relative"
      zIndex={2}
      boxShadow="0 1px 10px rgba(0, 0, 0, 0.2)"
    >
      <Flex alignItems="center">
        <Box 
          bg="primary.500" 
          p={2} 
          borderRadius="md" 
          mr={3}
          boxShadow="0 0 10px rgba(90, 26, 255, 0.5)"
        >
          <Icon as={FaCode} color="white" />
        </Box>
        <Heading 
          size="md" 
          fontWeight="600"
          bgGradient="linear(to-r, white, whiteAlpha.700)"
          bgClip="text"
        >
          Nanda Host
        </Heading>
      </Flex>
      
      <Flex>
        {onToggleLogging && (
          <Tooltip label={showLoggingPanel ? "Hide Logs" : "Show Logs"}>
            <IconButton
              aria-label={showLoggingPanel ? "Hide Activity Logs" : "Show Activity Logs"}
              icon={showLoggingPanel ? <FaEyeSlash /> : <FaEye />}
              onClick={onToggleLogging}
              variant="ghost"
              size="md"
              color="whiteAlpha.800"
              mr={2}
              _hover={{
                bg: "rgba(255, 255, 255, 0.1)",
              }}
              transition="all 0.3s ease"
            />
          </Tooltip>
        )}
        
        <IconButton
          aria-label="Settings"
          icon={<FaCog />}
          onClick={onOpenSettings}
          variant="ghost"
          size="md"
          color="whiteAlpha.800"
          _hover={{
            bg: "rgba(255, 255, 255, 0.1)",
            transform: "rotate(30deg)",
          }}
          transition="all 0.3s ease"
        />
      </Flex>
    </Flex>
  );
};

export default Header;
