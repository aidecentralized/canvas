// client/src/components/SettingsModal.tsx
import React, { useState, useEffect, useRef } from "react";
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
  Link,
  useToast,
  IconButton,
  InputGroup,
  InputRightElement,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import { FaEye, FaEyeSlash, FaPlus, FaExternalLinkAlt, FaSync, FaTrash } from "react-icons/fa";
import { useSettingsContext } from "../contexts/SettingsContext";

// Define the types locally instead of importing from a non-existent file
interface CredentialRequirement {
  id: string;
  name: string;
  description?: string;
  acquisition?: {
    url?: string;
    instructions?: string;
  };
}

interface ToolCredentialInfo {
  toolName: string;
  serverName: string;
  serverId: string;
  credentials: CredentialRequirement[];
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Component for a single tool credential form
interface ToolCredentialFormProps {
  tool: ToolCredentialInfo;
  onSave: (
    toolName: string,
    serverId: string,
    credentials: Record<string, string>
  ) => Promise<boolean>;
}

const ToolCredentialForm: React.FC<ToolCredentialFormProps> = ({ 
  tool, 
  onSave 
}) => {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const handleInputChange = (id: string, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSave = async () => {
    // Check that all required fields are filled
    const missingFields = tool.credentials
      .map(cred => cred.id)
      .filter(id => !credentials[id]);

    if (missingFields.length > 0) {
      toast({
        title: "Missing credentials",
        description: `Please fill in all required fields: ${missingFields.join(", ")}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(tool.toolName, tool.serverId, credentials);
      
      if (success) {
        toast({
          title: "Credentials saved",
          description: `Credentials for ${tool.toolName} have been saved`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error("Failed to save credentials");
      }
    } catch (error) {
      toast({
        title: "Error saving credentials",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box 
      p={4} 
      mb={4} 
      borderRadius="md" 
      borderLeft="3px solid" 
      borderLeftColor="crimson.500"
      bg="rgba(0, 0, 0, 0.2)"
    >
      <Heading size="sm" mb={2}>
        {tool.toolName}
      </Heading>
      <Text fontSize="sm" color="gray.400" mb={3}>
        Server: {tool.serverName}
      </Text>

      <VStack spacing={3} align="stretch">
        {tool.credentials.map((cred) => (
          <FormControl key={cred.id} isRequired>
            <FormLabel>{cred.name || cred.id}</FormLabel>
            <InputGroup>
              <Input
                type={showPasswords[cred.id] ? "text" : "password"}
                value={credentials[cred.id] || ""}
                onChange={(e) => handleInputChange(cred.id, e.target.value)}
                placeholder={`Enter ${cred.name || cred.id}`}
              />
              <InputRightElement>
                <IconButton
                  aria-label={
                    showPasswords[cred.id] ? "Hide credential" : "Show credential"
                  }
                  icon={showPasswords[cred.id] ? <FaEyeSlash /> : <FaEye />}
                  size="sm"
                  variant="ghost"
                  onClick={() => togglePasswordVisibility(cred.id)}
                />
              </InputRightElement>
            </InputGroup>
            {cred.description && (
              <FormHelperText>{cred.description}</FormHelperText>
            )}
          </FormControl>
        ))}

        {tool.credentials.some(cred => cred.acquisition?.url) && (
          <Box mt={2} mb={3}>
            <Text fontSize="sm" fontWeight="bold">
              Where to get credentials:
            </Text>
            {tool.credentials
              .filter(cred => cred.acquisition?.url)
              .map(cred => (
                <Flex key={`acq-${cred.id}`} mt={1} alignItems="center">
                  <Link 
                    href={cred.acquisition?.url}
                    isExternal
                    color="crimson.400"
                    fontSize="sm"
                    mr={1}
                  >
                    {cred.name} credentials
                  </Link>
                  <FaExternalLinkAlt size="0.6em" color="gray" />
                </Flex>
              ))}
          </Box>
        )}

        <Button 
          colorScheme="crimson" 
          onClick={handleSave}
          isLoading={isSaving}
        >
          Save Credentials
        </Button>
      </VStack>
    </Box>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    apiKey, 
    setApiKey, 
    nandaServers, 
    registerNandaServer,
    getToolsWithCredentialRequirements,
    setToolCredentials,
    removeNandaServer
  } = useSettingsContext();
  
  const [tempApiKey, setTempApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [newServer, setNewServer] = useState({
    id: "",
    name: "",
    url: "",
  });
  const [toolsWithCredentials, setToolsWithCredentials] = useState<ToolCredentialInfo[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();

  // Clear any existing timers on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // Reset temp values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempApiKey(apiKey || "");
      setShowApiKey(false);
      loadToolsWithCredentials();
    } else {
      // Cancel loading and clear timer if modal closes
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setIsLoadingTools(false);
    }
  }, [isOpen, apiKey]);

  // Reload tools when servers change
  useEffect(() => {
    if (isOpen && nandaServers.length > 0) {
      // Reset load attempts when server list changes
      setLoadAttempts(0);
      loadToolsWithCredentials();
    }
  }, [nandaServers, isOpen]);

  // Add debug info to assist with troubleshooting
  const debugToolCredentials = () => {
    if (toolsWithCredentials.length > 0) {
      const serverIds = Array.from(new Set(toolsWithCredentials.map(tool => tool.serverId)));
      console.log(`Found tools from ${serverIds.length} servers:`, serverIds);
      
      serverIds.forEach(serverId => {
        const serverTools = toolsWithCredentials.filter(tool => tool.serverId === serverId);
        console.log(`Server ${serverId} has ${serverTools.length} tools:`, 
          serverTools.map(t => t.toolName));
      });
    } else {
      console.log("No tools with credentials found");
    }
  };

  const loadToolsWithCredentials = async () => {
    // Clear any pending retries
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    
    setIsLoadingTools(true);
    
    try {
      const tools = await getToolsWithCredentialRequirements();
      
      if (tools.length > 0) {
        console.log("Found tools with credentials:", tools);
        setToolsWithCredentials(tools);
        // Debug information to help troubleshoot
        setTimeout(debugToolCredentials, 100);
        setLoadAttempts(0); // Reset load attempts on success
        setIsLoadingTools(false);
      } else if (loadAttempts < 3 && nandaServers.length > 0) {
        // If no tools found but servers exist, try again after delay
        console.log(`No tools found on attempt ${loadAttempts + 1}, retrying...`);
        setLoadAttempts(prev => prev + 1);
        
        // Use reference to store timeout ID
        retryTimerRef.current = setTimeout(() => {
          loadToolsWithCredentials();
        }, 2000); // Wait 2 seconds before retrying
      } else {
        // If max attempts reached or no servers, just set empty array
        console.log("Max retry attempts reached or no servers configured");
        setToolsWithCredentials([]);
        setIsLoadingTools(false);
      }
    } catch (error) {
      console.error("Failed to load tools with credential requirements:", error);
      toast({
        title: "Error",
        description: "Failed to load tools that require credentials",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setToolsWithCredentials([]);
      setIsLoadingTools(false);
    }

    // Safety mechanism: ensure loading state is reset after 10 seconds at most
    setTimeout(() => {
      if (isLoadingTools) {
        console.log("Safety timeout triggered - forcing loading state to false");
        setIsLoadingTools(false);
      }
    }, 10000);
  };

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

    // Register new server (will be saved to localStorage via context)
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
      description: `Server "${newServer.name}" has been added to your browser`,
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
    
    // Reload tools after adding a server
    setTimeout(() => {
      loadToolsWithCredentials();
    }, 1000);
  };
  
  const handleRemoveServer = (serverId: string) => {
    removeNandaServer(serverId);
    
    toast({
      title: "Server Removed",
      description: "Server has been removed from your browser",
      status: "info",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
    
    // Reload tools after removing a server
    setTimeout(() => {
      loadToolsWithCredentials();
    }, 1000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay backdropFilter="blur(15px)" bg="rgba(0, 0, 0, 0.6)" />
      <ModalContent 
        bg="linear-gradient(135deg, var(--chakra-colors-dark-200) 0%, var(--chakra-colors-dark-300) 100%)" 
        borderRadius="xl" 
        borderColor="rgba(255, 255, 255, 0.08)"
        borderWidth="1px"
        boxShadow="0 20px 50px rgba(0, 0, 0, 0.4)"
      >
        <ModalHeader 
          borderBottomWidth="1px" 
          borderColor="rgba(255, 255, 255, 0.08)" 
          pb={4}
          fontWeight="600"
          color="white"
        >
          Settings
        </ModalHeader>

        <ModalCloseButton color="whiteAlpha.700" _hover={{ color: "white", bg: "rgba(255, 255, 255, 0.1)" }} />
        
        <ModalBody>
          <Tabs 
            variant="soft-rounded" 
            colorScheme="primary" 
            isLazy
          >
            <TabList mb={4}>
              <Tab 
                _selected={{ 
                  bg: "primary.500", 
                  color: "white",
                  fontWeight: "semibold",
                  boxShadow: "0 4px 10px rgba(90, 26, 255, 0.3)",
                }}
                fontWeight="medium"
                px={4}
                py={2}
                color="whiteAlpha.800"
                _hover={{ color: "white" }}
              >
                API
              </Tab>
              <Tab
                _selected={{ 
                  bg: "primary.500", 
                  color: "white",
                  fontWeight: "semibold",
                  boxShadow: "0 4px 10px rgba(90, 26, 255, 0.3)",
                }}
                fontWeight="medium"
                px={4}
                py={2}
                color="whiteAlpha.800"
                _hover={{ color: "white" }}
              >
                Nanda Servers
              </Tab>
              <Tab
                _selected={{ 
                  bg: "primary.500", 
                  color: "white",
                  fontWeight: "semibold",
                  boxShadow: "0 4px 10px rgba(90, 26, 255, 0.3)",
                }}
                fontWeight="medium"
                px={4}
                py={2}
                color="whiteAlpha.800"
                _hover={{ color: "white" }}
              >
                Tool Credentials
              </Tab>
              <Tab
                _selected={{ 
                  bg: "primary.500", 
                  color: "white",
                  fontWeight: "semibold",
                  boxShadow: "0 4px 10px rgba(90, 26, 255, 0.3)",
                }}
                fontWeight="medium"
                px={4}
                py={2}
                color="whiteAlpha.800"
                _hover={{ color: "white" }}
              >
                About
              </Tab>
            </TabList>

            <TabPanels>
              {/* API Settings Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel color="whiteAlpha.800">Anthropic API Key</FormLabel>
                    <InputGroup>
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="sk-ant-api03-..."
                        autoComplete="off"
                        variant="filled"
                        bg="rgba(0, 0, 0, 0.2)"
                        borderColor="rgba(255, 255, 255, 0.1)"
                        _hover={{
                          borderColor: "primary.400",
                        }}
                        _focus={{
                          borderColor: "primary.500",
                          bg: "rgba(0, 0, 0, 0.3)",
                        }}
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
                          color="whiteAlpha.700"
                          _hover={{ color: "white", bg: "rgba(255, 255, 255, 0.1)" }}
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormHelperText color="whiteAlpha.600">
                      You can get your API key from the{" "}
                      <Link
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        color="primary.300"
                        textDecoration="underline"
                        _hover={{ color: "primary.200" }}
                      >
                        Anthropic Console
                      </Link>
                    </FormHelperText>
                  </FormControl>

                  <Button 
                    colorScheme="primary" 
                    onClick={handleSaveApiKey}
                    boxShadow="0 4px 10px rgba(90, 26, 255, 0.3)"
                    _hover={{
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 15px rgba(90, 26, 255, 0.4)",
                    }}
                    transition="all 0.2s"
                  >
                    Save API Key
                  </Button>
                </VStack>
              </TabPanel>

              {/* Nanda Servers Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Heading size="sm" mb={3} color="whiteAlpha.900">
                      Registered Nanda Servers
                    </Heading>
                    {nandaServers.length === 0 ? (
                      <Text color="whiteAlpha.600">No servers registered yet</Text>
                    ) : (
                      nandaServers.map((server) => (
                        <Box
                          key={server.id}
                          p={3}
                          mb={3}
                          borderRadius="lg"
                          borderLeft="3px solid"
                          borderLeftColor="primary.500"
                          bg="rgba(0, 0, 0, 0.2)"
                          boxShadow="0 2px 6px rgba(0, 0, 0, 0.2)"
                          _hover={{
                            bg: "rgba(0, 0, 0, 0.25)",
                          }}
                          transition="all 0.2s"
                        >
                          <Flex justify="space-between">
                            <Box>
                              <Text fontWeight="bold" color="white">{server.name}</Text>
                              <Text fontSize="sm" color="whiteAlpha.700">
                                ID: {server.id}
                              </Text>
                              <Text fontSize="sm" color="whiteAlpha.700">
                                URL: {server.url}
                              </Text>
                            </Box>
                            <IconButton
                              aria-label="Remove server"
                              icon={<FaTrash />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => handleRemoveServer(server.id)}
                            />
                          </Flex>
                        </Box>
                      ))
                    )}
                  </Box>

                  <Divider borderColor="whiteAlpha.200" my={2} />

                  <Box>
                    <Heading size="sm" mb={3} color="whiteAlpha.900">
                      Add New Server
                    </Heading>

                    <VStack spacing={3} align="stretch">
                      <FormControl isRequired>
                        <FormLabel color="whiteAlpha.800">Server ID</FormLabel>
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

              {/* Tool Credentials Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Flex justify="space-between" align="center">
                    <Heading size="sm" mb={2}>
                      Tool API Credentials
                    </Heading>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      leftIcon={<FaSync />} 
                      onClick={loadToolsWithCredentials}
                      isLoading={isLoadingTools}
                    >
                      Refresh
                    </Button>
                  </Flex>
                  <Text fontSize="sm" color="gray.400" mb={4}>
                    Some tools require API keys or other credentials to function. 
                    Configure them here.
                  </Text>
                  
                  {isLoadingTools ? (
                    <Center py={10}>
                      <VStack spacing={4}>
                        <Spinner
                          thickness="4px"
                          speed="0.65s"
                          emptyColor="gray.700"
                          color="primary.500"
                          size="xl"
                        />
                        <Text color="gray.400">
                          {loadAttempts > 0 
                            ? `Loading tools (attempt ${loadAttempts+1}/4)...` 
                            : "Loading tools..."}
                        </Text>
                      </VStack>
                    </Center>
                  ) : toolsWithCredentials.length === 0 ? (
                    <Alert
                      status="info"
                      variant="subtle"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      textAlign="center"
                      borderRadius="md"
                      bg="rgba(0, 0, 0, 0.2)"
                      borderWidth="1px"
                      borderColor="blue.800"
                    >
                      <AlertIcon boxSize="40px" mr={0} color="blue.300" />
                      <AlertTitle mt={4} mb={1} fontSize="lg">
                        No tools found
                      </AlertTitle>
                      <AlertDescription maxWidth="sm">
                        {nandaServers.length === 0 ? (
                          <>
                            You need to register a Nanda server before tools will appear.
                            Go to the "Nanda Servers" tab to add a server.
                          </>
                        ) : (
                          <>
                            No tools requiring credentials were found.
                            Try refreshing or check your server configuration.
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {/* Group tools by server for better organization */}
                      {(() => {
                        // Create a map of serverId -> tools
                        const serverMap: Record<string, ToolCredentialInfo[]> = {};
                        
                        // Group tools by server
                        toolsWithCredentials.forEach(tool => {
                          if (!serverMap[tool.serverId]) {
                            serverMap[tool.serverId] = [];
                          }
                          serverMap[tool.serverId].push(tool);
                        });
                        
                        // Render each server group
                        return Object.entries(serverMap).map(([serverId, serverTools]) => {
                          const serverName = serverTools[0]?.serverName || serverId;
                          
                          return (
                            <Box key={serverId} mb={6}>
                              <Heading size="xs" color="primary.300" mb={3} p={2} bg="rgba(0,0,0,0.2)" borderRadius="md">
                                Server: {serverName}
                              </Heading>
                              <VStack spacing={4} align="stretch">
                                {serverTools.map((tool) => (
                                  <ToolCredentialForm
                                    key={`${tool.serverId}-${tool.toolName}`}
                                    tool={tool}
                                    onSave={setToolCredentials}
                                  />
                                ))}
                              </VStack>
                            </Box>
                          );
                        });
                      })()}
                    </>
                  )}
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
