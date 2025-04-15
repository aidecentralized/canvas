// server/src/registry/client.ts
import axios from "axios";
import { ServerConfig } from "../mcp/types.js";

interface RegistryConfig {
  url: string;
  apiKey?: string;
}

interface RegistryServerResponse {
  id: string;
  name: string;
  url: string;
  description: string;
  types: string[];
  tags: string[];
  verified: boolean;
  rating: number;
  uptime: number;
  logo_url: string;
}

// Interface for server configurations
export interface RegistryServer {
  id: string;
  name: string;
  url: string;
  description?: string;
  types?: string[];
  tags?: string[];
  verified?: boolean;
  rating?: number;
}

export class RegistryClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = 'https://nanda-registry.com', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Get popular servers from the registry
   */
  async getPopularServers(limit: number = 50): Promise<RegistryServer[]> {
    try {
      console.log(`Fetching popular servers from registry with limit ${limit}`);
      const response = await axios.get(`${this.baseUrl}/api/v1/discovery/popular/`, {
        params: { limit },
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
      });
      
      console.log(`Registry returned data structure:`, Object.keys(response.data));
      return this.processServerResponse(response.data);
    } catch (error) {
      console.error('Error fetching popular servers from registry:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response headers:', error.response?.headers);
        if (error.response?.data) {
          console.error('Response data:', JSON.stringify(error.response.data).substring(0, 500));
        }
      }
      return [];
    }
  }

  async getAllServers(limit: number = 100): Promise<RegistryServer[]> {
    try {
      console.log("📡 Fetching all servers from /api/v1/servers");
  
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }
  
      const response = await axios.get(`${this.baseUrl}/api/v1/servers`, {
        headers,
        params: { limit },
      });
  
      const servers = response.data?.data || [];
      console.log(`/servers returned ${servers.length} servers`);
      return this.processServerResponse(servers);
    } catch (error) {
      console.error("Error fetching from /servers endpoint, falling back to /popular:", error);
      return [];
    }
  }

  /**
   * Search for servers in the registry
   */
  async searchServers(query: string, options: {
    limit?: number,
    page?: number,
    tags?: string,
    type?: string,
    verified?: boolean
  } = {}): Promise<RegistryServer[]> {
    try {
      console.log(`Searching registry for "${query}" with options:`, options);
      const response = await axios.get(`${this.baseUrl}/api/v1/discovery/search/`, {
        params: {
          q: query,
          limit: options.limit || 50,
          page: options.page || 1,
          tags: options.tags,
          type: options.type,
          verified: options.verified
        },
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
      });
      
      console.log(`Registry search returned data structure:`, Object.keys(response.data));
      return this.processServerResponse(response.data);
    } catch (error) {
      console.error('Error searching servers in registry:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response headers:', error.response?.headers);
        if (error.response?.data) {
          console.error('Response data:', JSON.stringify(error.response.data).substring(0, 500));
        }
      }
      return [];
    }
  }


  //alyssa 
  async getServers(query?: string, options: any = {}): Promise<RegistryServer[]> {
    if (query) {
      const results = await this.searchServers(query, options);
      if (results.length > 0) {
        return results;
      }
    }
  
    // Try full /servers endpoint first
    const all = await this.getAllServers(options.limit);
    if (all.length > 0) return all;
  
    // Fall back to /popular if needed
    return this.getPopularServers(options.limit);
  }

  /**
   * Process and format server response from registry
   */
  private processServerResponse(data: any): RegistryServer[] {
    console.log("Processing server response");
    
    // Check if data is empty
    if (!data) {
      console.warn('Empty response from registry');
      return [];
    }
    
    // Check if the response has a data property (actual response format)
    if (data.data && Array.isArray(data.data)) {
      console.log(`Found ${data.data.length} servers in data property`);
      return data.data
        .filter(server => server && server.id && server.name && server.url)
        .map(this.formatServerData);
    }
    
    // Check for pagination structure in search results
    if (data.pagination && data.data && Array.isArray(data.data)) {
      console.log(`Found ${data.data.length} servers in paginated data`);
      return data.data
        .filter(server => server && server.id && server.name && server.url)
        .map(this.formatServerData);
    }
    
    // Check if the response is already an array
    if (Array.isArray(data)) {
      console.log(`Found ${data.length} servers in direct array`);
      return data
        .filter(server => server && server.id && server.name && server.url)
        .map(this.formatServerData);
    }
    
    // If we can't identify the structure, log and return empty array
    console.warn('Unknown response format from registry:', JSON.stringify(data).substring(0, 200));
    return [];
  }
  
  /**
   * Format server data consistently
   */
  private formatServerData = (server: any): RegistryServer => {
    let url = server.url;
    
    // Clean URL (remove trailing slashes)
    if (url && url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    // Ensure the URL has /sse suffix for MCP compatibility
    if (url && !url.endsWith('/sse')) {
      url = `${url}/sse`;
    }
    
    return {
      id: server.id,
      name: server.name,
      url,
      description: server.description,
      types: server.types,
      tags: server.tags,
      verified: server.verified,
      rating: server.rating
    };
  }

  /**
   * Fetches details for a specific server
   */
  async getServerDetails(serverId: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.get(
        `${this.baseUrl}/api/v1/servers/${serverId}/`,
        {
          headers,
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching server details for ${serverId}:`, error);
      return null;
    }
  }
}
