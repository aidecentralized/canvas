// server/src/registry/client.ts
import axios from "axios";
import { ServerConfig } from "../mcp/manager.js";

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
  }

  /**
   * Fetches available MCP servers from the registry
   */
  async getServers(): Promise<ServerConfig[]> {
    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.get(`${this.baseUrl}/api/v1/servers/`, {
        headers,
        params: {
          // Filtering parameters can be added here if the registry API supports them
          // e.g., verified: true, types: 'tool', tags: 'weather', etc.
        },
      });

      console.log("Response from registry:", response.data.data);

      // Extract server information from the response
      const servers = response.data.data || [];

      // Filter to include only servers with valid SSE URLs
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
    } catch (error) {
      console.error("Error fetching servers from registry:", error);
      return [];
    }
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
