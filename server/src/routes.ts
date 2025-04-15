// server/src/routes.ts
import { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { McpManager } from "./mcp/manager.js";
import { RegistryClient } from "./registry/client.js";

export function setupRoutes(app: Express, mcpManager: McpManager): void {
  // Session endpoint
  app.post("/api/session", (req: Request, res: Response) => {
    console.log("API: /api/session called");
    // Create a real session using sessionManager
    const sessionManager = mcpManager.getSessionManager();
    if (!sessionManager) {
      console.error("Cannot create session: SessionManager not available");
      return res.status(500).json({ error: "Session manager not available" });
    }
    
    const sessionId = sessionManager.createSession();
    console.log(`Created new session with ID: ${sessionId}`);
    res.json({ sessionId });
  });

  // API key endpoint
  app.post("/api/settings/apikey", (req: Request, res: Response) => {
    console.log("API: /api/settings/apikey called");
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }

    // We would store this with the session manager
    // For now, we'll just acknowledge it
    res.json({ success: true });
  });

  // Helper function to ensure session exists
  const ensureSession = (sessionId: string): string => {
    if (!sessionId) {
      console.log("No session ID provided, creating new session");
      return mcpManager.getSessionManager().createSession();
    }
    
    // Use getOrCreateSession to handle the session
    mcpManager.getSessionManager().getOrCreateSession(sessionId);
    return sessionId;
  };

  // Update the chat completion endpoint to ensure session
  app.post("/api/chat/completions", async (req: Request, res: Response) => {
    console.log("API: /api/chat/completions called");
    const { messages, tools = true, auto_proceed = true } = req.body;
    const apiKey = req.headers["x-api-key"] as string;
    const rawSessionId = (req.headers["x-session-id"] as string) || "";
    
    // Ensure we have a valid session
    const sessionId = ensureSession(rawSessionId);
    
    // If the session ID changed, let the client know
    if (sessionId !== rawSessionId) {
      console.log(`Using new session ID: ${sessionId} (original was: ${rawSessionId || "empty"})`);
    }

    if (!apiKey) {
      return res.status(401).json({ error: "API key is required" });
    }

    try {
      const anthropic = new Anthropic({
        apiKey,
      });

      // Fetch available tools if enabled
      let availableTools = [];
      if (tools) {
        try {
          const discoveredTools = await mcpManager.discoverTools(sessionId);

          availableTools = discoveredTools.map((tool) => ({
            name: tool.name,
            description: tool.description || "",
            input_schema: tool.inputSchema,
          }));
        } catch (error) {
          console.error("Error discovering tools:", error);
          // Continue without tools if there's an error
        }
      }

      // Create completion request
      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages,
        tools: availableTools.length > 0 ? availableTools : undefined,
      });

      // Process tool calls if present
      const finalMessages = [...messages];
      let finalResponse = completion;
      let serverUsed = null;
      let intermediateResponses = [];

      // Check if there are any tool calls in the response
      const toolUses = completion.content.filter((c) => c.type === "tool_use");

      if (toolUses.length > 0 && auto_proceed) {
        // Add the assistant's initial response with tool calls
        finalMessages.push({
          role: "assistant",
          content: completion.content
        });
        
        // Add the initial response to intermediate responses
        intermediateResponses.push({
          role: "assistant",
          content: completion.content.filter(c => c.type === "text"),
          timestamp: new Date(),
        });

        // Process each tool call
        for (const toolUse of toolUses) {
          try {
            console.log(`Executing tool call: ${toolUse.name} with input:`, JSON.stringify(toolUse.input));
            
            // Execute the tool and get the server that was used
            const result = await mcpManager.executeToolCall(
              sessionId,
              toolUse.name,
              toolUse.input
            );
            
            // Capture server info if available
            if (result.serverInfo) {
              serverUsed = result.serverInfo;
            }

            console.log(`Tool result for ${toolUse.name}:`, JSON.stringify(result.content));
            
            // Add the tool result to the messages
            finalMessages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: result.content.map((c: any) => {
                    if (c.type === "text") {
                      console.log(`Tool ${toolUse.name} text response:`, c.text);
                      return {
                        type: "text",
                        text: c.text,
                      };
                    }
                    return c;
                  }),
                },
              ],
            });

            // Get an intermediate response after each tool execution
            const intermediateCompletion = await anthropic.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 4000,
              messages: finalMessages,
            });

            // Add intermediate response
            intermediateResponses.push({
              role: "assistant",
              content: intermediateCompletion.content,
              timestamp: new Date(),
            });

          } catch (error) {
            console.error(`Error executing tool ${toolUse.name}:`, error);

            // Add a tool error result
            finalMessages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: [
                    {
                      type: "text",
                      text: `Error executing tool: ${
                        error.message || "Unknown error"
                      }`,
                    },
                  ],
                },
              ],
            });
          }
        }

        try {
          // Get a final completion with all the tool results
          finalResponse = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            messages: finalMessages,
          });
        } catch (error) {
          console.error("Error creating final response:", error);
          // If we can't get a final response, use the last intermediate response
          if (intermediateResponses.length > 0) {
            const lastIntermediate = intermediateResponses[intermediateResponses.length - 1];
            // Create a response with the same structure as what Anthropic would return
            finalResponse = {
              id: completion.id,
              content: lastIntermediate.content,
              model: completion.model,
              role: "assistant",
              stop_reason: completion.stop_reason,
              stop_sequence: completion.stop_sequence,
              type: completion.type,
              usage: completion.usage
            };
          }
        }
      }

      // Add server info to the response
      const responseWithServerInfo = {
        ...finalResponse,
        serverInfo: serverUsed,
        requires_confirmation: !auto_proceed && toolUses.length > 0,
        intermediateResponses: intermediateResponses,
        toolsUsed: toolUses.length > 0
      };

      res.json(responseWithServerInfo);
    } catch (error) {
      console.error("Error creating chat completion:", error);
      res.status(500).json({
        error:
          error.message || "An error occurred while processing your request",
      });
    }
  });

  // Tool discovery endpoint
  app.get("/api/tools", async (req: Request, res: Response) => {
    console.log("API: /api/tools called");
    try {
      const rawSessionId = (req.headers["x-session-id"] as string) || "";
      const sessionId = ensureSession(rawSessionId);
      const tools = await mcpManager.discoverTools(sessionId);
      res.json({ tools });
    } catch (error) {
      console.error("Error discovering tools:", error);
      res.status(500).json({
        error: error.message || "An error occurred while discovering tools",
      });
    }
  });

  // Tool execution endpoint
  app.post("/api/tools/execute", async (req: Request, res: Response) => {
    console.log("API: /api/tools/execute called");
    const { toolName, args } = req.body;
    const rawSessionId = (req.headers["x-session-id"] as string) || "";
    const sessionId = ensureSession(rawSessionId);

    if (!toolName) {
      return res.status(400).json({ error: "Tool name is required" });
    }

    // Add enhanced logging
    console.log(`🛠️ Executing tool: ${toolName}`);
    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`📝 Args: ${JSON.stringify(args, (key, value) => {
      // Don't log credentials in full
      if (key === "__credentials") {
        return "[CREDENTIALS REDACTED]";
      }
      return value;
    })}`);

    try {
      const result = await mcpManager.executeToolCall(
        sessionId,
        toolName,
        args || {}
      );
      
      // Get server info for the socket event
      const serverInfo = result.serverInfo || {};
      
      // Log server info
      console.log(`Server info for tool ${toolName}:`, serverInfo);
      
      // Emit a socket event with the tool execution result
      if (req.app.get('io')) {
        const io = req.app.get('io');
        console.log('Emitting tool_executed event via socket.io');
        
        const eventData = {
          toolName,
          serverId: serverInfo.id || 'unknown',
          serverName: serverInfo.name || 'Unknown Server',
          result: {
            content: result.content || [],
            isError: false
          }
        };
        
        console.log('Event data:', JSON.stringify(eventData));
        io.emit('tool_executed', eventData);
        console.log(`Socket event emitted for tool: ${toolName}`);
      } else {
        console.warn('Socket.io not available for emitting events');
      }
      
      console.log(`✅ Tool ${toolName} executed successfully`);
      res.json(result);
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      
      // Emit error event via socket
      if (req.app.get('io')) {
        const io = req.app.get('io');
        console.log('Emitting tool_executed error event via socket.io');
        
        const errorEventData = {
          toolName,
          serverId: 'unknown',
          serverName: 'Error',
          result: {
            content: [{ type: 'text', text: `Error: ${error.message || 'Unknown error'}` }],
            isError: true
          }
        };
        
        console.log('Error event data:', JSON.stringify(errorEventData));
        io.emit('tool_executed', errorEventData);
        console.log(`Socket error event emitted for tool: ${toolName}`);
      }
      
      res.status(500).json({
        error: error.message || "An error occurred while executing the tool",
      });
    }
  });

  // Get tools that require credentials
  app.get("/api/tools/credentials", (req: Request, res: Response) => {
    console.log("API: /api/tools/credentials called with headers:", JSON.stringify(req.headers));
    try {
      const rawSessionId = (req.headers["x-session-id"] as string) || "";
      const sessionId = ensureSession(rawSessionId);
      console.log(`API: /api/tools/credentials using sessionId: ${sessionId}`);
      const tools = mcpManager.getToolsWithCredentialRequirements(sessionId);
      console.log(`API: /api/tools/credentials found ${tools.length} tools requiring credentials`);
      res.json({ tools });
    } catch (error) {
      console.error("Error getting tools with credential requirements:", error);
      res.status(500).json({
        error: error.message || "An error occurred while fetching tools",
      });
    }
  });

  // Set credentials for a tool
  app.post("/api/tools/credentials", async (req: Request, res: Response) => {
    console.log("API: /api/tools/credentials POST called");
    const { toolName, serverId, credentials } = req.body;
    const rawSessionId = (req.headers["x-session-id"] as string) || "";
    const sessionId = ensureSession(rawSessionId);

    if (!toolName || !serverId || !credentials) {
      return res.status(400).json({ 
        error: "Missing required fields. toolName, serverId, and credentials are required" 
      });
    }

    try {
      const success = await mcpManager.setToolCredentials(
        sessionId,
        toolName,
        serverId,
        credentials
      );

      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ 
          error: "Failed to set credentials for the tool" 
        });
      }
    } catch (error) {
      console.error(`Error setting credentials for tool ${toolName}:`, error);
      res.status(500).json({
        error: error.message || "An error occurred while setting credentials",
      });
    }
  });

  // Server registration endpoint
  app.post("/api/servers", async (req: Request, res: Response) => {
    console.log("API: /api/servers POST called with body:", JSON.stringify(req.body));
    const { id, name, url } = req.body;

    if (!id || !name || !url) {
      return res
        .status(400)
        .json({ error: "Missing required server configuration fields" });
    }

    try {
      await mcpManager.registerServer({ id, name, url });
      res.json({ success: true });
    } catch (error) {
      console.error("Error registering server:", error);
      res.status(500).json({
        error:
          error.message || "An error occurred while registering the server",
      });
    }
  });

  // Get available servers endpoint
  app.get("/api/servers", (req: Request, res: Response) => {
    console.log("API: /api/servers GET called");
    const servers = mcpManager.getAvailableServers();
    res.json({ servers });
  });

  // Registry refresh endpoint
  app.post("/api/registry/refresh", async (req: Request, res: Response) => {
    console.log("API: /api/registry/refresh called");
    try {
      // Create registry client and fetch popular servers
      const registryClient = new RegistryClient();
      const servers = await registryClient.getPopularServers();
      
      console.log(`Fetched ${servers.length} popular servers from Nanda Registry`);
      
      res.json({ 
        success: true,
        servers,
        message: `Found ${servers.length} servers in the registry` 
      });
    } catch (error) {
      console.error("Error refreshing registry servers:", error);
      res.status(500).json({
        error: error.message || "An error occurred while refreshing registry servers"
      });
    }
  });

  // Registry search endpoint
  app.get("/api/registry/search", async (req: Request, res: Response) => {
    console.log("API: /api/registry/search called with query:", req.query);
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ 
          error: "Search query is required" 
        });
      }
      
      // Create registry client and search for servers
      const registryClient = new RegistryClient();
      const servers = await registryClient.searchServers(query, {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        tags: req.query.tags as string,
        type: req.query.type as string,
        verified: req.query.verified ? req.query.verified === 'true' : undefined
      });
      
      console.log(`Found ${servers.length} servers matching query "${query}"`);
      
      res.json({ 
        success: true,
        servers,
        query,
        message: `Found ${servers.length} servers matching "${query}"` 
      });
    } catch (error) {
      console.error("Error searching registry servers:", error);
      res.status(500).json({
        error: error.message || "An error occurred while searching registry servers"
      });
    }
  });
}
