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
      
      // Extract credential requirements if present in the tool definition
      let credentialRequirements = (tool.inputSchema as any)?.__credentials?.required?.map(
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
      
      console.log(`ToolRegistry: Tool ${tool.name} credentials: ${credentialRequirements ? JSON.stringify(credentialRequirements) : 'none'}`);

      // Only set credential requirements if explicitly defined in the tool
      this.tools.set(tool.name, {
        serverId,
        serverName,
        client,
        tool,
        credentialRequirements: credentialRequirements || []
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
    console.log(`ToolRegistry: Checking for tools with credential requirements`);
    console.log(`ToolRegistry: Current tools: ${JSON.stringify(Array.from(this.tools.entries()).map(([name, info]) => {
      return {
        name,
        serverId: info.serverId,
        hasCredentials: !!(info.credentialRequirements && info.credentialRequirements.length > 0)
      }
    }))}`);
    
    const tools = Array.from(this.tools.values())
      .filter(info => info.credentialRequirements && info.credentialRequirements.length > 0)
      .map(info => ({
        toolName: info.tool.name,
        serverName: info.serverName,
        serverId: info.serverId,
        credentials: info.credentialRequirements || []
      }));
      
    console.log(`ToolRegistry: getToolsWithCredentialRequirements returning ${tools.length} tools: ${JSON.stringify(tools.map(t => t.toolName))}`);
    return tools;
  }

  removeToolsByServerId(serverId: string): void {
    for (const [toolName, info] of this.tools.entries()) {
      if (info.serverId === serverId) {
        this.tools.delete(toolName);
      }
    }
  }
}
