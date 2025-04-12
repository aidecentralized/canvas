// server/src/routes.ts
import { Express, Request, Response, NextFunction } from "express"; // Added NextFunction
import Anthropic from "@anthropic-ai/sdk";
import { McpManager } from "./mcp/manager.js";
import { SessionManager } from "./mcp/sessionManager.js"; // Import SessionManager
import { MessageContent } from "../shared/types.js"; // Import shared type - ADDED .js extension

// Middleware to extract and validate session ID
const sessionMiddleware = (sessionManager: SessionManager) =>
    (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.headers['x-session-id'] as string;
    console.log(`[SessionMiddleware] Path: ${req.path}. Received X-Session-Id: ${sessionId}`); // Modified log

    if (!sessionId) {
        console.warn("[SessionMiddleware] FAILED: Missing X-Session-Id header."); // Modified log
        return res.status(400).json({ error: "Missing X-Session-Id header" });
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
        console.warn(`[SessionMiddleware] FAILED: Invalid or expired session ID: ${sessionId}.`); // Modified log
        return res.status(401).json({ error: "Invalid or expired session ID" });
    }

    console.log(`[SessionMiddleware] SUCCESS: Session ${sessionId} validated.`); // Modified log
    // Attach sessionId to request for easier access in route handlers
    (req as any).sessionId = sessionId;
    next();
};

