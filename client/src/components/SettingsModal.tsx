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
  Badge,
  HStack,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
} from "@chakra-ui/react";
import { FaEye, FaEyeSlash, FaPlus, FaExternalLinkAlt, FaSync } from "react-icons/fa";
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

// Define the ServerConfig interface for registry servers
interface ServerConfig {
  id: string;
  name: string;
  url: string;
  description?: string;
  types?: string[];
  tags?: string[];
  verified?: boolean;
  rating?: number;
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

// New component for displaying a registry server card
interface ServerCardProps {
  server: ServerConfig;
  onAdd: (server: ServerConfig) => void;
  isAlreadyAdded: boolean;
}

const ServerCard: React.FC<ServerCardProps> = ({ server, onAdd, isAlreadyAdded }) => {
  return (
    <Card 
      variant="outline" 
      borderWidth="1px" 
      borderColor="gray.700"
      bg="rgba(0, 0, 0, 0.2)"
      mb={4}
    >
      <CardHeader pb={2}>
        <Flex justify="space-between" align="center">
          <Heading size="sm" color="white">{server.name}</Heading>
          {server.verified && (
            <Badge colorScheme="green" variant="solid" fontSize="0.7em">
              Verified
            </Badge>
          )}
        </Flex>
      </CardHeader>
      
      <CardBody pt={0} pb={2}>
        <Text fontSize="sm" mb={2} color="gray.300">
          {server.description || "No description provided"}
        </Text>
        
        <HStack spacing={2} mb={2} wrap="wrap">
          {server.types?.map((type, index) => (
            <Badge key={`type-${index}`} colorScheme="blue" variant="subtle">
              {type}
            </Badge>
          ))}
          {server.tags?.map((tag, index) => (
            <Badge key={`tag-${index}`} colorScheme="purple" variant="subtle">
              {tag}
            </Badge>
          ))}
        </HStack>
        
        {server.rating && (
          <Text fontSize="sm" color="yellow.400">
            Rating: {server.rating.toFixed(1)}/5.0
          </Text>
        )}
      </CardBody>
      
      <CardFooter pt={1}>
        <Button
          size="sm"
          colorScheme={isAlreadyAdded ? "gray" : "crimson"}
          onClick={() => onAdd(server)}
          isDisabled={isAlreadyAdded}
          width="full"
        >
          {isAlreadyAdded ? "Already Added" : "Add Server"}
        </Button>
      </CardFooter>
    </Card>
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
    refreshRegistry
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
  
  // New state for registry servers
  const [registryServers, setRegistryServers] = useState<ServerConfig[]>([]);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);

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

  const loadToolsWithCredentials = async () => {
    // Clear any existing retry timers
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

  // Add a function to load registry servers
  const loadRegistryServers = async () => {
    setIsLoadingRegistry(true);
    try {
      const result = await refreshRegistry();
      if (result && result.servers) {
        setRegistryServers(result.servers);
        toast({
          title: "Registry servers loaded",
          description: `Found ${result.servers.length} servers in the registry`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error loading registry servers",
        description: error instanceof Error ? error.message : "Failed to load registry servers",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingRegistry(false);
    }
  };

  // Check if a server is already added
  const isServerAdded = (serverId: string) => {
    return nandaServers.some(server => server.id === serverId);
  };

  // Add server from registry
  const handleAddRegistryServer = (server: ServerConfig) => {
    if (isServerAdded(server.id)) return;
    
    // Make sure the URL has /sse at the end if not already
    let url = server.url;
    if (!url.endsWith("/sse")) {
      url = url.endsWith("/") ? `${url}sse` : `${url}/sse`;
    }
    
    const serverToAdd = {
      ...server,
      url
    };
    
    registerNandaServer(serverToAdd);
    
    toast({
      title: "Server added",
      description: `${server.name} has been added to your servers`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay backdropFilter="blur(10px)" />
      <ModalContent
        bg="rgba(20, 20, 20, 0.9)"
        color="white"
        borderRadius="md"
        border="1px solid"
        borderColor="gray.700"
      >
        <ModalHeader color="crimson.400">Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Tabs colorScheme="crimson" variant="enclosed">
            <TabList>
              <Tab>API Key</Tab>
              <Tab>MCP Servers</Tab>
              <Tab>Credentials</Tab>
              <Tab>Registry</Tab>
            </TabList>
            
            <TabPanels>
              {/* API Key Tab Panel - Existing */}
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
              
              {/* MCP Servers Tab Panel - Existing */}
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
                          <Text fontWeight="bold" color="white">{server.name}</Text>
                          <Text fontSize="sm" color="whiteAlpha.700">
                            ID: {server.id}
                          </Text>
                          <Text fontSize="sm" color="whiteAlpha.700">
                            URL: {server.url}
                          </Text>
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
              
              {/* Credentials Tab Panel - Existing */}
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
                    <Flex justify="center" py={10}>
                      <Spinner size="lg" color="crimson.500" />
                    </Flex>
                  ) : toolsWithCredentials.length === 0 ? (
                    <Box p={5} borderRadius="md" bg="rgba(0, 0, 0, 0.2)" textAlign="center">
                      <Text color="gray.400" mb={2}>
                        No tools requiring credentials found.
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Make sure you've added a server with tools that need API keys.
                        <br/>After adding a server, click the Refresh button above.
                      </Text>
                    </Box>
                  ) : (
                    <Accordion allowToggle defaultIndex={[0]}>
                      {toolsWithCredentials.map((tool, index) => (
                        <AccordionItem key={`${tool.serverId}-${tool.toolName}`} border="none">
                          <h2>
                            <AccordionButton 
                              _hover={{ bg: "rgba(255, 255, 255, 0.05)" }}
                              borderRadius="md"
                            >
                              <Box as="span" flex='1' textAlign='left'>
                                {tool.toolName}
                              </Box>
                              <AccordionIcon />
                            </AccordionButton>
                          </h2>
                          <AccordionPanel pb={4}>
                            <ToolCredentialForm
                              tool={tool}
                              onSave={setToolCredentials}
                            />
                          </AccordionPanel>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </VStack>
              </TabPanel>
              
              {/* New Registry Tab Panel */}
              <TabPanel>
                <Box mb={4}>
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="md">Registry Servers</Heading>
                    <Button 
                      leftIcon={<FaSync />} 
                      colorScheme="crimson" 
                      size="sm" 
                      onClick={loadRegistryServers}
                      isLoading={isLoadingRegistry}
                    >
                      Refresh
                    </Button>
                  </Flex>
                  
                  {isLoadingRegistry ? (
                    <Flex justify="center" align="center" minH="200px">
                      <Spinner color="crimson.500" />
                    </Flex>
                  ) : registryServers.length > 0 ? (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {registryServers.map(server => (
                        <ServerCard
                          key={server.id}
                          server={server}
                          onAdd={handleAddRegistryServer}
                          isAlreadyAdded={isServerAdded(server.id)}
                        />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Box 
                      p={4} 
                      borderRadius="md" 
                      borderWidth="1px" 
                      borderColor="gray.700"
                      bg="rgba(0, 0, 0, 0.2)"
                      textAlign="center"
                    >
                      <Text>No registry servers found. Click Refresh to load servers.</Text>
                    </Box>
                  )}
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        
        <ModalFooter>
          <Button colorScheme="crimson" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SettingsModal;
