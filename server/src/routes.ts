// server/src/routes.ts
import { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { McpManager } from "./mcp/manager.js";

export function setupRoutes(app: Express, mcpManager: McpManager): void {
  // Session endpoint
  app.post("/api/session", (req: Request, res: Response) => {
    // We would use the session manager here to create a new session
    // For simplicity, we're using a dummy session ID
    res.json({ sessionId: "12345" });
  });

  // API key endpoint
  app.post("/api/settings/apikey", (req: Request, res: Response) => {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }

    // We would store this with the session manager
    // For now, we'll just acknowledge it
    res.json({ success: true });
  });

  // Chat completion endpoint
  app.post("/api/chat/completions", async (req: Request, res: Response) => {
    const { messages, tools = true } = req.body;
    const apiKey = req.headers["x-api-key"] as string;

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
          const sessionId = (req.headers["x-session-id"] as string) || "12345";
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
        model: "claude-3-haiku-20240307",
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
            const sessionId =
              (req.headers["x-session-id"] as string) || "12345";
            const result = await mcpManager.executeToolCall(
              sessionId,
              toolUse.name,
              toolUse.input
            );

            // Add the tool result to the messages
            finalMessages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: result.content.map((c: any) => {
                    if (c.type === "text") {
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
    try {
      const sessionId = (req.headers["x-session-id"] as string) || "12345";
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
    const { toolName, args } = req.body;
    const sessionId = (req.headers["x-session-id"] as string) || "12345";

    if (!toolName) {
      return res.status(400).json({ error: "Tool name is required" });
    }

    try {
      const result = await mcpManager.executeToolCall(
        sessionId,
        toolName,
        args || {}
      );
      res.json(result);
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      res.status(500).json({
        error: error.message || "An error occurred while executing the tool",
      });
    }
  });

  // NEW: Get tools that require credentials
  app.get("/api/tools/credentials", (req: Request, res: Response) => {
    try {
      const sessionId = (req.headers["x-session-id"] as string) || "12345";
      const tools = mcpManager.getToolsWithCredentialRequirements(sessionId);
      res.json({ tools });
    } catch (error) {
      console.error("Error getting tools with credential requirements:", error);
      res.status(500).json({
        error: error.message || "An error occurred while fetching tools",
      });
    }
  });

  // NEW: Set credentials for a tool
  app.post("/api/tools/credentials", async (req: Request, res: Response) => {
    const { toolName, serverId, credentials } = req.body;
    const sessionId = (req.headers["x-session-id"] as string) || "12345";

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
    const servers = mcpManager.getAvailableServers();
    res.json({ servers });
  });
}
