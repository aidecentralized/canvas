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
} from "@chakra-ui/react";
import { FaEye, FaEyeSlash, FaPlus, FaExternalLinkAlt } from "react-icons/fa";
import { useSettingsContext } from "../contexts/SettingsContext";
import { ToolCredentialInfo, CredentialRequirement } from "../../shared/types";

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
    setToolCredentials
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
  const toast = useToast();

  // Reset temp values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempApiKey(apiKey || "");
      setShowApiKey(false);
      loadToolsWithCredentials();
    }
  }, [isOpen, apiKey]);

  const loadToolsWithCredentials = async () => {
    setIsLoadingTools(true);
    try {
      const tools = await getToolsWithCredentialRequirements();
      setToolsWithCredentials(tools);
    } catch (error) {
      console.error("Failed to load tools with credential requirements:", error);
      toast({
        title: "Error",
        description: "Failed to load tools that require credentials",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingTools(false);
    }
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

    // Reload tools with credentials after adding a server
    setTimeout(() => {
      loadToolsWithCredentials();
    }, 1000);

    toast({
      title: "Server Added",
      description: `Server "${newServer.name}" has been added`,
      status: "success",
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
        <ModalBody>
          <Tabs variant="soft-rounded" colorScheme="crimson">
            <TabList>
              <Tab>API</Tab>
              <Tab>Nanda Servers</Tab>
              <Tab>Tool Credentials</Tab>
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

              {/* Tool Credentials Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Heading size="sm" mb={2}>
                    Tool API Credentials
                  </Heading>
                  <Text fontSize="sm" color="gray.400" mb={4}>
                    Some tools require API keys or other credentials to function. 
                    Configure them here.
                  </Text>
                  
                  {isLoadingTools ? (
                    <Text>Loading tools...</Text>
                  ) : toolsWithCredentials.length === 0 ? (
                    <Text color="gray.400">
                      No tools requiring credentials found. Try adding servers with tools that need credentials.
                    </Text>
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
