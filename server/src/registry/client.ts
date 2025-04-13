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

export class RegistryClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: RegistryConfig) {
    this.baseUrl = config.url;
    this.apiKey = config.apiKey;
    
    // Log the registry configuration
    console.log(`RegistryClient initialized with baseUrl: ${this.baseUrl}`);
    console.log(`API Key provided: ${this.apiKey ? 'Yes' : 'No'}`);
  }

  /**
   * Gets a list of available servers from the registry.
   * First tries to get servers via search, and falls back to popular servers if needed.
   */
  async getServers(limit: number = 500): Promise<ServerConfig[]> {
    console.log(`Getting up to ${limit} servers from registry...`);
    
    // First attempt: Try to get servers via the search endpoint
    try {
      const searchResults = await this.searchServers(limit);
      console.log(`Search returned ${searchResults.length} servers`);
      
      if (searchResults.length > 0) {
        console.log(`Successfully found ${searchResults.length} servers via search`);
        return searchResults;
      } else {
        console.log('Search returned no results, falling back to popular servers');
      }
    } catch (error) {
      console.error('Error during server search, falling back to popular servers:', error);
    }
    
    // Fallback: Try to get popular servers
    try {
      console.log(`Fetching up to ${limit} popular servers as fallback`);
      const popularServers = await this.getPopularServers(limit);
      console.log(`Found ${popularServers.length} popular servers from registry`);
      return popularServers;
    } catch (error) {
      console.error('Error fetching popular servers:', error);
      return [];
    }
  }
  
  /**
   * Search for servers in the registry
   * This endpoint doesn't require authentication
   */
  async searchServers(limit: number = 100): Promise<ServerConfig[]> {
    try {
      // Make sure the URL ends with a slash for API compatibility
      const searchEndpoint = `${this.baseUrl}/api/v1/discovery/search/`;
      console.log(`Searching for servers using endpoint: ${searchEndpoint}`);
      
      // Search parameters - specify an empty query to get all servers
      const params = {
        q: "",  // Empty query to return all servers
        limit: limit
      };
      
      console.log(`Search parameters:`, params);
      
      const response = await axios.get(searchEndpoint, { 
        params: params 
      });
      
      console.log(`Search response status: ${response.status}`);
      console.log(`Search response data:`, response.data);
      
      // Extract server information from the response
      const servers = response.data.data || [];
      return this.processServerResponse(servers);
    } catch (error) {
      console.error("Error searching servers from registry:");
      if (axios.isAxiosError(error)) {
        console.error(`Status: ${error.response?.status}`);
        console.error(`Data:`, error.response?.data);
        console.error(`Message: ${error.message}`);
      } else {
        console.error(error);
      }
      return [];
    }
  }
  
  /**
   * Fetches popular MCP servers from the discovery endpoint
   * This endpoint doesn't require authentication
   */
  async getPopularServers(limit: number = 100): Promise<ServerConfig[]> {
    try {
      console.log("Fetching popular servers from discovery endpoint");
      const response = await axios.get(`${this.baseUrl}/api/v1/discovery/popular/`, { params: { limit: limit } });
      
      console.log("Popular servers response:", response.data);
      
      // Extract server information from the response
      const servers = response.data.data || [];
      return this.processServerResponse(servers);
    } catch (error) {
      console.error("Error fetching popular servers from registry:", error);
      return [];
    }
  }

  /**
   * Processes the server response to filter and format servers
   */
  private processServerResponse(servers: RegistryServerResponse[]): ServerConfig[] {
    // Filter to include only servers with valid URLs
    // Exclude GitHub URLs as they're likely just source code repos
    return servers
      .filter((server: RegistryServerResponse) => {
        return (
          server.url &&
          server.url.trim() !== "" &&
          !server.url.includes("github.com") &&
          !server.url.includes("gitlab.com")
        );
      })
      .map((server: RegistryServerResponse) => {
        let url = server.url;
        if (url.endsWith("/")) {
          url = url.slice(0, -1);
        }
        // remove sse if it is present in the url
        if (url.endsWith("/sse")) {
          url = url.slice(0, -4);
        }
        return {
          id: server.id,
          name: server.name,
          url: url + "/sse",
          description: server.description,
          types: server.types,
          tags: server.tags,
          verified: server.verified,
          rating: server.rating,
        };
      });
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
