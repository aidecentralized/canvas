// server/src/mcp/manager.ts
import { Server as SocketIoServer } from "socket.io";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolRegistry } from "./toolRegistry.js";
import { SessionManager } from "./sessionManager.js";
import { ToolInfo, CredentialRequirement, ServerConfig } from "./types.js";
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Disable server-side persistence - we'll use browser-based storage instead
// const STORAGE_DIR = process.env.MCP_STORAGE_DIR || path.join(process.cwd(), 'storage');
// const SERVERS_FILE = path.join(STORAGE_DIR, 'servers.json');

// // Ensure the file is only readable by the server process
// try {
//   fs.chmodSync(SERVERS_FILE, 0o600);
// } catch (error) {
//   console.warn('Unable to set file permissions, server configuration may not be secure');
// }

// Disable loading servers from file - rely on client registrations only
const loadServers = (): ServerConfig[] => {
  // No longer loading from server-side file storage
  console.log('Server storage disabled - using client-side storage only');
  return []; // Return empty array - servers will be registered by clients
};

// Disable saving servers to file
const saveServers = (servers: ServerConfig[]) => {
  // No longer saving to server-side file storage
  // No-op - clients are responsible for persisting their servers
  console.log('Server saving disabled - using client-side storage only');
};


interface ToolCredentialInfo {
  toolName: string;
  serverName: string;
  serverId: string;
  credentials: CredentialRequirement[];
}

export interface McpManager {
  discoverTools: (sessionId: string) => Promise<ToolInfo[]>;
  executeToolCall: (
    sessionId: string,
    toolName: string,
    args: any
  ) => Promise<any>;
  registerServer: (serverConfig: ServerConfig) => Promise<boolean>;
  removeServer: (serverId: string) => Promise<boolean>;
  getAvailableServers: () => ServerConfig[];
  getToolsWithCredentialRequirements: (sessionId: string) => ToolCredentialInfo[];
  setToolCredentials: (
    sessionId: string, 
    toolName: string, 
    serverId: string, 
    credentials: Record<string, string>
  ) => Promise<boolean>;
  cleanup: () => Promise<void>;
  getSessionManager: () => SessionManager;
  getServerHealth: (serverId: string) => ServerHealth | null;
  resetServerCircuit: (serverId: string) => boolean;
}

// Remove local ServerConfig interface

// Rate limiting data structures
interface RateLimitInfo {
  lastRequestTime: number;
  requestCount: number;
  isProcessing: boolean;
  queue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    toolName: string;
    sessionId: string;
    args: any;
  }>;
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Maximum requests per minute to a server
  requestsPerMinute: 30,
  // Minimum time between requests in ms (100ms = 0.1s)
  minRequestSpacing: 100,
  // Maximum queue length per server
  maxQueueLength: 100,
};

// Circuit breaker states
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// Server health tracking for circuit breaker
export interface ServerHealth {
  serverId: string;
  consecutiveFailures: number;
  lastFailureTime: number;
  state: CircuitState;
  nextAttemptTime: number;
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  // Number of consecutive failures before opening circuit
  failureThreshold: 3,
  // Base delay for exponential backoff (milliseconds)
  baseRetryDelay: 60000, // 1 minute
  // Maximum delay between retry attempts (milliseconds)
  maxRetryDelay: 1800000, // 30 minutes
  // Factor for exponential backoff
  backoffFactor: 2,
};

