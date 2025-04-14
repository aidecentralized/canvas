// server/src/mcp/toolRegistry.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

// Local declarations instead of importing from shared
interface CredentialRequirement {
  id: string;
  name: string;
  description?: string;
  acquisition?: {
    url?: string;
    instructions?: string;
  };
}

interface SharedToolInfo {
  name: string;
  description?: string;
  inputSchema: any;
  credentialRequirements?: CredentialRequirement[];
  serverId?: string;
  serverName?: string;
}

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
    console.log(`ToolRegistry: Registering ${tools.length} tools from server ID: ${serverId}`);
    
    for (const tool of tools) {
      console.log(`ToolRegistry: Processing tool: ${tool.name}`);
      
      // MODIFIED: Don't extract credential requirements - set to empty array
      // This ensures no tools will require credentials
      const credentialRequirements: CredentialRequirement[] = [];
      
      console.log(`ToolRegistry: Tool ${tool.name} credentials: none (credential requirements disabled)`);

      // Register the tool with empty credential requirements
      this.tools.set(tool.name, {
        serverId,
        serverName,
        client,
        tool,
        credentialRequirements
      });
      
      console.log(`ToolRegistry: Registered tool ${tool.name}`);
    }
  }

  getToolInfo(toolName: string): ToolInfo | undefined {
    return this.tools.get(toolName);
  }

  getAllTools(): SharedToolInfo[] {
    const tools = Array.from(this.tools.values()).map((info) => ({
      name: info.tool.name,
      description: info.tool.description,
      inputSchema: info.tool.inputSchema,
      credentialRequirements: info.credentialRequirements,
      serverId: info.serverId,
      serverName: info.serverName
    }));
    
    console.log(`ToolRegistry: getAllTools returning ${tools.length} tools`);
    return tools;
  }

  getToolsByServerId(serverId: string): SharedToolInfo[] {
    return Array.from(this.tools.values())
      .filter((info) => info.serverId === serverId)
      .map((info) => ({
        name: info.tool.name,
        description: info.tool.description,
        inputSchema: info.tool.inputSchema,
        credentialRequirements: info.credentialRequirements,
        serverId: info.serverId,
        serverName: info.serverName
      }));
  }

  getToolsWithCredentialRequirements(): { 
    toolName: string; 
    serverName: string;
    serverId: string;
    credentials: CredentialRequirement[];
  }[] {
    // MODIFIED: Always return empty array
    // This ensures the UI never shows credential requirements
    console.log(`ToolRegistry: getToolsWithCredentialRequirements: credential requirements disabled, returning empty array`);
    return [];
  }

  removeToolsByServerId(serverId: string): void {
    for (const [toolName, info] of this.tools.entries()) {
      if (info.serverId === serverId) {
        this.tools.delete(toolName);
      }
    }
  }
}
