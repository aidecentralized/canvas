// client/src/App.tsx
import React, { useState } from "react";
import { ChakraProvider, Box, Flex, Container, VStack } from "@chakra-ui/react";
import { theme } from "./theme";
import { ChatProvider } from "./contexts/ChatContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ResourceProvider } from "./contexts/ResourceContext";
import ChatInterface from "./components/ChatInterface";
import SettingsModal from "./components/SettingsModal";
import Header from "./components/Header";
import ActivityLog from "./components/ActivityLog";

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <ChakraProvider theme={theme}>
      <SettingsProvider>
        <ResourceProvider>
          <ChatProvider>
            <Box
              bgImage="url('NANDA.png')"
              bgPosition="right -100px bottom -100px"
              bgRepeat="no-repeat"
              bgSize="400px"
              minH="100vh"
              bg="dark.100"
              position="relative"
              overflow="hidden"
            >
              <Header onOpenSettings={handleOpenSettings} />
              <Container maxW="container.xl" pt="80px" pb="4">
                <Flex
                  gap={4}
                  flexDir={{ base: "column", lg: "row" }}
                  alignItems="flex-start"
                >
                  <ChatInterface />
                  <Box
                    w={{ base: "100%", lg: "300px" }}
                    display={{ base: "none", lg: "block" }}
                    flexShrink={0}
                  >
                    <VStack spacing={4} position="sticky" top="90px">
                      <ActivityLog />
                    </VStack>
                  </Box>
                </Flex>
              </Container>
              <SettingsModal
                isOpen={isSettingsOpen}
                onClose={handleCloseSettings}
              />
            </Box>
          </ChatProvider>
        </ResourceProvider>
      </SettingsProvider>
    </ChakraProvider>
  );
}

export default App;
