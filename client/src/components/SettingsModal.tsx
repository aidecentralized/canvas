import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  FormHelperText,
  Box,
  Heading,
  Text,
  Divider,
  Flex,
  Switch,
  useToast,
  IconButton,
  InputGroup,
  InputRightElement,
  Spinner,
  Badge,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaSync,
  FaCheck,
  FaStar,
  FaTrash,
} from "react-icons/fa";
import { useSettingsContext } from "../contexts/SettingsContext";
import { useChatContext } from "../contexts/ChatContext"; // Import useChatContext

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    apiKey,
    setApiKey, // Signature is now just setApiKey(key)
    nandaServers,
    registryServers,
    registerNandaServer,
    removeNandaServer,
    refreshRegistry,
  } = useSettingsContext();
  const { sessionId } = useChatContext(); // Get sessionId
  const [tempApiKey, setTempApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [newServer, setNewServer] = useState({
    id: "",
    name: "",
    url: "",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  // Determine if session-dependent actions should be disabled
  const isSessionReady = !!sessionId;

  // Define colors based on theme mode
  const registeredServerBg = useColorModeValue("gray.100", "rgba(0, 0, 0, 0.2)");
  const registryServerBg = useColorModeValue("gray.100", "rgba(0, 0, 0, 0.2)");
  const aboutBoxBg = useColorModeValue("gray.100", "rgba(0, 0, 0, 0.2)");
  const textColor = useColorModeValue("gray.600", "gray.400");
  const linkColor = useColorModeValue("crimson.600", "crimson.300");

  // Reset temp values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempApiKey(apiKey || "");
      setShowApiKey(false);
    }
  }, [isOpen, apiKey]);

  // Update handleSaveApiKey to call setApiKey without sessionId argument
  const handleSaveApiKey = () => { // No longer needs async/await here unless setApiKey returns a promise you want to wait for
    if (!isSessionReady) {
      toast({ title: "Session Not Ready", status: "warning", duration: 3000 });
      return;
    }
    try {
      setApiKey(tempApiKey); // Call context function (it handles session internally)
      toast({
        title: "API Key Saved",
        description: "Key saved locally and sent to server for this session.", // Keep description
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } catch (error) { // Catch potential synchronous errors if any, though unlikely now
      toast({
        title: "Failed to Initiate API Key Save", // Adjust title slightly
        description: error instanceof Error ? error.message : "An unknown error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const handleAddServer = () => {
    if (!isSessionReady) {
      toast({ title: "Session Not Ready", status: "warning", duration: 3000 });
      return;
    }
    // Validate server info
    if (!newServer.id || !newServer.name || !newServer.url) {
      toast({
        title: "Validation Error",
        description: "All server fields are required",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    // Validate URL
    try {
      new URL(newServer.url);
    } catch (error) {
      toast({
        title: "Invalid URL",
        description:
          "Please enter a valid URL (e.g., http://localhost:3001/sse)",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    // Register new server
    registerNandaServer({
      id: newServer.id,
      name: newServer.name,
      url: newServer.url,
    });

    // Reset form
    setNewServer({
      id: "",
      name: "",
      url: "",
    });

    toast({
      title: "Server Added",
      description: `Server "${newServer.name}" has been added`,
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
  };

  const handleRefreshRegistry = async () => {
    if (!isSessionReady) {
      toast({ title: "Session Not Ready", status: "warning", duration: 3000 });
      return;
    }
    setIsRefreshing(true);
    try {
      const result = await refreshRegistry();

      toast({
        title: "Registry Refreshed",
        description: `Found ${result.servers.length} servers from the registry`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to refresh registry servers",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddRegistryServer = (server: any) => {
    if (!isSessionReady) {
      toast({ title: "Session Not Ready", status: "warning", duration: 3000 });
      return;
    }
    try {
      console.log("Adding registry server:", server);

      // Generate a unique ID if needed, though registry should provide one
      const serverToAdd = {
        ...server,
        id: server.id || `registry-server-${Date.now()}` // Fallback ID generation
      };

      // Register the server via context
      registerNandaServer(serverToAdd);

      // Toast notification after successful registration (context update triggers UI change)
      toast({
        title: "Server Added",
        description: `Registry server "${server.name}" has been added`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      console.error("Failed to add registry server:", error);
      toast({
        title: "Failed to Add Server",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Check if a server from the registry is already registered locally
  const isServerRegistered = (serverId: string, serverUrl: string) => {
    // Check if any registered server matches either the ID or the URL
    return nandaServers.some(
      (server) => server.id === serverId || server.url === serverUrl
    );
  };

  const handleRemoveServer = (serverId: string, serverName: string) => {
    if (!isSessionReady) {
      toast({ title: "Session Not Ready", status: "warning", duration: 3000 });
      return;
    }
    // Remove the confirmation dialog
    removeNandaServer(serverId); // Call context function to remove

    toast({
      title: "Server Removed",
      description: `Server "${serverName}" has been removed`,
      status: "info",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay backdropFilter="blur(10px)" />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        {/* Add maxHeight and overflowY */}
        <ModalBody maxHeight="70vh" overflowY="auto">
          <Tabs variant="soft-rounded" colorScheme="crimson">
            <TabList>
              <Tab>API</Tab>
              <Tab>Nanda Servers</Tab>
              <Tab>Registry</Tab>
              <Tab>About</Tab>
            </TabList>

            <TabPanels>
              {/* API Settings Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>Anthropic API Key</FormLabel>
                    <InputGroup>
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="sk-ant-api03-..."
                        autoComplete="off"
                      />
                      <InputRightElement>
                        <IconButton
                          aria-label={
                            showApiKey ? "Hide API Key" : "Show API Key"
                          }
                          icon={showApiKey ? <FaEyeSlash /> : <FaEye />}
                          size="sm"
                          variant="ghost"
                          onClick={toggleShowApiKey}
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormHelperText>
                      You can get your API key from the{" "}
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: linkColor, textDecoration: "underline" }}
                      >
                        Anthropic Console
                      </a>
                    </FormHelperText>
                  </FormControl>

                  <Button
                    colorScheme="crimson"
                    onClick={handleSaveApiKey}
                    isDisabled={!isSessionReady} // Disable if session not ready
                  >
                    Save API Key
                  </Button>
                </VStack>
              </TabPanel>

              {/* Nanda Servers Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Heading size="sm" mb={2}>
                      Registered Nanda Servers
                    </Heading>
                    {nandaServers.length === 0 ? (
                      <Text color={textColor}>No servers registered yet</Text>
                    ) : (
                      nandaServers.map((server) => (
                        <Box
                          key={server.id}
                          p={3}
                          mb={2}
                          borderRadius="md"
                          borderLeft="3px solid"
                          borderLeftColor="crimson.500"
                          bg={registeredServerBg}
                        >
                          <Flex justifyContent="space-between" alignItems="center">
                            <Text fontWeight="bold">{server.name}</Text>
                            <Button
                              size="xs"
                              colorScheme="red"
                              leftIcon={<FaTrash />}
                              onClick={() => handleRemoveServer(server.id, server.name)}
                              variant="ghost"
                              isDisabled={!isSessionReady} // Disable if session not ready
                            >
                              Remove
                            </Button>
                          </Flex>
                          <Text fontSize="sm" color={textColor}>
                            ID: {server.id}
                          </Text>
                          <Text fontSize="sm" color={textColor}>
                            URL: {server.url}
                          </Text>
                        </Box>
                      ))
                    )}
                  </Box>

                  <Divider />

                  <Box>
                    <Heading size="sm" mb={3}>
                      Add New Server
                    </Heading>

                    <VStack spacing={3} align="stretch">
                      <FormControl isRequired>
                        <FormLabel>Server ID</FormLabel>
                        <Input
                          value={newServer.id}
                          onChange={(e) =>
                            setNewServer({ ...newServer, id: e.target.value })
                          }
                          placeholder="weather"
                        />
                        <FormHelperText>
                          A unique identifier for this server
                        </FormHelperText>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Server Name</FormLabel>
                        <Input
                          value={newServer.name}
                          onChange={(e) =>
                            setNewServer({ ...newServer, name: e.target.value })
                          }
                          placeholder="Weather Server"
                        />
                        <FormHelperText>
                          A friendly name for this server
                        </FormHelperText>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Server URL</FormLabel>
                        <Input
                          value={newServer.url}
                          onChange={(e) =>
                            setNewServer({ ...newServer, url: e.target.value })
                          }
                          placeholder="http://localhost:3001/sse"
                        />
                        <FormHelperText>
                          The SSE endpoint URL of the Nanda server
                        </FormHelperText>
                      </FormControl>

                      <Button
                        leftIcon={<FaPlus />}
                        colorScheme="crimson"
                        onClick={handleAddServer}
                        isDisabled={!isSessionReady} // Disable if session not ready
                      >
                        Add Server
                      </Button>
                    </VStack>
                  </Box>
                </VStack>
              </TabPanel>

              {/* Registry Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Flex
                      justifyContent="space-between"
                      alignItems="center"
                      mb={4}
                    >
                      <Heading size="sm">MCP Registry Servers</Heading>
                      <Button
                        leftIcon={
                          isRefreshing ? <Spinner size="sm" /> : <FaSync />
                        }
                        colorScheme="crimson"
                        size="sm"
                        onClick={handleRefreshRegistry}
                        isLoading={isRefreshing}
                        isDisabled={!isSessionReady} // Disable if session not ready
                      >
                        Refresh Registry
                      </Button>
                    </Flex>

                    {!isRefreshing && registryServers.length === 0 ? (
                      <Text color={textColor}>
                        {!isSessionReady ? "Initializing session..." : "No registry servers loaded. Click the refresh button to load servers from the registry."}
                      </Text>
                    ) : (
                      <>
                        {isRefreshing ? (
                          <Flex justifyContent="center" py={8}>
                            <Spinner size="xl" color="crimson.400" />
                          </Flex>
                        ) : (
                          registryServers.map((server) => {
                            const isAdded = isServerRegistered(server.id, server.url);
                            return (
                              <Box
                                key={server.id}
                                p={3}
                                mb={2}
                                borderRadius="md"
                                borderLeft="3px solid"
                                borderLeftColor={
                                  server.verified ? "green.500" : "gray.500"
                                }
                                bg={registryServerBg}
                                position="relative"
                              >
                                <Flex
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <Text fontWeight="bold">
                                    {server.name}
                                    {server.verified && (
                                      <Badge ml={2} colorScheme="green">
                                        Verified
                                      </Badge>
                                    )}
                                  </Text>
                                  {server.rating && (
                                    <Flex alignItems="center">
                                      <FaStar color="gold" />
                                      <Text ml={1} fontSize="sm">
                                        {server.rating.toFixed(1)}
                                      </Text>
                                    </Flex>
                                  )}
                                </Flex>

                                <Text fontSize="sm" color={textColor} mt={1}>
                                  ID: {server.id}
                                </Text>
                                <Text fontSize="sm" color={textColor}>
                                  URL: {server.url}
                                </Text>

                                {server.description && (
                                  <Text fontSize="sm" mt={1}>
                                    {server.description}
                                  </Text>
                                )}

                                {server.tags && server.tags.length > 0 && (
                                  <Flex mt={2} flexWrap="wrap" gap={2}>
                                    {server.tags.map(
                                      (tag: string, index: number) => (
                                        <Badge
                                          key={index}
                                          colorScheme="purple"
                                          fontSize="xs"
                                        >
                                          {tag}
                                        </Badge>
                                      )
                                    )}
                                  </Flex>
                                )}

                                <Flex mt={2} justifyContent="flex-end">
                                  <Button
                                    size="xs"
                                    colorScheme={isAdded ? "green" : "crimson"}
                                    leftIcon={isAdded ? <FaCheck /> : <FaPlus />}
                                    isDisabled={isAdded || !isSessionReady} // Disable if added OR session not ready
                                    onClick={() => handleAddRegistryServer(server)}
                                  >
                                    {isAdded ? "Added" : "Add Server"}
                                  </Button>
                                </Flex>
                              </Box>
                            );
                          })
                        )}
                      </>
                    )}
                  </Box>
                </VStack>
              </TabPanel>

              {/* About Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Nanda Host</Heading>
                  <Text>
                    A beautiful chat interface with Nanda integration for
                    enhanced capabilities through agents, resources, and tools.
                  </Text>

                  <Box p={3} borderRadius="md" bg={aboutBoxBg}>
                    <Heading size="sm" mb={2}>
                      What is Nanda?
                    </Heading>
                    <Text fontSize="sm">
                      Nanda is an open standard built on top of MCP for enabling
                      coordination between agents, resources and tools (ARTs).
                      It enables LLMs to discover and execute tools, access
                      resources, and use predefined prompts.
                    </Text>
                  </Box>

                  <Divider />

                  <Text fontSize="sm" color={textColor}>
                    Version 1.0.0 • MIT License
                  </Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SettingsModal;
