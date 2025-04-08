// server/src/mcp/toolRegistry.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { CredentialRequirement, ToolInfo as SharedToolInfo } from "../../shared/types.js";

interface ToolInfo {
  serverId: string;
  serverName: string;
  client: Client;
  tool: Tool;
  credentialRequirements?: CredentialRequirement[];
}

export class ToolRegistry {
  private tools: Map<string, ToolInfo> = new Map();

  registerTools(serverId: string, serverName: string, client: Client, tools: Tool[]): void {
    for (const tool of tools) {
      // Extract credential requirements if present in the tool definition
      const credentialRequirements = (tool.inputSchema as any)?.__credentials?.required?.map(
        (id: string): CredentialRequirement => {
          const acquisition = (tool.inputSchema as any)?.__credentials?.acquisition;
          return {
            id,
            name: id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description: (tool.inputSchema as any)?.__credentials?.descriptions?.[id],
            acquisition: acquisition ? {
              url: acquisition.url,
              instructions: acquisition.instructions
            } : undefined
          };
        }
      );

      this.tools.set(tool.name, {
        serverId,
        serverName,
        client,
        tool,
        credentialRequirements
      });
    }
  }

  getToolInfo(toolName: string): ToolInfo | undefined {
    return this.tools.get(toolName);
  }

  getAllTools(): SharedToolInfo[] {
    return Array.from(this.tools.values()).map((info) => ({
      name: info.tool.name,
      description: info.tool.description,
      inputSchema: info.tool.inputSchema,
      credentialRequirements: info.credentialRequirements
    }));
  }

  getToolsByServerId(serverId: string): SharedToolInfo[] {
    return Array.from(this.tools.values())
      .filter((info) => info.serverId === serverId)
      .map((info) => ({
        name: info.tool.name,
        description: info.tool.description,
        inputSchema: info.tool.inputSchema,
        credentialRequirements: info.credentialRequirements
      }));
  }

  getToolsWithCredentialRequirements(): { 
    toolName: string; 
    serverName: string;
    serverId: string;
    credentials: CredentialRequirement[];
  }[] {
    return Array.from(this.tools.values())
      .filter(info => info.credentialRequirements && info.credentialRequirements.length > 0)
      .map(info => ({
        toolName: info.tool.name,
        serverName: info.serverName,
        serverId: info.serverId,
        credentials: info.credentialRequirements || []
      }));
  }

  removeToolsByServerId(serverId: string): void {
    for (const [toolName, info] of this.tools.entries()) {
      if (info.serverId === serverId) {
        this.tools.delete(toolName);
      }
    }
  }
}