export function setupRoutes(app: Express, mcpManager: McpManager, sessionManager: SessionManager): void { // Inject SessionManager

  // Session endpoint - Creates a new session
  app.post("/api/session", (req: Request, res: Response) => {
    console.log("[Route /api/session] Received request to create session."); // Added log
    const sessionId = sessionManager.createSession();
    console.log(`[Route /api/session] Responding with new session ID: ${sessionId}`); // Added log
    res.json({ sessionId });
  });

  // API key endpoint - Associates API key with a session
  app.post("/api/settings/apikey", sessionMiddleware(sessionManager), (req: Request, res: Response) => {
    const { apiKey } = req.body;
    const sessionId = (req as any).sessionId; // Get sessionId attached by middleware
    console.log(`[Route /api/settings/apikey] Processing request for session: ${sessionId}. API Key provided: ${!!apiKey}`); // Modified log

    if (!apiKey) {
      console.warn(`[Route /api/settings/apikey] FAILED: API key is required for session ${sessionId}.`); // Added log
      return res.status(400).json({ error: "API key is required" });
    }

    // Log before attempting to set the key
    console.log(`[Route /api/settings/apikey] Attempting to set API key in SessionManager for session: ${sessionId}`);

    const success = sessionManager.setAnthropicApiKey(sessionId, apiKey);

    // Log the result from SessionManager
    console.log(`[Route /api/settings/apikey] SessionManager.setAnthropicApiKey result for session ${sessionId}: ${success}`);

    if (success) {
        console.log(`[Route /api/settings/apikey] SUCCESS: API key associated with session ${sessionId}.`); // Added log
        res.json({ success: true });
    } else {
        // This case implies the session ID was valid in middleware but not found by setAnthropicApiKey, which is strange.
        console.error(`[Route /api/settings/apikey] FAILED: SessionManager could not find session ${sessionId} to set API key.`); // Modified log
        res.status(404).json({ error: "Session not found by manager during API key setting" }); // More specific error
    }
  });

  // Chat completion endpoint - Uses session's API key and tools
  app.post("/api/chat/completions", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const { messages, tools = true } = req.body;
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/chat/completions] Received request for session: ${sessionId}.`); // Added log

    const apiKey = sessionManager.getAnthropicApiKey(sessionId); // Get API key from session

    if (!apiKey) {
      console.warn(`[Route /api/chat/completions] FAILED: API key not found for session ${sessionId}.`); // Added log
      return res.status(401).json({ error: "API key not set for this session. Please set it in settings." });
    }

    try {
      console.log(`[Route /api/chat/completions] Proceeding with Anthropic API call for session ${sessionId}.`); // Added log
      const anthropic = new Anthropic({ apiKey });

      // Fetch available tools for this session if enabled
      let availableTools = [];
      if (tools) {
        try {
          // Pass sessionId to discoverTools
          const discoveredTools = await mcpManager.discoverTools(sessionId);
          availableTools = discoveredTools.map((tool) => ({
            name: tool.name,
            description: tool.description || "",
            input_schema: tool.inputSchema,
          }));
          console.log(`[Route /api/chat/completions] [Session ${sessionId}] Discovered ${availableTools.length} tools.`); // Modified log
        } catch (error) {
          console.error(`[Route /api/chat/completions] [Session ${sessionId}] Error discovering tools:`, error); // Modified log
        }
      }

      // Create completion request
      console.log(`[Route /api/chat/completions] [Session ${sessionId}] Sending request to Anthropic API.`); // Added log
      const completion = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // Consider making model configurable
        max_tokens: 10000, // Consider making max_tokens configurable
        messages,
        tools: availableTools.length > 0 ? availableTools : undefined,
      });
      console.log(`[Route /api/chat/completions] [Session ${sessionId}] Received response from Anthropic API.`); // Added log

      // Process tool calls if present
      const finalMessages = [...messages];
      let finalResponse = completion;
      const toolUses = completion.content.filter((c) => c.type === "tool_use");

      if (toolUses.length > 0) {
        console.log(`[Route /api/chat/completions] [Session ${sessionId}] Processing ${toolUses.length} tool calls.`); // Modified log
        finalMessages.push({ role: "assistant", content: completion.content });

        for (const toolUse of toolUses) {
          try {
            // Pass sessionId to executeToolCall
            const result = await mcpManager.executeToolCall(
              sessionId,
              toolUse.name,
              toolUse.input
            );

            // Log the raw result from the tool execution
            console.log(`[Route /api/chat/completions] [Session ${sessionId}] Raw tool result for ${toolUse.name}:`, JSON.stringify(result, null, 2)); // Modified log

            // Ensure result.content is an array of MessageContent blocks
            let toolResultContent: MessageContent[];
            if (result && Array.isArray(result.content)) {
                // Assume result.content is already an array of valid MessageContent blocks
                toolResultContent = result.content;
            } else if (result && typeof result.content === 'string') {
                // If content is just a string, wrap it in a text block
                toolResultContent = [{ type: "text", text: result.content }];
            } else if (result && result.content && typeof result.content.text === 'string') {
                // Handle cases where result.content might be a single object like { type: 'text', text: '...' }
                toolResultContent = [result.content];
            }
            else {
                // Fallback for unexpected structure or empty result
                console.warn(`[Session ${sessionId}] Unexpected tool result structure for ${toolUse.name}. Using empty content.`);
                toolResultContent = [{ type: "text", text: "" }]; // Or handle as error?
            }

            finalMessages.push({
              role: "user", // Anthropic expects tool results as 'user' role
              content: [{
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: toolResultContent // Use the validated/formatted array
              }],
            });
          } catch (error) {
            console.error(`[Route /api/chat/completions] [Session ${sessionId}] Error executing tool ${toolUse.name}:`, error); // Modified log
            finalMessages.push({
              role: "user",
              content: [{
                type: "tool_result",
                tool_use_id: toolUse.id,
                is_error: true, // Indicate error
                // Ensure error content is also an array
                content: [{ type: "text", text: `Error executing tool: ${error.message || "Unknown error"}` }],
              }],
            });
          }
        }

        // Get a new completion with all the tool results
        console.log(`[Route /api/chat/completions] [Session ${sessionId}] Sending tool results back to Anthropic...`); // Modified log
        finalResponse = await anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 10000,
          messages: finalMessages,
          // Do not include tools again in the follow-up call
        });
        console.log(`[Route /api/chat/completions] [Session ${sessionId}] Received final response from Anthropic API after tool use.`); // Added log
      }

      res.json(finalResponse);
    } catch (error) {
      console.error(`[Route /api/chat/completions] [Session ${sessionId}] Error during chat completion process:`, error); // Modified log
      // Check if it's an Anthropic API error
      if (error instanceof Anthropic.APIError) {
          console.error("Anthropic API Error Details:", error.status, error.error, error.headers);
          res.status(error.status || 500).json({
              error: `Anthropic API Error: ${error.message}`,
              details: error.error
          });
      } else {
          res.status(500).json({
              error: error.message || "An error occurred while processing your request",
          });
      }
    }
  });

  // Tool discovery endpoint - For the specific session
  app.get("/api/tools", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/tools] Received request for session: ${sessionId}.`); // Added log
    try {
      const tools = await mcpManager.discoverTools(sessionId); // Pass sessionId
      console.log(`[Route /api/tools] Discovered ${tools.length} tools for session ${sessionId}.`); // Added log
      res.json({ tools });
    } catch (error) {
      console.error(`[Route /api/tools] [Session ${sessionId}] Error discovering tools:`, error); // Modified log
      res.status(500).json({
        error: error.message || "An error occurred while discovering tools",
      });
    }
  });

  // Tool execution endpoint - For the specific session
  app.post("/api/tools/execute", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const { toolName, args } = req.body;
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/tools/execute] Received request for session: ${sessionId}, Tool: ${toolName}.`); // Added log

    if (!toolName) {
      console.warn(`[Route /api/tools/execute] FAILED: Tool name is required for session ${sessionId}.`); // Added log
      return res.status(400).json({ error: "Tool name is required" });
    }

    try {
      const result = await mcpManager.executeToolCall(sessionId, toolName, args || {}); // Pass sessionId
      console.log(`[Route /api/tools/execute] Successfully executed tool ${toolName} for session ${sessionId}.`); // Added log
      res.json(result);
    } catch (error) {
      console.error(`[Route /api/tools/execute] [Session ${sessionId}] Error executing tool ${toolName}:`, error); // Modified log
      res.status(500).json({
        error: error.message || "An error occurred while executing the tool",
      });
    }
  });

  // Server registration endpoint - For the specific session
  app.post("/api/servers", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const { id, name, url, ...rest } = req.body; // Capture potential extra fields like description etc.
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/servers POST] Received request for session: ${sessionId}, Server ID: ${id}, Name: ${name}.`); // Added log

    if (!id || !name || !url) {
      console.warn(`[Route /api/servers POST] FAILED: Missing required fields for session ${sessionId}.`); // Added log
      return res.status(400).json({ error: "Missing required server configuration fields (id, name, url)" });
    }

    try {
      const serverConfig = { id, name, url, ...rest };
      await mcpManager.registerServer(sessionId, serverConfig); // Pass sessionId
      console.log(`[Route /api/servers POST] Successfully registered server ${name} for session ${sessionId}.`); // Added log
      res.json({ success: true, message: `Server ${name} registered for session.` });
    } catch (error) {
      console.error(`[Route /api/servers POST] [Session ${sessionId}] Error registering server ${name}:`, error); // Modified log
      res.status(500).json({
        error: error.message || "An error occurred while registering the server",
      });
    }
  });

  // Server unregistration endpoint - For the specific session
  app.delete("/api/servers/:id", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const { id } = req.params;
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/servers DELETE] Received request for session: ${sessionId}, Server ID: ${id}.`); // Added log

    if (!id) {
      console.warn(`[Route /api/servers DELETE] FAILED: Server ID is required in URL path for session ${sessionId}.`); // Added log
      // This check might be redundant due to route parameter, but good practice
      return res.status(400).json({ error: "Server ID is required in URL path" });
    }

    try {
      await mcpManager.unregisterServer(sessionId, id); // Pass sessionId
      console.log(`[Route /api/servers DELETE] Successfully unregistered server ${id} for session ${sessionId}.`); // Added log
      res.json({ success: true, message: `Server ${id} unregistered for session.` });
    } catch (error) {
      console.error(`[Route /api/servers DELETE] [Session ${sessionId}] Error unregistering server ${id}:`, error); // Modified log
      res.status(500).json({
        error: error.message || `An error occurred while unregistering server ${id}`,
      });
    }
  });

  // Get available servers endpoint - For the specific session
  app.get("/api/servers", sessionMiddleware(sessionManager), (req: Request, res: Response) => {
    const sessionId = (req as any).sessionId;
    console.log(`[Route /api/servers GET] Received request for session: ${sessionId}.`); // Added log
    const servers = mcpManager.getAvailableServers(sessionId); // Pass sessionId
    console.log(`[Route /api/servers GET] Found ${servers.length} servers for session ${sessionId}.`); // Added log
    res.json({ servers });
  });

  // Registry refresh endpoint - Fetches list, does NOT register
  app.post("/api/registry/refresh", sessionMiddleware(sessionManager), async (req: Request, res: Response) => {
    const sessionId = (req as any).sessionId; // Session ID needed for auth
    console.log(`[Route /api/registry/refresh] Received request for session: ${sessionId}.`); // Added log
    try {
      // fetchRegistryServers no longer takes arguments
      const registryServers = await mcpManager.fetchRegistryServers();
      console.log(`[Route /api/registry/refresh] Fetched ${registryServers.length} servers from registry.`); // Added log
      res.json({
        success: true,
        servers: registryServers, // Return the fetched list
      });
    } catch (error) {
      console.error(`[Route /api/registry/refresh] Error refreshing servers from registry:`, error); // Modified log
      res.status(500).json({
        error: error.message || "An error occurred while refreshing registry servers",
      });
    }
  });
}
