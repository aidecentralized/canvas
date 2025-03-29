import axios from "axios";
import { ServerConfig, TransportType } from "@/lib/mcp/connection";
import { v4 as uuidv4 } from "uuid";

const API_URL = import.meta.env.VITE_MCP_REGISTRY_URL || "/api/v1/";

// API interfaces
interface RegistryServer {
  id: string;
  name: string;
  description: string;
  provider: string;
  url: string;
  types: string[];
  tags: string[];
  verified: boolean;
  uptime: number;
  usage_count: number;
  transport_config: {
    type: string;
    stdio?: {
      command: string;
      args: string[];
    };
    sse?: {
      url: string;
      messageEndpoint: string;
      authRequired: boolean;
      authType: string;
    };
  };
}

interface SearchParams {
  query?: string;
  type?: string;
  tags?: string[];
  verified?: boolean;
  page?: number;
  limit?: number;
}

// Map registry server to our ServerConfig format
const mapToServerConfig = (server: RegistryServer): ServerConfig => {
  console.log("....Mapping server:", server);
  //  FIXME: Remove this hardcoded transport type
  const transportType: TransportType = "sse";
  // server.transport_config.type === "stdio" ? "stdio" : "sse";

  let transportConfig: any;

  // if (transportType === "stdio") {
  //   transportConfig = {
  //     command: server.transport_config.stdio?.command || "",
  //     args: server.transport_config.stdio?.args || [],
  //   };
  // } else {
  transportConfig = {
    // url: server.transport_config.sse?.url || server.url,
    url: server.url,
    messageEndpoint: "/messages",
    headers: {},
  };
  // }

  return {
    id: server.id || uuidv4(),
    name: server.name,
    description: server.description,
    transport: {
      type: transportType,
      config: transportConfig,
    },
    enabled: false, // Discovered servers are disabled by default
  };
};

// Fetch servers from the registry
export const fetchServersFromRegistry = async (
  params: SearchParams = {}
): Promise<ServerConfig[]> => {
  try {
    const response = await axios.get(`${API_URL}/servers`, { params });

    if (response.data && response.data.data) {
      return response.data.data.map(mapToServerConfig);
    }

    return [];
  } catch (error) {
    console.error("Error fetching servers from registry:", error);
    throw error;
  }
};

// Search for servers in the registry
export const searchServers = async (
  searchParams: SearchParams
): Promise<ServerConfig[]> => {
  try {
    const response = await axios.get(`${API_URL}/search`, {
      params: searchParams,
    });

    if (response.data && response.data.data) {
      return response.data.data.map(mapToServerConfig);
    }

    return [];
  } catch (error) {
    console.error("Error searching servers in registry:", error);
    throw error;
  }
};

// Get server details by ID
export const getServerDetails = async (
  serverId: string
): Promise<ServerConfig | null> => {
  try {
    const response = await axios.get(`${API_URL}/servers/${serverId}`);

    if (response.data) {
      return mapToServerConfig(response.data);
    }

    return null;
  } catch (error) {
    console.error(`Error fetching server details for ID ${serverId}:`, error);
    throw error;
  }
};

// Get popular servers
export const getPopularServers = async (
  limit: number = 10
): Promise<ServerConfig[]> => {
  try {
    const response = await axios.get(`${API_URL}/popular`, {
      params: { limit },
    });

    if (response.data && response.data.data) {
      return response.data.data.map(mapToServerConfig);
    }

    return [];
  } catch (error) {
    console.error("Error fetching popular servers:", error);
    throw error;
  }
};

// Get recommended servers
export const getRecommendedServers = async (
  limit: number = 5
): Promise<ServerConfig[]> => {
  try {
    const response = await axios.get(`${API_URL}/recommend`, {
      params: { limit },
    });

    if (response.data && response.data.data) {
      return response.data.data.map(mapToServerConfig);
    }

    return [];
  } catch (error) {
    console.error("Error fetching recommended servers:", error);
    throw error;
  }
};
