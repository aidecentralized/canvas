// server/src/index.ts - Main entry point
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIoServer } from "socket.io";
import { config } from "dotenv";
import { setupRoutes } from "./routes.js";
import { setupMcpManager } from "./mcp/manager.js";

// Load environment variables
config();

// Registry settings
const REGISTRY_URL = "https://nanda-registry.com";
const REGISTRY_API_KEY = process.env.REGISTRY_API_KEY;

// Log registry configuration
console.log(`Registry URL configured: ${REGISTRY_URL}`);
console.log(`Registry API Key: ${REGISTRY_API_KEY ? 'provided' : 'not provided or empty'}`);

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
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

// Initialize MCP Manager with registry URL
const mcpManager = setupMcpManager(io, REGISTRY_URL, REGISTRY_API_KEY);

// Setup routes
setupRoutes(app, mcpManager);

// Load servers from registry on startup
(async () => {
  try {
    console.log("Fetching servers from registry...");
    const registryServers = await mcpManager.fetchRegistryServers();
    console.log(`Loaded ${registryServers.length} servers from registry`);
    if (registryServers.length === 0) {
      console.log("No servers were found from the registry. Possible reasons:");
      console.log("1. The registry API key might be missing or invalid");
      console.log("2. The registry server might be unavailable");
      console.log("3. There might not be any servers registered in the registry");
      console.log("Try using the '/api/registry/refresh' endpoint to manually refresh servers.");
    }
  } catch (error) {
    console.error("Error loading servers from registry:", error);
  }
})();

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  if (mcpManager.cleanup) {
    await mcpManager.cleanup();
  }
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
