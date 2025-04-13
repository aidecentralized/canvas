// client/src/App.tsx
import React, { useState } from "react";
import { ChakraProvider, Box, Flex, useDisclosure } from "@chakra-ui/react";
import { theme } from "./theme";
import { ChatProvider } from "./contexts/ChatContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { LoggingProvider } from "./contexts/LoggingContext";
import ChatInterface from "./components/ChatInterface";
import LoggingPanel from "./components/LoggingPanel";
import SettingsModal from "./components/SettingsModal";
import Header from "./components/Header";
import { useLoggingContext } from "./contexts/LoggingContext";

// Logging panel container that uses the context
const LoggingContainer = () => {
  const { logs } = useLoggingContext();
  return <LoggingPanel logs={logs} />;
};

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLoggingPanel, setShowLoggingPanel] = useState(true);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const toggleLoggingPanel = () => {
    setShowLoggingPanel(!showLoggingPanel);
  };

  return (
    <ChakraProvider theme={theme}>
      <SettingsProvider>
        <LoggingProvider>
          <ChatProvider>
            <Box
              minH="100vh"
              bgGradient="linear(to-b, #16161e, #1e1e2f)"
              bgImage="radial-gradient(circle at 10% 20%, rgba(90, 26, 255, 0.1) 0%, transparent 20%), radial-gradient(circle at 90% 80%, rgba(0, 201, 255, 0.1) 0%, transparent 20%)"
              bgSize="cover"
              bgPosition="center"
              bgRepeat="no-repeat"
              display="flex"
              flexDirection="column"
              position="relative"
              overflow="hidden"
              _before={{
                content: '""',
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                bg: "linear-gradient(180deg, rgba(22, 22, 30, 0.5) 0%, rgba(26, 27, 38, 0.2) 100%)",
                zIndex: 0,
              }}
            >
              <Header 
                onOpenSettings={handleOpenSettings} 
                onToggleLogging={toggleLoggingPanel}
                showLoggingPanel={showLoggingPanel}
              />

              <Flex
                flex="1"
                p={4}
                position="relative"
                zIndex={1}
              >
                {/* Main content area - adjusts based on whether logging panel is shown */}
                <Flex 
                  flex={showLoggingPanel ? "1 0 65%" : "1"} 
                  direction="column" 
                  align="center" 
                  justify="center"
                  transition="flex 0.3s ease"
                >
                  <ChatInterface />
                </Flex>
                
                {/* Logging panel - only appears when enabled */}
                {showLoggingPanel && (
                  <Box 
                    width="30%" 
                    ml={4} 
                    borderRadius="md"
                    height="80vh"
                    overflow="hidden"
                    boxShadow="0 10px 30px rgba(0, 0, 0, 0.2)"
                    transition="all 0.3s ease"
                    flexShrink={0}
                  >
                    <LoggingContainer />
                  </Box>
                )}
              </Flex>

              <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
            </Box>
          </ChatProvider>
        </LoggingProvider>
      </SettingsProvider>
    </ChakraProvider>
  );
}

export default App;
