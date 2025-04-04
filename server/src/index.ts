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

// Setup Socket.IO
const io = new SocketIoServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize MCP Manager
const mcpManager = setupMcpManager(io);

// Setup routes
setupRoutes(app, mcpManager);

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
