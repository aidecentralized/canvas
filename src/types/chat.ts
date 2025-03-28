export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface ToolCall {
  serverId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface MCPTool {
  serverId: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  content: string;
  toolCalls: ToolCall[];
  model: string;
  usage: UsageStats;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
  provider: "anthropic" | "openai";
}

export interface ChatContextType {
  threads: ChatThread[];
  currentThreadId: string | null;
  isLoading: boolean;
  error: string | null;
  createThread: () => string;
  setCurrentThread: (threadId: string) => void;
  addMessage: (threadId: string, role: MessageRole, content: string) => void;
  updateMessage: (threadId: string, messageId: string, content: string) => void;
  sendMessage: (content: string, tools?: MCPTool[]) => Promise<void>;
  clearThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  renameThread: (threadId: string, title: string) => void;
}