export function setupMcpManager(io: SocketIoServer): McpManager {
  console.log("--- McpManager setup initiated ---");
  
  // Registry to keep track of available MCP tools
  const toolRegistry = new ToolRegistry();

  // Session manager to handle client sessions
  const sessionManager = new SessionManager();

  // Available server configurations - start with empty array
  const servers: ServerConfig[] = [];

  // Cache of connected clients
  const connectedClients: Map<string, Client> = new Map();

  // Track rate limit information for each server
  const rateLimits = new Map<string, RateLimitInfo>();

  // Track server health for circuit breaker
  const serverHealthMap = new Map<string, ServerHealth>();

  // Check server health before allowing connection attempts
  const checkServerHealth = (serverId: string): boolean => {
    const health = serverHealthMap.get(serverId);
    
    // If no health record exists, server is considered healthy
    if (!health) {
      return true;
    }
    
    const now = Date.now();
    
    // If circuit is OPEN, check if we should try a test connection
    if (health.state === 'OPEN') {
      if (now >= health.nextAttemptTime) {
        // Allow a test connection by setting to HALF_OPEN
        console.log(`Circuit for server ${serverId} moved to HALF_OPEN state for test connection`);
        serverHealthMap.set(serverId, {
          ...health,
          state: 'HALF_OPEN'
        });
        return true;
      }
      
      const timeRemaining = Math.ceil((health.nextAttemptTime - now) / 1000);
      console.log(`Circuit for server ${serverId} is OPEN. Next attempt in ${timeRemaining} seconds`);
      return false;
    }
    
    // Always allow connection attempts for CLOSED or HALF_OPEN circuits
    return true;
  };

  // Record server failure and potentially open circuit
  const recordServerFailure = (serverId: string): void => {
    const health = serverHealthMap.get(serverId) || {
      serverId,
      consecutiveFailures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as CircuitState,
      nextAttemptTime: 0
    };
    
    const now = Date.now();
    const updatedHealth = {
      ...health,
      consecutiveFailures: health.consecutiveFailures + 1,
      lastFailureTime: now
    };
    
    // Check if we should open the circuit
    if (updatedHealth.consecutiveFailures >= CIRCUIT_BREAKER_CONFIG.failureThreshold && 
        updatedHealth.state !== 'OPEN') {
      // Calculate next attempt time with exponential backoff
      const retryDelay = Math.min(
        CIRCUIT_BREAKER_CONFIG.baseRetryDelay * Math.pow(
          CIRCUIT_BREAKER_CONFIG.backoffFactor, 
          updatedHealth.consecutiveFailures - CIRCUIT_BREAKER_CONFIG.failureThreshold
        ),
        CIRCUIT_BREAKER_CONFIG.maxRetryDelay
      );
      
      updatedHealth.state = 'OPEN';
      updatedHealth.nextAttemptTime = now + retryDelay;
      
      const delayInMinutes = Math.ceil(retryDelay / 60000);
      console.log(`⚠️ Circuit OPENED for server ${serverId} after ${updatedHealth.consecutiveFailures} consecutive failures. Will retry in ~${delayInMinutes} minute(s)`);
      
      // Emit socket.io event for circuit open
      if (io) {
        io.emit('server_circuit_open', {
          serverId,
          message: `Server connection circuit opened after ${updatedHealth.consecutiveFailures} failures`,
          retryAfter: delayInMinutes
        });
      }
    }
    
    serverHealthMap.set(serverId, updatedHealth);
  };

  // Record server success and close circuit if needed
  const recordServerSuccess = (serverId: string): void => {
    const health = serverHealthMap.get(serverId);
    
    // If no health record or already CLOSED, nothing to do
    if (!health || health.state === 'CLOSED') {
      return;
    }
    
    // Reset health on success
    const updatedHealth = {
      serverId,
      consecutiveFailures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as CircuitState,
      nextAttemptTime: 0
    };
    
    console.log(`✅ Circuit CLOSED for server ${serverId} after successful connection`);
    serverHealthMap.set(serverId, updatedHealth);
    
    // Emit socket.io event for circuit close
    if (io) {
      io.emit('server_circuit_close', {
        serverId,
        message: `Server connection circuit closed after successful connection`
      });
    }
  };

  const registerServer = async (serverConfig: ServerConfig): Promise<boolean> => {
    try {
      console.log(`Registering server: ${JSON.stringify(serverConfig)}`);
      
      // Check circuit breaker before attempting connection
      if (!checkServerHealth(serverConfig.id)) {
        console.log(`Skipping connection attempt to server ${serverConfig.id} due to open circuit`);
        return false;
      }
      
      // Initialize rate limit tracking for this server if it doesn't exist
      if (!rateLimits.has(serverConfig.id)) {
        rateLimits.set(serverConfig.id, {
          lastRequestTime: 0,
          requestCount: 0,
          isProcessing: false,
          queue: []
        });
      }
      
      // If client already exists, just return
      if (connectedClients.has(serverConfig.id)) {
        console.log(`Already connected to server: ${serverConfig.id}`);
        return true;
      }
      
      // Check if this server already exists
      const existingIndex = servers.findIndex((s) => s.id === serverConfig.id);
      if (existingIndex !== -1) {
        servers[existingIndex] = serverConfig;
      } else {
        servers.push(serverConfig);
      }

      // Create MCP client for this server using SSE transport
      const sseUrl = new URL(serverConfig.url);
      
      // Use standard SSE transport with default timeout
      const transport = new SSEClientTransport(sseUrl);

      const client = new Client({
        name: "mcp-host",
        version: "1.0.0",
        // Set the timeout at the client level
        defaultTimeout: 30000, // Reduced to 30 seconds
        // Add retry configuration
        retryConfig: {
          maxRetries: 5, // Increased from 3
          initialDelay: 2000, // Start with 2 seconds delay (increased from 1)
          maxDelay: 20000,    // Max 20 second delay (increased from 10)
          backoffFactor: 2    // Exponential backoff factor
        }
      });

      // Add a connection timeout to fail fast if server is unresponsive
      const connectionPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), 30000); // 30 second timeout
      });
      
      await Promise.race([connectionPromise, timeoutPromise]);
      console.log(`Successfully connected to server: ${serverConfig.id}`);

      // Fetch available tools from the server
      const toolsResult = await client.listTools();
      console.log(`Tools discovered: ${JSON.stringify(toolsResult?.tools?.map(t => t.name) || [])}`);

      // Ensure the server has tools
      if (!toolsResult?.tools || toolsResult.tools.length === 0) {
        throw new Error("No tools discovered on MCP server");
      }
      
      // Validate tool schemas before registering
      let invalidSchemas = [];
      for (const tool of toolsResult.tools) {
        // Check for incompatible schema structures
        if (tool.inputSchema) {
          if (tool.inputSchema.oneOf || tool.inputSchema.allOf || tool.inputSchema.anyOf) {
            invalidSchemas.push(`${tool.name} (has oneOf/allOf/anyOf at root level)`);
            console.warn(`⚠️ Tool ${tool.name} has incompatible schema with oneOf/allOf/anyOf at root level`);
          }
          
          // Check for other common schema issues
          if (!tool.inputSchema.type && !tool.inputSchema.properties) {
            invalidSchemas.push(`${tool.name} (missing type or properties)`);
            console.warn(`⚠️ Tool ${tool.name} has schema without type or properties`);
          }
        }
      }
      
      // Log a warning if any schemas are incompatible, but still register the server
      if (invalidSchemas.length > 0) {
        console.warn(`⚠️ Server ${serverConfig.name} has ${invalidSchemas.length} tools with incompatible schemas: ${invalidSchemas.join(', ')}`);
        
        // Emit socket.io event to notify clients about problematic schemas
        if (io) {
          io.emit('server_warning', {
            serverId: serverConfig.id,
            serverName: serverConfig.name,
            warning: `Server has ${invalidSchemas.length} tools with incompatible schemas that may not work with Claude API`,
            details: invalidSchemas
          });
        }
      }

      // Register tools in our registry
      toolRegistry.registerTools(
        serverConfig.id,
        serverConfig.name,
        serverConfig.rating ?? 0,
        client,
        toolsResult.tools
      );

      // Store the connected client for later use
      connectedClients.set(serverConfig.id, client);

      // Record successful connection in circuit breaker
      recordServerSuccess(serverConfig.id);

      console.log(
        `Registered server ${serverConfig.name} with ${
          toolsResult?.tools?.length
        } tools`
      );

      // Successful Registration
      return true;
    } catch (error) {
      console.error(
        `Failed to register server ${serverConfig.name}:`,
        error
      );

      // Record failure in circuit breaker
      recordServerFailure(serverConfig.id);

      // Clean up in-memory state
      const index = servers.findIndex((s) => s.id === serverConfig.id);
      if (index !== -1) {
        servers.splice(index, 1);
      }
      
      // Clean up any client connection that might have been established
      if (connectedClients.has(serverConfig.id)) {
        try {
          const client = connectedClients.get(serverConfig.id);
          // The Client class doesn't have a disconnect method, so just remove from our map
          console.log(`Removing client connection for failed server ${serverConfig.id}`);
        } catch (disconnectErr) {
          console.error(`Error handling failed server ${serverConfig.id}:`, disconnectErr);
        }
        connectedClients.delete(serverConfig.id);
      }
      
      // Clean up any rate limit data
      rateLimits.delete(serverConfig.id);
      
      // Emit socket.io event for server registration failure
      if (io) {
        io.emit('server_error', {
          serverId: serverConfig.id,
          serverName: serverConfig.name,
          error: `Failed to register server: ${error.message || 'Unknown error'}`
        });
      }

      // Failed registration
      return false;
    }
  };

  // Discover all available tools for a session
  const discoverTools = async (sessionId: string): Promise<ToolInfo[]> => {
    console.log(`Discovering tools for session: ${sessionId}`);
    
    const toolInfos = toolRegistry.getAllTools().filter(tool => {
      // Check if this server has an open circuit
      const health = serverHealthMap.get(tool.serverId);
      if (health && health.state === 'OPEN') {
        console.log(`Skipping tool ${tool.name} from server ${tool.serverId} due to open circuit`);
        return false;
      }
      return true;
    });
    
    // Sort by rating if available, otherwise keep original order
    return toolInfos;
  };

  // Execute a tool call with rate limiting
  const executeToolCall = async (
    sessionId: string,
    toolName: string,
    args: any
  ): Promise<any> => {
    console.log(`Executing tool call ${toolName} with args: ${JSON.stringify(args)}`);
    
    const toolInfo = toolRegistry.getToolInfo(toolName);
    if (!toolInfo) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    // Check circuit breaker before attempting tool execution
    if (!checkServerHealth(toolInfo.serverId)) {
      throw new Error(`Tool ${toolName} is unavailable due to server connection issues. Please try again later.`);
    }
    
    // Use rate limiting
    const rateLimit = rateLimits.get(toolInfo.serverId);
    if (!rateLimit) {
      throw new Error(`Rate limit info for server ${toolInfo.serverId} not found`);
    }
    
    return new Promise((resolve, reject) => {
      // Add to queue
      rateLimit.queue.push({
        toolName,
        args,
        sessionId,
        resolve,
        reject
      });
      
      // Start processing queue if not already processing
      if (!rateLimit.isProcessing) {
        processQueue(toolInfo.serverId);
      }
    });
  };

  // Process queue for a server
  const processQueue = async (serverId: string) => {
    const rateLimit = rateLimits.get(serverId);
    if (!rateLimit || rateLimit.queue.length === 0 || rateLimit.isProcessing) {
      return;
    }

    rateLimit.isProcessing = true;

    try {
      // Calculate time to wait before next request
      const now = Date.now();
      const timeSinceLastRequest = now - rateLimit.lastRequestTime;
      const timeToWait = Math.max(0, RATE_LIMIT_CONFIG.minRequestSpacing - timeSinceLastRequest);

      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }

      // Get the next request from the queue
      const nextRequest = rateLimit.queue.shift();
      if (!nextRequest) {
        rateLimit.isProcessing = false;
        return;
      }

      // Update rate limit info
      rateLimit.lastRequestTime = Date.now();
      rateLimit.requestCount++;

      // Execute the actual tool call
      const toolInfo = toolRegistry.getToolInfo(nextRequest.toolName);
      if (!toolInfo) {
        nextRequest.reject(new Error(`Tool ${nextRequest.toolName} not found`));
        rateLimit.isProcessing = false;
        setTimeout(() => processQueue(serverId), 0);
        return;
      }

      const { client, tool, serverId: toolServerId } = toolInfo;
      const maxRetries = 2;
      let retries = 0;
      let lastError: any = null;

      while (retries <= maxRetries) {
        try {
          // Check if the tool requires credentials
          if (toolInfo.credentialRequirements && toolInfo.credentialRequirements.length > 0) {
            console.log(`🔐 Tool ${nextRequest.toolName} requires credentials`);

            // Get credentials from session storage
            const credentials = sessionManager.getToolCredentials(
              nextRequest.sessionId,
              nextRequest.toolName,
              toolServerId
            );

            const callArgs = nextRequest.args;

            // Check if we have credentials
            if (credentials) {
              // Merge credential parameters with call arguments
              console.log(`✅ Credentials found for tool ${nextRequest.toolName}`);
              for (const [credKey, credValue] of Object.entries(credentials)) {
                console.log(`🔑 Adding credential parameter: ${credKey}`);
                callArgs[credKey] = credValue;
              }
            } else {
              console.log(`⚠️ Tool ${nextRequest.toolName} requires credentials, but none were found in session ${nextRequest.sessionId}`);
              
              // If args don't contain credential parameters, ask the user to save credentials first
              const missingCredentials = toolInfo.credentialRequirements?.filter(
                cred => !callArgs[cred.id]
              );
              
              if (missingCredentials && missingCredentials.length > 0) {
                // Create a user-friendly error message
                const missingList = missingCredentials.map(cred => cred.name || cred.id).join(", ");
                console.log(`Missing required credentials: ${missingList}`);
                
                // Return a friendly message to the user instead of executing the tool
                nextRequest.resolve({
                  content: [
                    {
                      type: "text",
                      text: `This tool requires the following credentials: ${missingList}. Please go to Settings > Tool Credentials to save your credentials first.`,
                    }
                  ],
                  serverInfo: {
                    id: serverId,
                    name: toolInfo.serverName || serverId,
                    tool: nextRequest.toolName
                  }
                });
                
                rateLimit.isProcessing = false;
                setTimeout(() => processQueue(serverId), 0);
                return;
              }
              // Otherwise continue with provided parameters
            }
          } else {
            console.log(`🔧 Tool ${nextRequest.toolName} does not require credentials`);
          }
          
          // Execute the tool via MCP with the prepared arguments
          console.log(`🔧 Executing tool ${nextRequest.toolName} (attempt ${retries + 1}/${maxRetries + 1})`);
          
          const callResult = await client.callTool({
            name: tool.name,
            arguments: nextRequest.args
          });
          
          // Successfully called the tool
          console.log(`✅ Tool ${nextRequest.toolName} executed successfully`);
          
          // Record success in health check
          recordServerSuccess(toolServerId);
          
          // Process the tool result
          if (callResult.result && typeof callResult.result === 'object') {
            // Add server info to the response
            const responseWithServerInfo = {
              ...callResult.result,
              serverInfo: {
                id: serverId,
                name: toolInfo.serverName || serverId,
                tool: nextRequest.toolName
              }
            };
            
            nextRequest.resolve(responseWithServerInfo);
          } else {
            // Handle unexpected result format
            console.warn(`⚠️ Tool ${nextRequest.toolName} returned unexpected result format:`, callResult);
            
            nextRequest.resolve({
              content: [
                {
                  type: "text",
                  text: `Tool ${nextRequest.toolName} was executed but returned an unexpected format.\n\nRaw result: ${JSON.stringify(callResult)}`,
                }
              ],
              serverInfo: {
                id: serverId,
                name: toolInfo.serverName || serverId,
                tool: nextRequest.toolName
              }
            });
          }
          
          // Exit the retry loop on success
          break;
        } catch (error) {
          lastError = error;
          console.error(`Error executing tool ${nextRequest.toolName} (attempt ${retries + 1}/${maxRetries + 1}):`, error);
          
          // Record failure in health check for timeouts
          if (error.code === -32001) {
            recordServerFailure(toolServerId);
          }
          
          // If it's a timeout error, try again
          if (error.code === -32001) { // This is the timeout error code
            retries++;
            if (retries <= maxRetries) {
              const backoffMs = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff up to 10 seconds
              console.log(`Retrying in ${backoffMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              continue;
            }
          } else {
            // For non-timeout errors, don't retry
            break;
          }
        }
      }
      
      // If we're here and all retries failed, reject the promise
      if (retries > maxRetries) {
        console.error(`All ${maxRetries + 1} attempts to execute tool ${nextRequest.toolName} failed.`);
        
        // Create a fallback response for timeout errors
        if (lastError && lastError.code === -32001) {
          nextRequest.resolve({
            content: [
              {
                type: "text",
                text: `I'm sorry, but I couldn't get a response from the ${nextRequest.toolName} service. The request timed out after multiple attempts. This might be due to network issues or the service being temporarily unavailable.`,
              }
            ]
          });
        } else {
          // For other errors, reject with the last error
          nextRequest.reject(lastError);
        }
      }
    } finally {
      // Mark as no longer processing and process the next item in the queue
      rateLimit.isProcessing = false;
      setTimeout(() => processQueue(serverId), 0);
    }
  };

  // Get all available server configurations
  const getAvailableServers = (): ServerConfig[] => {
    console.log(`Available servers: ${JSON.stringify(servers.map(s => s.id))}`);
    return [...servers];
  };

  // Get tools that require credentials
  const getToolsWithCredentialRequirements = (sessionId: string): ToolCredentialInfo[] => {
    // Re-enabled credential checking
    console.log(`Tool credential check for session ${sessionId}`);
    
    const tools = toolRegistry.getToolsWithCredentialRequirements();
    console.log(`Tools with credential requirements for session ${sessionId}: ${JSON.stringify(tools.map(t => t.toolName))}`);
    return tools;
  };

  // Set credentials for a tool
  const setToolCredentials = async (
    sessionId: string,
    toolName: string,
    serverId: string,
    credentials: Record<string, string>
  ): Promise<boolean> => {
    console.log(`Setting credentials for tool ${toolName} from server ${serverId}`);
    try {
      // Store credentials in session manager only (browser session)
      sessionManager.setToolCredentials(
        sessionId,
        toolName,
        serverId,
        credentials
      );
      
      console.log(`🔐 Storing credentials for tool: ${toolName}, server: ${serverId}`);
      console.log(`🔑 Credential keys: ${JSON.stringify(Object.keys(credentials))}`);
      console.log(`✅ Credentials stored successfully for ${toolName}`);
      
      return true;
    } catch (error) {
      console.error(`Error setting credentials for tool ${toolName}:`, error);
      return false;
    }
  };

  // Clean up connections when closing
  const cleanup = async (): Promise<void> => {
    for (const [serverId, client] of connectedClients.entries()) {
      try {
        await client.close();
        console.log(`Closed connection to server ${serverId}`);
      } catch (error) {
        console.error(`Error closing connection to server ${serverId}:`, error);
      }
    }
    connectedClients.clear();
  };

  // Get circuit breaker status for a server
  const getServerHealth = (serverId: string): ServerHealth | null => {
    return serverHealthMap.get(serverId) || null;
  };

  // Reset circuit breaker for a server 
  const resetServerCircuit = (serverId: string): boolean => {
    const exists = serverHealthMap.has(serverId);
    if (exists) {
      recordServerSuccess(serverId);
      return true;
    }
    return false;
  };

  // Disable auto-registration process - rely on client registrations instead
  // const autoRegisterServers = async () => {
  //   console.log(`Auto-registering ${servers.length} servers from storage...`);
  //   for (const server of servers) {
  //     await registerServer(server);
  //   }
  // };
  
  // // Start auto-registration process in the background
  // autoRegisterServers().catch(error => {
  //   console.error("Error auto-registering servers:", error);
  // });

  const removeServer = async (serverId: string): Promise<boolean> => {
    console.log(`Removing server with ID: ${serverId}`);
    
    try {
      // Remove from servers array
      const index = servers.findIndex((s) => s.id === serverId);
      if (index === -1) {
        console.log(`Server ${serverId} not found`);
        return false;
      }
      
      const serverName = servers[index].name;
      servers.splice(index, 1);
      
      // Remove tools associated with this server
      toolRegistry.removeToolsByServerId(serverId);
      
      // Remove the client connection if it exists
      if (connectedClients.has(serverId)) {
        console.log(`Removing client connection for server ${serverId}`);
        connectedClients.delete(serverId);
      }
      
      // Remove rate limit info
      if (rateLimits.has(serverId)) {
        console.log(`Removing rate limit info for server ${serverId}`);
        rateLimits.delete(serverId);
      }
      
      // Remove health tracking info
      if (serverHealthMap.has(serverId)) {
        console.log(`Removing health tracking for server ${serverId}`);
        serverHealthMap.delete(serverId);
      }
      
      console.log(`Successfully removed server ${serverName} (${serverId})`);
      
      // Emit an event via socket.io to notify clients
      if (io) {
        io.emit('server_removed', {
          serverId,
          serverName,
          message: `Server ${serverName} has been removed`
        });
      }
      
      return true;
    } catch (error) {
      console.error(`Error removing server ${serverId}:`, error);
      return false;
    }
  };

  // Return the MCP manager interface
  return {
    discoverTools,
    executeToolCall,
    registerServer,
    removeServer,
    getAvailableServers,
    getToolsWithCredentialRequirements,
    setToolCredentials,
    cleanup,
    getSessionManager: () => sessionManager,
    getServerHealth,
    resetServerCircuit,
  };
}
