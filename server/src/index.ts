// server/src/index.ts - Main entry point
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIoServer } from "socket.io";
import { config } from "dotenv";
import { setupRoutes } from "./routes";
import { setupMcpManager, McpManager } from "./mcp/manager";

// Load environment variables
config();

// Registry settings
const REGISTRY_URL = "https://nanda-registry.com";
const REGISTRY_API_KEY = process.env.REGISTRY_API_KEY;

// Create Express app
const app = express();
const server = http.createServer(app);

// Add a root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'MCP Host Server is running',
    endpoints: ['/health', '/api/session', '/api/tools', '/api/servers']
  });
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  // Check if Socket.IO is working
  const ioStatus = io ? 'available' : 'unavailable';
  
  // Basic system information
  const memoryUsage = process.memoryUsage();
  const systemInfo = {
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
    },
    socketStatus: ioStatus,
    connectedClients: io.engine ? io.engine.clientsCount : 0,
  };
  
  res.status(200).json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    systemInfo
  });
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`REQUEST: ${req.method} ${req.url}`);
  next();
});

// Configure CORS
const corsOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://main.d40kvw57gjida.amplifyapp.com'];

console.log(`Configured CORS for origins: ${corsOrigins}`);

app.use(
  cors({
    origin: corsOrigins, // Use configured origins instead of wildcard
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['X-Requested-With', 'X-HTTP-Method-Override', 'Content-Type', 'Accept', 'x-api-key', 'x-session-id'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Add OPTIONS handler for preflight requests
app.options('*', cors());

// Parse JSON body
app.use(express.json());
app.use(express.raw({ type: "application/octet-stream" }));

// Setup Socket.IO
const io = new SocketIoServer(server, {
  cors: {
    origin: corsOrigins, // Use same origins as the main app
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['X-Requested-With', 'X-HTTP-Method-Override', 'Content-Type', 'Accept', 'x-api-key', 'x-session-id']
  },
  // Production-optimized settings for AWS AppRunner
  pingTimeout: 180000,         // 3 minutes ping timeout (increased)
  pingInterval: 10000,         // 10 seconds ping interval (very aggressive)
  connectTimeout: 90000,       // 1.5 minutes connect timeout (increased)
  path: '/socket.io',          // Explicitly set socket.io path
  transports: ['websocket'],  // Force websocket only for EC2
  allowUpgrades: false,         // No need to allow upgrades if only using websocket
  perMessageDeflate: true,     // Enable compression
  maxHttpBufferSize: 1e7,      // 10MB buffer for large payloads
  cookie: {
    name: 'io',
    path: '/',
    httpOnly: true,
    sameSite: 'lax'
  }
});

// Store io instance in app for access in routes
app.set('io', io);

// Socket.IO event handling
io.on('connection', (socket) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Socket connected: ${socket.id}`);
  
  // Track connection time to identify short-lived connections
  const connectionTime = Date.now();
  
  // Track socket IP and client info for troubleshooting
  const clientInfo = {
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    transport: socket.conn.transport.name
  };
  console.log(`Client connected from ${clientInfo.ip} using ${clientInfo.transport}`);
  
  // Setup event handlers
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
  
  socket.on('disconnect', (reason) => {
    const disconnectTime = Date.now();
    const connectionDuration = (disconnectTime - connectionTime) / 1000; // in seconds
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] Socket disconnected: ${socket.id}, reason: ${reason}, duration: ${connectionDuration.toFixed(1)}s`);
    
    // Log warning for very short connections
    if (connectionDuration < 10) {
      console.warn(`⚠️ Very short connection detected (${connectionDuration.toFixed(1)}s) for socket ${socket.id}. Possible network issues.`);
    }
  });
  
  // Handle reconnection attempts
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Socket ${socket.id} reconnect attempt #${attemptNumber}`);
  });
});

// Initialize MCP Manager - FIX: Initialize properly before using it
const mcpManager = setupMcpManager(io);
console.log("MCP Manager initialized successfully");

// Setup routes
setupRoutes(app, mcpManager);

// Log registered routes after setup
console.log('Registered routes:');
app._router.stack
  .filter(r => r.route)
  .forEach(r => {
    console.log(`${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
  });

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

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
