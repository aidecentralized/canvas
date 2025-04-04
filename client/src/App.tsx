// client/src/App.tsx
import React, { useState } from "react";
import { ChakraProvider, Box, Flex } from "@chakra-ui/react";
import { theme } from "./theme";
import { ChatProvider } from "./contexts/ChatContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import ChatInterface from "./components/ChatInterface";
import SettingsModal from "./components/SettingsModal";
import Header from "./components/Header";

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
        <ChatProvider>
          <Box
            minH="100vh"
            bgGradient="linear(to-b, crimson.800, crimson.900)"
            display="flex"
            flexDirection="column"
          >
            <Header onOpenSettings={handleOpenSettings} />

            <Flex
              flex="1"
              direction="column"
              align="center"
              justify="center"
              p={4}
            >
              <ChatInterface />
            </Flex>

            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={handleCloseSettings}
            />
          </Box>
        </ChatProvider>
      </SettingsProvider>
    </ChakraProvider>
  );
}

export default App;
