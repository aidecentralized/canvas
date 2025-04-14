// server/src/routes.ts
import { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { McpManager } from "./mcp/types.js";

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
    const { messages, tools = true } = req.body;
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

      //Mapping ratings to natural langauge 
      const ratingTextMap = {
        1: "terrible",
        2: "poorly rated",
        3: "average",
        4: "good",
        5: "excellent",
      };

      // Fetch available tools if enabled
      let availableTools = [];
      if (tools) {
        try {
          const discoveredTools = await mcpManager.discoverTools(sessionId);

          // Preparing Claude to prefer higher rated tools 
          messages.unshift({
            role: "user",
            content: [
              {
                type: "text",
                text: "When selecting tools, prefer those that run on highly rated servers. Each tool includes a server reputation label in its description.",
              },
            ],
          });

          availableTools = discoveredTools.map((tool) => {
            const ratingLabel = ratingTextMap[tool.rating || 0] || "unrated";
            const enhancedDescription = `${tool.description || ""} (This tool runs on a ${ratingLabel} server with a ${tool.rating || "?"}/5 rating.)`;

            return{
              name: tool.name,
              description: enhancedDescription,
              input_schema: tool.inputSchema,
            };
          });
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

      // Check if there are any tool calls in the response
      const toolUses = completion.content.filter((c) => c.type === "tool_use");

      if (toolUses.length > 0) {
        // Add the assistant's response with tool calls
        finalMessages.push({
          role: "assistant",
          content: completion.content,
        });

        // Process each tool call
        for (const toolUse of toolUses) {
          try {
            console.log(`Executing tool call: ${toolUse.name} with input:`, JSON.stringify(toolUse.input));
            
            const result = await mcpManager.executeToolCall(
              sessionId,
              toolUse.name,
              toolUse.input
            );

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

        // Get a new completion with all the tool results
        finalResponse = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          messages: finalMessages,
        });
      }

      res.json(finalResponse);
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
      
      console.log(`✅ Tool ${toolName} executed successfully`);
      res.json(result);
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
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
      console.error("Error fetching tools with credential requirements:", error);
      res.status(500).json({
        error: error.message || "An error occurred while fetching tools with credential requirements",
      });
    }
  });

  // Registry refresh endpoint
  app.post("/api/registry/refresh", async (req: Request, res: Response) => {
    console.log("API: /api/registry/refresh called");
    try {
      const registryServers = await mcpManager.fetchRegistryServers();
      res.json({
        success: true,
        servers: registryServers,
      });
    } catch (error) {
      console.error("Error refreshing servers from registry:", error);
      res.status(500).json({
        error:
          error.message ||
          "An error occurred while refreshing registry servers",
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
}
