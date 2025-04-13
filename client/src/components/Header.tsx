// client/src/components/Header.tsx
import React from "react";
import {
  Flex,
  Box,
  Heading,
  IconButton,
  useColorMode,
  Icon,
  Tooltip,
} from "@chakra-ui/react";
import { FaCog, FaMoon, FaSun } from "react-icons/fa";

interface HeaderProps {
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Flex
      as="header"
      width="100%"
      px={6}
      py={3}
      bg="rgba(0, 0, 0, 0.2)"
      backdropFilter="blur(10px)"
      borderBottom="1px solid rgba(255, 255, 255, 0.1)"
      justify="space-between"
      align="center"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Box>
        <Heading size="md" color="white">
          <Icon viewBox="0 0 24 24" boxSize={6} mr={2} display="inline-block">
            <path
              fill="currentColor"
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            />
          </Icon>
          MCP Host
        </Heading>
      </Box>

      <Flex>
        <Tooltip label="Settings" placement="bottom">
          <IconButton
            aria-label="Settings"
            icon={<FaCog />}
            variant="ghost"
            colorScheme="whiteAlpha"
            fontSize="xl"
            mr={2}
            onClick={onOpenSettings}
          />
        </Tooltip>

        <Tooltip
          label={
            colorMode === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"
          }
          placement="bottom"
        >
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === "light" ? <FaMoon /> : <FaSun />}
            variant="ghost"
            colorScheme="whiteAlpha"
            fontSize="xl"
            onClick={toggleColorMode}
          />
        </Tooltip>
      </Flex>
    </Flex>
  );
};

export default Header;
