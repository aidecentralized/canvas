"use client"
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
  IconButton,
  InputGroup,
  InputRightElement,
  useToast,
  UseToastOptions,
  HStack,
} from "@chakra-ui/react";
import {
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { useSettingsContext } from "../contexts/SettingsContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { apiKey, setApiKey, nandaServers, registerNandaServer, removeNandaServer } =
    useSettingsContext();
  const [tempApiKey, setTempApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [newServer, setNewServer] = useState({
    id: "",
    name: "",
    url: "",
  });
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
    } as UseToastOptions);
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
      } as UseToastOptions);
      return;
    }

    // Validate URL
    try {
      new URL(newServer.url);
    } catch {
      toast({
        title: "Invalid URL",
        description:
          "Please enter a valid URL (e.g., http://localhost:3001/sse)",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      } as UseToastOptions);
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
    } as UseToastOptions);
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
                        color={"black"}
                      />
                      <InputRightElement>
                        <IconButton
                          aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
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
                          <HStack justify="space-between" align="center">
                            <Box>
                              <Text fontWeight="bold">{server.name}</Text>
                              <Text fontSize="sm" color="gray.400">
                                ID: {server.id}
                              </Text>
                              <Text fontSize="sm" color="gray.400">
                                URL: {server.url}
                              </Text>
                            </Box>
                            <IconButton
                              aria-label="Remove server"
                              icon={<FaTrash />}
                              colorScheme="red"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNandaServer(server.id)}
                            />
                          </HStack>
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
                          placeholder="e.g., nanda-server-1"
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
                          placeholder="e.g., Local Development Server"
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
                          placeholder="e.g., http://localhost:3001/sse"
                        />
                        <FormHelperText>
                          The SSE endpoint URL for this server
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
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SettingsModal;
