import { io, Socket } from 'socket.io-client';

type ToolExecutionHandler = (data: {
  toolName: string;
  serverId: string;
  serverName: string;
  result: {
    content: any[];
    isError?: boolean;
  }
}) => void;

type ResourcesListChangedHandler = (data: { serverId: string }) => void;
type ResourceUpdatedHandler = (data: { serverId: string, uri: string }) => void;

class SocketService {
  private socket: Socket | null = null;
  private toolExecutionHandlers: ToolExecutionHandler[] = [];
  private resourcesListChangedHandlers: ResourcesListChangedHandler[] = [];
  private resourceUpdatedHandlers: ResourceUpdatedHandler[] = [];
  private toolExecutionCache = new Map<string, {
    toolName: string;
    serverId: string;
    serverName: string;
    timestamp: string;
  }>();

  constructor() {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
    console.log('Initializing socket connection to:', API_BASE_URL);
    
    this.socket = io(API_BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('tool_executed', (data: any) => {
      console.log('Tool executed event received:', data);
      
      const { toolName, serverId, serverName, result } = data;
      
      // Store in cache
      this.toolExecutionCache.set(toolName, {
        toolName,
        serverId,
        serverName,
        timestamp: new Date().toISOString()
      });
      
      // Notify handlers
      this.toolExecutionHandlers.forEach(handler => {
        handler(data);
      });
    });

    // Set up resource-related event handlers
    this.socket.on('resources_list_changed', (data: { serverId: string }) => {
      console.log('Resources list changed event received:', data);
      this.resourcesListChangedHandlers.forEach(handler => {
        handler(data);
      });
    });

    this.socket.on('resource_updated', (data: { serverId: string, uri: string }) => {
      console.log('Resource updated event received:', data);
      this.resourceUpdatedHandlers.forEach(handler => {
        handler(data);
      });
    });
  }

  public addResourcesListChangedHandler(handler: ResourcesListChangedHandler) {
    this.resourcesListChangedHandlers.push(handler);
    console.log(`Added resources list changed handler, total: ${this.resourcesListChangedHandlers.length}`);
  }

  public removeResourcesListChangedHandler(handler: ResourcesListChangedHandler) {
    this.resourcesListChangedHandlers = this.resourcesListChangedHandlers.filter(h => h !== handler);
  }

  public addResourceUpdatedHandler(handler: ResourceUpdatedHandler) {
    this.resourceUpdatedHandlers.push(handler);
    console.log(`Added resource updated handler, total: ${this.resourceUpdatedHandlers.length}`);
  }

  public removeResourceUpdatedHandler(handler: ResourceUpdatedHandler) {
    this.resourceUpdatedHandlers = this.resourceUpdatedHandlers.filter(h => h !== handler);
  }

  public addToolExecutionHandler(handler: ToolExecutionHandler) {
    this.toolExecutionHandlers.push(handler);
    console.log(`Added tool execution handler, total: ${this.toolExecutionHandlers.length}`);
  }

  public removeToolExecutionHandler(handler: ToolExecutionHandler) {
    this.toolExecutionHandlers = this.toolExecutionHandlers.filter(h => h !== handler);
  }

  public getServerInfo(toolName: string) {
    return this.toolExecutionCache.get(toolName);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Export as a singleton
export const socketService = new SocketService();