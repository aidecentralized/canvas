// client/src/components/SettingsModal.tsx
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
} from "@chakra-ui/react";
import {
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaSync,
  FaCheck,
  FaStar,
} from "react-icons/fa";
import { useSettingsContext } from "../contexts/SettingsContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    apiKey,
    setApiKey,
    nandaServers,
    registerNandaServer,
    refreshRegistry,
  } = useSettingsContext();
  const [tempApiKey, setTempApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [newServer, setNewServer] = useState({
    id: "",
    name: "",
    url: "",
  });
  const [registryServers, setRegistryServers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  // Reset temp values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempApiKey(apiKey || "");
      setShowApiKey(false);
    }
  }, [isOpen, apiKey]);

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    toast({
      title: "API Key Saved",
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const handleAddServer = () => {
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
    setIsRefreshing(true);
    try {
      const result = await refreshRegistry();
      setRegistryServers(result.servers || []);

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
    registerNandaServer({
      id: server.id,
      name: server.name,
      url: server.url,
    });

    toast({
      title: "Server Added",
      description: `Registry server "${server.name}" has been added`,
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
  };

  // Check if a registry server is already registered
  const isServerRegistered = (serverId: string) => {
    return nandaServers.some((server) => server.id === serverId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay backdropFilter="blur(10px)" />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
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
                        style={{ color: "#f06", textDecoration: "underline" }}
                      >
                        Anthropic Console
                      </a>
                    </FormHelperText>
                  </FormControl>

                  <Button colorScheme="crimson" onClick={handleSaveApiKey}>
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
                      <Text color="gray.400">No servers registered yet</Text>
                    ) : (
                      nandaServers.map((server) => (
                        <Box
                          key={server.id}
                          p={3}
                          mb={2}
                          borderRadius="md"
                          borderLeft="3px solid"
                          borderLeftColor="crimson.500"
                          bg="rgba(0, 0, 0, 0.2)"
                        >
                          <Text fontWeight="bold">{server.name}</Text>
                          <Text fontSize="sm" color="gray.400">
                            ID: {server.id}
                          </Text>
                          <Text fontSize="sm" color="gray.400">
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
                      >
                        Refresh Registry
                      </Button>
                    </Flex>

                    {!isRefreshing && registryServers.length === 0 ? (
                      <Text color="gray.400">
                        No registry servers loaded. Click the refresh button to
                        load servers from the registry.
                      </Text>
                    ) : (
                      <>
                        {isRefreshing ? (
                          <Flex justifyContent="center" py={8}>
                            <Spinner size="xl" color="crimson.400" />
                          </Flex>
                        ) : (
                          registryServers.map((server) => (
                            <Box
                              key={server.id}
                              p={3}
                              mb={2}
                              borderRadius="md"
                              borderLeft="3px solid"
                              borderLeftColor={
                                server.verified ? "green.500" : "gray.500"
                              }
                              bg="rgba(0, 0, 0, 0.2)"
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

                              <Text fontSize="sm" color="gray.400" mt={1}>
                                ID: {server.id}
                              </Text>
                              <Text fontSize="sm" color="gray.400">
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
                                  colorScheme={
                                    isServerRegistered(server.id)
                                      ? "green"
                                      : "crimson"
                                  }
                                  leftIcon={
                                    isServerRegistered(server.id) ? (
                                      <FaCheck />
                                    ) : (
                                      <FaPlus />
                                    )
                                  }
                                  isDisabled={isServerRegistered(server.id)}
                                  onClick={() =>
                                    handleAddRegistryServer(server)
                                  }
                                >
                                  {isServerRegistered(server.id)
                                    ? "Added"
                                    : "Add Server"}
                                </Button>
                              </Flex>
                            </Box>
                          ))
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

                  <Box p={3} borderRadius="md" bg="rgba(0, 0, 0, 0.2)">
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

                  <Text fontSize="sm" color="gray.400">
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
