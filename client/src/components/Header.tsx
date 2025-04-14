// client/src/components/Header.tsx
import React from "react";
import { Box, Flex, IconButton, Heading, Icon, Image } from "@chakra-ui/react";
import { FaCog, FaCode } from "react-icons/fa";

interface HeaderProps {
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
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
        <Image 
          src="/NANDA.png" 
          alt="NANDA Logo" 
          boxSize="32px" 
          mr={3}
          display="inline-block"
          verticalAlign="middle"
        />
        <Heading 
          size="md" 
          fontWeight="600"
          bgGradient="linear(to-r, white, whiteAlpha.700)"
          bgClip="text"
          lineHeight="32px"
          display="inline-flex"
          alignItems="center"
        >
          NANDA Host
        </Heading>
      </Flex>
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
  );
};

export default Header;
