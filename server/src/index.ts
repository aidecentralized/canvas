// server/src/index.ts - Main entry point
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIoServer } from "socket.io";
import { config } from "dotenv";
import { setupRoutes } from "./routes.js";
import { setupMcpManager } from "./mcp/manager.js";
import { SessionManager } from "./mcp/sessionManager.js"; // Import SessionManager

// Load environment variables
config();

// Registry settings
const REGISTRY_URL = "https://nanda-registry.com";
const REGISTRY_API_KEY = process.env.REGISTRY_API_KEY;

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    exposedHeaders: ["X-Session-Id"], // Expose session ID header if needed by client
  })
);

// Parse JSON body
app.use(express.json());
app.use(express.raw({ type: "application/octet-stream" }));

// Setup Socket.IO
const io = new SocketIoServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Instantiate Session Manager
const sessionManager = new SessionManager();

// Initialize MCP Manager with SessionManager and registry URL
const mcpManager = setupMcpManager(io, sessionManager, REGISTRY_URL, REGISTRY_API_KEY);

// Setup routes, passing both managers
setupRoutes(app, mcpManager, sessionManager); // Pass sessionManager

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  // Cleanup sessions (closes MCP clients)
  await sessionManager.cleanupAllSessions();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
