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

// Store io instance in app for access in routes
app.set('io', io);

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Initialize MCP Manager
const mcpManager = setupMcpManager(io);

// Setup routes
setupRoutes(app, mcpManager);

// Load servers from registry on startup
(async () => {
  try {
    // No need to fetch from registry as servers are loaded from local storage
    console.log(`Loading servers from local storage...`);
    const availableServers = mcpManager.getAvailableServers();
    console.log(`Loaded ${availableServers.length} servers from local storage`);
  } catch (error) {
    console.error("Error loading servers:", error);
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

// Setup routes
setupRoutes(app, mcpManager);

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
