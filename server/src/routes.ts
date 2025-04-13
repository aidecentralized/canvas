// server/src/routes.ts
import { Express, Request, Response, NextFunction } from "express"; // Added NextFunction
import Anthropic from "@anthropic-ai/sdk";
import { McpManager, ServerConfig } from "./mcp/manager.js"; // Import ServerConfig here if needed, or from shared types
import { SessionManager } from "./mcp/sessionManager.js";
import { MessageContent } from "../shared/types.js"; // Corrected relative path to ../shared/

/**
 * Middleware factory function. Creates an Express middleware that:
 * 1. Extracts the session ID from the 'X-Session-Id' header.
 * 2. Validates the session ID using the provided SessionManager.
 * 3. If valid, attaches the sessionId to the request object (`req.sessionId`) for later use.
 * 4. If invalid or missing, sends an appropriate error response (400 or 401).
 * @param sessionManager An instance of SessionManager.
 * @returns An Express middleware function.
 */
const sessionMiddleware = (sessionManager: SessionManager) =>
    (req: Request, res: Response, next: NextFunction) => {
    // Extract session ID sent by the client.
    const sessionId = req.headers['x-session-id'] as string;
    console.log(`[SessionMiddleware] Path: ${req.path}. Received X-Session-Id: ${sessionId}`);

    if (!sessionId) {
        console.warn("[SessionMiddleware] FAILED: Missing X-Session-Id header.");
        return res.status(400).json({ error: "Missing X-Session-Id header" });
    }

    // Validate the session ID against the SessionManager's in-memory store.
    // This also updates the session's lastActive timestamp.
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        // Session ID is not found or has expired (if cleanup occurred).
        console.warn(`[SessionMiddleware] FAILED: Invalid or expired session ID: ${sessionId}.`);
        return res.status(401).json({ error: "Invalid or expired session ID" });
    }

    // Session is valid. Attach the ID to the request object for easy access in route handlers.
    console.log(`[SessionMiddleware] SUCCESS: Session ${sessionId} validated.`);
    (req as any).sessionId = sessionId;
    // Proceed to the next middleware or route handler.
    next();
};

/**
 * Sets up all API routes for the Express application.
 * @param app The Express application instance.
 * @param mcpManager An instance of McpManager.
 * @param sessionManager An instance of SessionManager.
 */
