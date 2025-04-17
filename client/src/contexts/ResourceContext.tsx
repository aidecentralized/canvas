// client/src/contexts/ResourceContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socketService';
import { resourceService } from '../services/resourceService';
import { Resource, ResourceTemplate, ResourceContent, ResourceUpdateNotification } from '../types/resource';
import { useSettingsContext } from './SettingsContext';
import { useToast } from '@chakra-ui/react';

interface ResourceContextProps {
  resources: Resource[];
  resourceTemplates: ResourceTemplate[];
  loadingResources: boolean;
  selectedResource: Resource | null;
  resourceContent: ResourceContent[] | null;
  loadingContent: boolean;
  error: string | null;
  refreshResources: (serverId?: string) => Promise<void>;
  selectResource: (resource: Resource | null) => void;
  readResource: (uri: string) => Promise<void>;
  subscribeToResource: (uri: string) => Promise<void>;
  unsubscribeFromResource: (uri: string) => Promise<void>;
}

const ResourceContext = createContext<ResourceContextProps>({
  resources: [],
  resourceTemplates: [],
  loadingResources: false,
  selectedResource: null,
  resourceContent: null,
  loadingContent: false,
  error: null,
  refreshResources: async () => {},
  selectResource: () => {},
  readResource: async () => {},
  subscribeToResource: async () => {},
  unsubscribeFromResource: async () => {},
});

export const useResourceContext = () => useContext(ResourceContext);

interface ResourceProviderProps {
  children: React.ReactNode;
}

export const ResourceProvider: React.FC<ResourceProviderProps> = ({ children }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceTemplates, setResourceTemplates] = useState<ResourceTemplate[]>([]);
  const [loadingResources, setLoadingResources] = useState<boolean>(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceContent, setResourceContent] = useState<ResourceContent[] | null>(null);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubscriptions] = useState<Set<string>>(new Set());
  
  const { nandaServers, sessionId } = useSettingsContext();
  const toast = useToast();
  
  // Read resource content - define this first to avoid reference issues
  const readResource = useCallback(async (uri: string) => {
    setLoadingContent(true);
    setError(null);
    
    try {
      const content = await resourceService.readResource(uri);
      setResourceContent(content);
    } catch (err) {
      console.error(`Error reading resource ${uri}:`, err);
      setError(err instanceof Error ? err.message : `Failed to read resource ${uri}`);
      setResourceContent(null);
      
      toast({
        title: "Error Reading Resource",
        description: err instanceof Error ? err.message : `Failed to read resource ${uri}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingContent(false);
    }
  }, [toast]);
  
  // Refresh resources from all servers or a specific server - define this before it's used in useEffect
  const refreshResources = useCallback(async (serverId?: string) => {
    if (!sessionId) return;
    
    setLoadingResources(true);
    setError(null);
    
    try {
      // Get resources and templates
      const [newResources, newTemplates] = await Promise.all([
        resourceService.listResources(serverId),
        resourceService.listResourceTemplates(serverId)
      ]);
      
      setResources(newResources);
      setResourceTemplates(newTemplates);
    } catch (err) {
      console.error('Error loading resources:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resources');
      
      toast({
        title: "Error Loading Resources",
        description: err instanceof Error ? err.message : 'Failed to load resources',
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingResources(false);
    }
  }, [sessionId, toast]);
  
  // Select a resource
  const selectResource = useCallback((resource: Resource | null) => {
    setSelectedResource(resource);
    setResourceContent(null);
    
    if (resource) {
      readResource(resource.uri);
    }
  }, [readResource]);

  // Subscribe to resource updates
  const subscribeToResource = useCallback(async (uri: string) => {
    if (activeSubscriptions.has(uri)) {
      return; // Already subscribed
    }
    
    try {
      const success = await resourceService.subscribeToResource(uri);
      
      if (success) {
        activeSubscriptions.add(uri);
        console.log(`Subscribed to resource ${uri}`);
        
        toast({
          title: "Subscription Active",
          description: `You'll receive updates for ${uri}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(`Error subscribing to resource ${uri}:`, err);
      
      toast({
        title: "Subscription Error",
        description: err instanceof Error ? err.message : `Failed to subscribe to ${uri}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [activeSubscriptions, toast]);

  // Unsubscribe from resource updates
  const unsubscribeFromResource = useCallback(async (uri: string) => {
    if (!activeSubscriptions.has(uri)) {
      return; // Not subscribed
    }
    
    try {
      const success = await resourceService.unsubscribeFromResource(uri);
      
      if (success) {
        activeSubscriptions.delete(uri);
        console.log(`Unsubscribed from resource ${uri}`);
        
        toast({
          title: "Unsubscribed",
          description: `You'll no longer receive updates for ${uri}`,
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(`Error unsubscribing from resource ${uri}:`, err);
      
      toast({
        title: "Unsubscribe Error",
        description: err instanceof Error ? err.message : `Failed to unsubscribe from ${uri}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [activeSubscriptions, toast]);
  
  // Load resources when servers change
  useEffect(() => {
    if (sessionId && nandaServers.length > 0) {
      refreshResources();
    }
  }, [nandaServers, sessionId, refreshResources]);

  // Set up socket listeners for resource updates
  useEffect(() => {
    const handleResourcesListChanged = (data: { serverId: string }) => {
      console.log(`Resources list changed for server ${data.serverId}`);
      
      // Refresh resources when the list changes
      refreshResources(data.serverId);
      
      // Show notification
      toast({
        title: "Resources Updated",
        description: `Resource list has been updated on server: ${data.serverId}`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    };
    
    const handleResourceUpdated = (data: ResourceUpdateNotification) => {
      console.log(`Resource updated: ${data.uri} from server ${data.serverId}`);
      
      // If this is the currently selected resource, refresh its content
      if (selectedResource && selectedResource.uri === data.uri) {
        readResource(data.uri);
      }
      
      // Show notification
      toast({
        title: "Resource Updated",
        description: `Resource ${data.uri} has been updated.`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    };
    
    // Use public methods instead of directly accessing socket
    socketService.addResourcesListChangedHandler(handleResourcesListChanged);
    socketService.addResourceUpdatedHandler(handleResourceUpdated);
    
    return () => {
      socketService.removeResourcesListChangedHandler(handleResourcesListChanged);
      socketService.removeResourceUpdatedHandler(handleResourceUpdated);
    };
  }, [selectedResource, toast, refreshResources, readResource]);

  // Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all active subscriptions
      activeSubscriptions.forEach(uri => {
        resourceService.unsubscribeFromResource(uri)
          .catch(err => console.error(`Error unsubscribing from ${uri}:`, err));
      });
    };
  }, [activeSubscriptions]);

  const value = {
    resources,
    resourceTemplates,
    loadingResources,
    selectedResource,
    resourceContent,
    loadingContent,
    error,
    refreshResources,
    selectResource,
    readResource,
    subscribeToResource,
    unsubscribeFromResource,
  };

  return (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  );
};