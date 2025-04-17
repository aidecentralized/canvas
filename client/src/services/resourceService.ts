// client/src/services/resourceService.ts
import { Resource, ResourceTemplate, ResourceContent } from '../types/resource';

// Fix for undefined environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// Resource service for interacting with MCP resources
class ResourceService {
  private getSessionId(): string {
    return localStorage.getItem('nanda-session-id') || '';
  }

  // List all available resources
  async listResources(serverId?: string): Promise<Resource[]> {
    try {
      const url = new URL(`${API_BASE_URL}/api/resources`);
      if (serverId) {
        url.searchParams.append('serverId', serverId);
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.getSessionId(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to list resources: ${response.status}`);
      }

      const data = await response.json();
      return data.resources || [];
    } catch (error) {
      console.error('Error listing resources:', error);
      throw error;
    }
  }

  // List resource templates
  async listResourceTemplates(serverId?: string): Promise<ResourceTemplate[]> {
    try {
      const url = new URL(`${API_BASE_URL}/api/resources/templates`);
      if (serverId) {
        url.searchParams.append('serverId', serverId);
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.getSessionId(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to list resource templates: ${response.status}`);
      }

      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error('Error listing resource templates:', error);
      throw error;
    }
  }

  // Read a resource content
  async readResource(uri: string): Promise<ResourceContent[]> {
    try {
      const url = new URL(`${API_BASE_URL}/api/resources/read`);
      url.searchParams.append('uri', uri);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.getSessionId(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to read resource: ${response.status}`);
      }

      const data = await response.json();
      return data.contents || [];
    } catch (error) {
      console.error(`Error reading resource ${uri}:`, error);
      throw error;
    }
  }

  // Subscribe to resource updates
  async subscribeToResource(uri: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resources/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.getSessionId(),
        },
        body: JSON.stringify({ uri }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to subscribe to resource: ${response.status}`);
      }

      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error(`Error subscribing to resource ${uri}:`, error);
      throw error;
    }
  }

  // Unsubscribe from resource updates
  async unsubscribeFromResource(uri: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resources/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.getSessionId(),
        },
        body: JSON.stringify({ uri }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to unsubscribe from resource: ${response.status}`);
      }

      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error(`Error unsubscribing from resource ${uri}:`, error);
      throw error;
    }
  }
}

export const resourceService = new ResourceService();