export function setupRoutes(app: Express, mcpManager: McpManager, sessionManager: SessionManager): void {

  // --- Session Management ---

  // Session endpoint - Creates a new session. Does not require sessionMiddleware.
  app.post("/api/session", (req: Request, res: Response) => {
    console.log("[Route /api/session] Received request to create session.");
    // Create a new session using the SessionManager.
    const sessionId = sessionManager.createSession();
    console.log(`[Route /api/session] Responding with new session ID: ${sessionId}`);
    // Return the new session ID to the client.
    res.json({ sessionId });
  });

  // --- Settings ---

  // API key endpoint - Associates an Anthropic API key with a session.
  // Requires a valid session ID via sessionMiddleware.
  app.post("/api/settings/apikey", sessionMiddleware(sessionManager), (req: Request, res: Response) => {
    const { apiKey } = req.body;
    // Retrieve the validated sessionId attached by the middleware.
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/settings/apikey] Processing request for session: ${sessionId}. API Key provided: ${!!apiKey}`);

    if (!apiKey) {
      console.warn(`[Route /api/settings/apikey] FAILED: API key is required for session ${sessionId}.`);
      return res.status(400).json({ error: "API key is required" });
    }

    console.log(`[Route /api/settings/apikey] Attempting to set API key in SessionManager for session: ${sessionId}`);
    // Store the API key within the specific session object managed by SessionManager.
    const success = sessionManager.setAnthropicApiKey(sessionId, apiKey);
    console.log(`[Route /api/settings/apikey] SessionManager.setAnthropicApiKey result for session ${sessionId}: ${success}`);

    if (success) {
        console.log(`[Route /api/settings/apikey] SUCCESS: API key associated with session ${sessionId}.`);
        res.json({ success: true });
    } else {
        // This indicates an internal inconsistency if middleware passed but setApiKey failed.
        console.error(`[Route /api/settings/apikey] FAILED: SessionManager could not find session ${sessionId} to set API key.`);
        res.status(404).json({ error: "Session not found by manager during API key setting" });
    }
  });

  // --- Chat ---

  // Chat completion endpoint - Handles chat messages, potentially using tools.
  // Requires a valid session ID and associated API key.
  app.post("/api/chat/completions", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const { messages, tools = true } = req.body;
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/chat/completions] Received request for session: ${sessionId}.`);

    // Retrieve the API key specifically associated with this session.
    const apiKey = sessionManager.getAnthropicApiKey(sessionId);

    if (!apiKey) {
      // API key hasn't been set for this session via the /api/settings/apikey endpoint.
      console.warn(`[Route /api/chat/completions] FAILED: API key not found for session ${sessionId}.`);
      return res.status(401).json({ error: "API key not set for this session. Please set it in settings." });
    }

    try {
      console.log(`[Route /api/chat/completions] Proceeding with Anthropic API call for session ${sessionId}.`);
      // Initialize Anthropic client with the session's API key.
      const anthropic = new Anthropic({ apiKey });

      // Fetch available tools registered specifically for this session if requested.
      let availableTools = [];
      if (tools) {
        try {
          // McpManager needs the sessionId to access the correct session's tool registry.
          const discoveredTools = await mcpManager.discoverTools(sessionId);
          // Format tools for the Anthropic API.
          availableTools = discoveredTools.map((tool) => ({
            name: tool.name,
            description: tool.description || "",
            input_schema: tool.inputSchema,
          }));
          console.log(`[Route /api/chat/completions] [Session ${sessionId}] Discovered ${availableTools.length} tools.`);
        } catch (error) {
          console.error(`[Route /api/chat/completions] [Session ${sessionId}] Error discovering tools:`, error);
          // Continue without tools if discovery fails.
        }
      }

      // Make the primary call to the Anthropic API.
      console.log(`[Route /api/chat/completions] [Session ${sessionId}] Sending request to Anthropic API.`);
      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
        messages,
        tools: availableTools.length > 0 ? availableTools : undefined,
      });
      console.log(`[Route /api/chat/completions] [Session ${sessionId}] Received response from Anthropic API.`);

      // --- Tool Use Handling ---
      const finalMessages = [...messages];
      let finalResponse = completion;
      const toolUses = completion.content.filter((c) => c.type === "tool_use");

      if (toolUses.length > 0) {
        console.log(`[Route /api/chat/completions] [Session ${sessionId}] Processing ${toolUses.length} tool calls.`);
        // Add the assistant's response (including tool_use requests) to the message history.
        finalMessages.push({ role: "assistant", content: completion.content });

        // Execute each requested tool call.
        for (const toolUse of toolUses) {
          try {
            // McpManager needs the sessionId to find the correct MCP client connection
            // associated with the tool and session.
            const result = await mcpManager.executeToolCall(
              sessionId,
              toolUse.name,
              toolUse.input
            );

            console.log(`[Route /api/chat/completions] [Session ${sessionId}] Raw tool result for ${toolUse.name}:`, JSON.stringify(result, null, 2));

            // Format the tool execution result for the Anthropic API.
            // Ensure result.content is an array of MessageContent blocks.
            let toolResultContent: MessageContent[];
            // ... (result formatting logic remains the same) ...
            if (result && Array.isArray(result.content)) {
                toolResultContent = result.content;
            } else if (result && typeof result.content === 'string') {
                toolResultContent = [{ type: "text", text: result.content }];
            } else if (result && result.content && typeof result.content === 'object' && !Array.isArray(result.content)) {
                 toolResultContent = [result.content as MessageContent];
            } else {
                console.warn(`[Session ${sessionId}] Unexpected tool result structure for ${toolUse.name}. Using empty content.`);
                toolResultContent = [{ type: "text", text: "" }];
            }


            // Add the tool result to the message history.
            finalMessages.push({
              role: "user", // Anthropic expects tool results with 'user' role.
              content: [{
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: toolResultContent
              }],
            });
          } catch (error) {
            // Handle errors during tool execution.
            console.error(`[Route /api/chat/completions] [Session ${sessionId}] Error executing tool ${toolUse.name}:`, error);
            // Add an error result to the message history.
            finalMessages.push({
              role: "user",
              content: [{
                type: "tool_result",
                tool_use_id: toolUse.id,
                is_error: true,
                content: [{ type: "text", text: `Error executing tool: ${error instanceof Error ? error.message : "Unknown error"}` }],
              }],
            });
          }
        }

        // Send the updated message history (including tool results) back to Anthropic
        // to get the final assistant response.
        console.log(`[Route /api/chat/completions] [Session ${sessionId}] Sending tool results back to Anthropic...`);
        finalResponse = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 4096,
          messages: finalMessages,
          // Tools are not included in the follow-up call.
        });
        console.log(`[Route /api/chat/completions] [Session ${sessionId}] Received final response from Anthropic API after tool use.`);
      }

      // Send the final response (either the initial one or the one after tool use) to the client.
      res.json(finalResponse);
    } catch (error) {
      // Handle errors during the overall chat completion process.
      console.error(`[Route /api/chat/completions] [Session ${sessionId}] Error during chat completion process:`, error);
      // ... (error handling logic remains the same) ...
      if (error instanceof Anthropic.APIError) {
          console.error("Anthropic API Error Details:", error.status, error.error, error.headers);
          res.status(error.status || 500).json({
              error: `Anthropic API Error: ${error.message}`,
              details: error.error
          });
      } else if (error instanceof Error) {
          res.status(500).json({
              error: error.message || "An error occurred while processing your request",
          });
      } else {
          res.status(500).json({
              error: "An unknown error occurred while processing your request",
          });
      }
    }
  });

  // --- Tool Management ---

  // Tool discovery endpoint - Gets available tools for the specific session.
  app.get("/api/tools", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/tools] Received request for session: ${sessionId}.`);
    try {
      // McpManager uses the sessionId to access the correct session's tool registry.
      const tools = await mcpManager.discoverTools(sessionId);
      console.log(`[Route /api/tools] Discovered ${tools.length} tools for session ${sessionId}.`);
      res.json({ tools });
    } catch (error) {
      console.error(`[Route /api/tools] [Session ${sessionId}] Error discovering tools:`, error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "An error occurred while discovering tools",
      });
    }
  });

  // Tool execution endpoint - Executes a specific tool for the session.
  // (Primarily for testing/debugging, as normal execution happens via chat completions)
  app.post("/api/tools/execute", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const { toolName, args } = req.body;
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/tools/execute] Received request for session: ${sessionId}, Tool: ${toolName}.`);

    if (!toolName) {
      console.warn(`[Route /api/tools/execute] FAILED: Tool name is required for session ${sessionId}.`);
      return res.status(400).json({ error: "Tool name is required" });
    }

    try {
      // McpManager needs the sessionId to find the correct MCP client connection.
      const result = await mcpManager.executeToolCall(sessionId, toolName, args || {});
      console.log(`[Route /api/tools/execute] Successfully executed tool ${toolName} for session ${sessionId}.`);
      res.json(result);
    } catch (error) {
      console.error(`[Route /api/tools/execute] [Session ${sessionId}] Error executing tool ${toolName}:`, error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "An error occurred while executing the tool",
      });
    }
  });

  // --- Server Registration Management ---

  // Server registration endpoint - Registers an MCP server for the specific session.
  app.post("/api/servers", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const { id, name, url, ...rest } = req.body;
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/servers POST] Received request for session: ${sessionId}, Server ID: ${id}, Name: ${name}.`);

    if (!id || !name || !url) {
      console.warn(`[Route /api/servers POST] FAILED: Missing required fields for session ${sessionId}.`);
      return res.status(400).json({ error: "Missing required server configuration fields (id, name, url)" });
    }

    try {
      const serverConfig: ServerConfig = { id, name, url, ...rest };
      // McpManager needs the sessionId to add the server config to the correct session
      // and to establish the MCP client connection for that session.
      await mcpManager.registerServer(sessionId, serverConfig);
      console.log(`[Route /api/servers POST] Successfully registered server ${name} for session ${sessionId}.`);
      res.json({ success: true, message: `Server ${name} registered for session.` });
    } catch (error) {
      console.error(`[Route /api/servers POST] [Session ${sessionId}] Error registering server ${name}:`, error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "An error occurred while registering the server",
      });
    }
  });

  // Server unregistration endpoint - Removes an MCP server registration for the specific session.
  app.delete("/api/servers/:id", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const { id } = req.params;
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/servers DELETE] Received request for session: ${sessionId}, Server ID: ${id}.`);

    if (!id) {
      console.warn(`[Route /api/servers DELETE] FAILED: Server ID is required in URL path for session ${sessionId}.`);
      return res.status(400).json({ error: "Server ID is required in URL path" });
    }

    try {
      // McpManager needs the sessionId to remove the server config, close the associated
      // MCP client connection, and remove tools from the correct session's registry.
      await mcpManager.unregisterServer(sessionId, id);
      console.log(`[Route /api/servers DELETE] Successfully unregistered server ${id} for session ${sessionId}.`);
      res.json({ success: true, message: `Server ${id} unregistered for session.` });
    } catch (error) {
      console.error(`[Route /api/servers DELETE] [Session ${sessionId}] Error unregistering server ${id}:`, error);
      res.status(500).json({
        error: error instanceof Error ? error.message : `An error occurred while unregistering server ${id}`,
      });
    }
  });

  // Get available servers endpoint - Lists servers registered for the specific session.
  app.get("/api/servers", sessionMiddleware(sessionManager), (req: Request, res: Response) => {
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/servers GET] Received request for session: ${sessionId}.`);
    // McpManager needs the sessionId to retrieve the list of servers associated with it.
    const servers = mcpManager.getAvailableServers(sessionId);
    console.log(`[Route /api/servers GET] Found ${servers.length} servers for session ${sessionId}.`);
    res.json({ servers });
  });

  // --- Registry Interaction ---

  // Registry refresh endpoint - Fetches the list of servers from the central registry.
  // Requires a session for authorization context but doesn't modify session state directly.
  app.post("/api/registry/refresh", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const sessionId = (req as any).sessionId; // Session ID used for auth/logging context.
    console.log(`[Route /api/registry/refresh] Received request for session: ${sessionId}.`);
    try {
      // This operation is session-independent on the manager side (fetches global list).
      const registryServers = await mcpManager.fetchRegistryServers();
      console.log(`[Route /api/registry/refresh] Fetched ${registryServers.length} servers from registry.`);
      // Returns the fetched list to the client; client decides whether to register them.
      res.json({
        success: true,
        servers: registryServers,
      });
    } catch (error) {
      console.error(`[Route /api/registry/refresh] Error refreshing servers from registry:`, error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "An error occurred while refreshing registry servers",
      });
    }
  });
}
