// server/src/mcp/toolRegistry.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

interface ToolInfo {
  serverId: string;
  client: Client;
  tool: Tool;
}

export class ToolRegistry {
  private tools: Map<string, ToolInfo> = new Map();

  registerTools(serverId: string, client: Client, tools: Tool[]): void {
    for (const tool of tools) {
      this.tools.set(tool.name, {
        serverId,
        client,
        tool,
      });
    }
  }

  getToolInfo(toolName: string): ToolInfo | undefined {
    return this.tools.get(toolName);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).map((info) => info.tool);
  }

  // Added method to get tools along with their serverId
  getAllToolsWithInfo(): ToolInfo[] {
    return Array.from(this.tools.values());
  }

  getToolsByServerId(serverId: string): Tool[] {
    return Array.from(this.tools.values())
      .filter((info) => info.serverId === serverId)
      .map((info) => info.tool);
  }

  removeToolsByServerId(serverId: string): void {
    for (const [toolName, info] of this.tools.entries()) {
      if (info.serverId === serverId) {
        this.tools.delete(toolName);
      }
    }
  }
}
