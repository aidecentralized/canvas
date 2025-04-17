// client/src/components/ResourceExplorer.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  List,
  ListItem,
  Text,
  Flex,
  Button,
  IconButton,
  Spinner,
  VStack,
  Badge,
  Divider,
  Input,
  InputGroup,
  InputLeftElement,
  useColorModeValue,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FaSearch, FaSync, FaBell, FaBellSlash, FaDownload, FaCode, FaFile, FaFileAlt, FaImage, FaFolder } from 'react-icons/fa';
import { useResourceContext } from '../contexts/ResourceContext';
import { Resource } from '../types/resource';

// Helper function to get appropriate icon for a resource based on MIME type
const getResourceIcon = (resource: Resource) => {
  const mimeType = resource.mimeType || '';
  
  if (mimeType.startsWith('image/')) {
    return <FaImage />;
  } else if (mimeType.startsWith('text/')) {
    if (mimeType.includes('html') || mimeType.includes('xml')) {
      return <FaCode />;
    }
    return <FaFileAlt />;
  } else if (mimeType.includes('json') || mimeType.includes('javascript')) {
    return <FaCode />;
  }
  
  // Default icon
  return <FaFile />;
};

const ResourceExplorer: React.FC = () => {
  const {
    resources,
    resourceTemplates,
    loadingResources,
    selectedResource,
    resourceContent,
    loadingContent,
    error,
    refreshResources,
    selectResource,
    subscribeToResource,
    unsubscribeFromResource
  } = useResourceContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByServer, setFilterByServer] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  
  // Filter resources based on search query and selected server
  const filteredResources = resources.filter(resource => {
    // Apply server filter if set
    if (filterByServer && !resource.uri.startsWith(`${filterByServer}://`)) {
      return false;
    }
    
    // Apply search filter if query exists
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        resource.name.toLowerCase().includes(searchLower) ||
        resource.uri.toLowerCase().includes(searchLower) ||
        (resource.description || '').toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
  
  // Extract a list of unique server IDs from resource URIs
  const servers = Array.from(new Set(resources.map(r => {
    const match = r.uri.match(/^([^:]+):\/\//);
    return match ? match[1] : 'unknown';
  })));
  
  // Toggle subscription for the selected resource
  const toggleSubscription = async (uri: string) => {
    if (subscribed.has(uri)) {
      await unsubscribeFromResource(uri);
      setSubscribed(prev => {
        const next = new Set(prev);
        next.delete(uri);
        return next;
      });
    } else {
      await subscribeToResource(uri);
      setSubscribed(prev => {
        const next = new Set(prev);
        next.add(uri);
        return next;
      });
    }
  };
  
  // Render resource content based on mime type
  const renderResourceContent = () => {
    if (!resourceContent || resourceContent.length === 0) {
      return <Text>No content available</Text>;
    }
    
    return resourceContent.map((content, index) => {
      const mimeType = content.mimeType || '';
      
      if (content.text) {
        if (mimeType.includes('json')) {
          try {
            const jsonData = JSON.parse(content.text);
            return (
              <Box key={index} overflowX="auto" w="100%">
                <Code p={2} display="block" whiteSpace="pre" borderRadius="md">
                  {JSON.stringify(jsonData, null, 2)}
                </Code>
              </Box>
            );
          } catch (e) {
            // Fallback to plain text if JSON parsing fails
            return (
              <Code key={index} p={2} display="block" whiteSpace="pre" borderRadius="md">
                {content.text}
              </Code>
            );
          }
        } else if (mimeType.includes('html')) {
          return (
            <Box key={index} p={2} border="1px" borderColor="gray.200" borderRadius="md">
              <div dangerouslySetInnerHTML={{ __html: content.text }} />
            </Box>
          );
        } else {
          // Plain text
          return (
            <Code key={index} p={2} display="block" whiteSpace="pre" borderRadius="md">
              {content.text}
            </Code>
          );
        }
      } else if (content.blob) {
        if (mimeType.startsWith('image/')) {
          return (
            <Box key={index} p={2}>
              <img src={`data:${mimeType};base64,${content.blob}`} alt="Resource content" style={{ maxWidth: '100%' }} />
            </Box>
          );
        } else {
          return (
            <Flex key={index} p={2} align="center">
              <FaFile />
              <Text ml={2}>Binary content (base64): {content.blob.substring(0, 30)}...</Text>
              <Button
                size="sm"
                ml={2}
                leftIcon={<FaDownload />}
                onClick={() => {
                  // Create a download link for the blob data
                  const link = document.createElement('a');
                  link.href = `data:${mimeType};base64,${content.blob}`;
                  link.download = content.uri.split('/').pop() || 'download';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Download
              </Button>
            </Flex>
          );
        }
      } else {
        return <Text key={index}>Empty content</Text>;
      }
    });
  };
  
  return (
    <Box p={4} borderRadius="md" bg="rgba(0, 0, 0, 0.1)" backdropFilter="blur(8px)">
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Resource Explorer</Heading>
        <Button
          size="sm"
          leftIcon={<FaSync />}
          isLoading={loadingResources}
          onClick={() => refreshResources(filterByServer || undefined)}
        >
          Refresh
        </Button>
      </Flex>
      
      <Flex mb={4} wrap="wrap" gap={2}>
        <InputGroup maxW="300px">
          <InputLeftElement pointerEvents="none">
            <FaSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="white"
            size="sm"
          />
        </InputGroup>
        
        <Button
          size="sm"
          variant={filterByServer === null ? "solid" : "outline"}
          colorScheme="blue"
          onClick={() => setFilterByServer(null)}
        >
          All Servers
        </Button>
        
        {servers.map(server => (
          <Button
            key={server}
            size="sm"
            variant={filterByServer === server ? "solid" : "outline"}
            colorScheme="blue"
            onClick={() => setFilterByServer(filterByServer === server ? null : server)}
          >
            {server}
          </Button>
        ))}
      </Flex>
      
      <Flex height="600px">
        {/* Resources List */}
        <Box width="30%" borderRight="1px" borderColor="gray.300" pr={2} overflowY="auto">
          {loadingResources ? (
            <Flex justify="center" align="center" height="100%">
              <Spinner />
            </Flex>
          ) : filteredResources.length === 0 ? (
            <Text color="gray.500" textAlign="center" mt={10}>
              No resources found
            </Text>
          ) : (
            <List spacing={1}>
              {filteredResources.map(resource => (
                <ListItem
                  key={resource.uri}
                  p={2}
                  borderRadius="md"
                  cursor="pointer"
                  bg={selectedResource?.uri === resource.uri ? "blue.100" : "transparent"}
                  color={selectedResource?.uri === resource.uri ? "blue.800" : "inherit"}
                  _hover={{ bg: "gray.100" }}
                  onClick={() => selectResource(resource)}
                >
                  <Flex align="center">
                    <Box mr={2} color="gray.600">
                      {getResourceIcon(resource)}
                    </Box>
                    <Box flex="1">
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {resource.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500" noOfLines={1}>
                        {resource.uri}
                      </Text>
                    </Box>
                  </Flex>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        
        {/* Resource Content */}
        <Box width="70%" pl={4} overflowY="auto">
          {selectedResource ? (
            <VStack align="stretch" spacing={4}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Heading size="sm">{selectedResource.name}</Heading>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {selectedResource.uri}
                  </Text>
                </Box>
                <IconButton
                  aria-label={subscribed.has(selectedResource.uri) ? "Unsubscribe" : "Subscribe"}
                  icon={subscribed.has(selectedResource.uri) ? <FaBellSlash /> : <FaBell />}
                  size="sm"
                  onClick={() => toggleSubscription(selectedResource.uri)}
                />
              </Flex>
              
              <Flex wrap="wrap" gap={2}>
                {selectedResource.mimeType && (
                  <Badge colorScheme="blue">{selectedResource.mimeType}</Badge>
                )}
              </Flex>
              
              {selectedResource.description && (
                <Box>
                  <Text fontSize="sm">{selectedResource.description}</Text>
                </Box>
              )}
              
              <Divider />
              
              <Box>
                <Heading size="xs" mb={2}>Resource Content</Heading>
                {loadingContent ? (
                  <Flex justify="center" p={4}>
                    <Spinner />
                  </Flex>
                ) : error ? (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {error}
                  </Alert>
                ) : (
                  renderResourceContent()
                )}
              </Box>
            </VStack>
          ) : (
            <Flex
              height="100%"
              justify="center"
              align="center"
              color="gray.500"
              direction="column"
            >
              <FaFolder size="40px" style={{ marginBottom: '16px', opacity: 0.5 }} />
              <Text>Select a resource to view its content</Text>
            </Flex>
          )}
        </Box>
      </Flex>
      
      {resourceTemplates.length > 0 && (
        <Box mt={6}>
          <Accordion allowToggle>
            <AccordionItem>
              <AccordionButton>
                <Box as="span" flex='1' textAlign='left'>
                  <Heading size="sm">Resource Templates ({resourceTemplates.length})</Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel>
                <List spacing={3}>
                  {resourceTemplates.map(template => (
                    <ListItem key={template.uriTemplate} p={2} bg="gray.50" borderRadius="md">
                      <Heading size="xs">{template.name}</Heading>
                      <Text fontSize="sm" fontFamily="monospace" mt={1}>
                        {template.uriTemplate}
                      </Text>
                      {template.description && (
                        <Text fontSize="sm" mt={1}>
                          {template.description}
                        </Text>
                      )}
                      {template.mimeType && (
                        <Badge mt={2} colorScheme="blue">{template.mimeType}</Badge>
                      )}
                    </ListItem>
                  ))}
                </List>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Box>
      )}
    </Box>
  );
};

export default ResourceExplorer;