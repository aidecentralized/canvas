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
const REGISTRY_URL = process.env.REGISTRY_URL || "https://nanda-registry.com"; // Allow override, can be undefined
const REGISTRY_API_KEY = process.env.REGISTRY_API_KEY;

// Client URL setting
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"; // Default client URL

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(
  cors({
    origin: CLIENT_URL, // Ensure this matches the deployed frontend URL
    credentials: true,
    exposedHeaders: ["X-Session-Id"], // Keep exposed if client needs to read it, otherwise optional
  })
);

// Parse JSON body
app.use(express.json());
app.use(express.raw({ type: "application/octet-stream" }));

// Setup Socket.IO
const io = new SocketIoServer(server, {
  cors: {
    origin: CLIENT_URL, // Ensure this matches the deployed frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Instantiate Session Manager
const sessionManager = new SessionManager();

// Initialize MCP Manager with SessionManager and registry URL/Key
const mcpManager = setupMcpManager(
  io,
  sessionManager,
  REGISTRY_URL,
  REGISTRY_API_KEY
);

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
  if (REGISTRY_URL) {
    console.log(`Using registry URL: ${REGISTRY_URL}`);
  } else {
    console.log(`Registry URL not configured.`);
  }
  console.log(`Accepting requests from client URL: ${CLIENT_URL}`);
});
