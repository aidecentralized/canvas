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
  rating?: number;
}

// Resource interfaces based on MCP specification
interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export class ToolRegistry {
  private tools: Map<string, ToolInfo> = new Map();
  private resources: Map<string, Resource> = new Map();
  private resourceTemplates: Map<string, ResourceTemplate> = new Map();

  registerTools(serverId: string, serverName: string, rating: number, client: Client, tools: Tool[]): void {
    console.log(`ToolRegistry: Registering ${tools.length} tools from server ID: ${serverId}`);
    
    for (const tool of tools) {
      console.log(`ToolRegistry: Processing tool: ${tool.name}`);
      
      // Restore credential requirements extraction
      let credentialRequirements: CredentialRequirement[] = [];
      
      // Extract credential requirements from the tool's input schema if available
      if (tool.inputSchema && typeof tool.inputSchema === 'object') {
        // Case 1: Check for __credentials object (traditional format)
        if (tool.inputSchema.properties && 
            typeof tool.inputSchema.properties === 'object' &&
            tool.inputSchema.properties.__credentials) {
          
          const credentialsSchema = tool.inputSchema.properties.__credentials as any;
          
          if (credentialsSchema.properties && typeof credentialsSchema.properties === 'object') {
            const credProps = credentialsSchema.properties;
            
            credentialRequirements = Object.entries(credProps).map(([id, schema]) => ({
              id,
              name: (schema as any).title || id,
              description: (schema as any).description || '',
              acquisition: (schema as any).acquisition || {}
            }));
            
            console.log(`ToolRegistry: Found ${credentialRequirements.length} credential requirements in __credentials for tool ${tool.name}`);
          }
        } 
        // Case 2: Check for common credential parameter names directly in properties
        else if (tool.inputSchema.properties && typeof tool.inputSchema.properties === 'object') {
          const commonCredentialNames = [
            'api_key', 'apiKey', 'apikey', 'key', 'token', 'access_token', 
            'accessToken', 'auth_token', 'authToken', 'password', 'secret', 
            'client_id', 'clientId', 'client_secret', 'clientSecret'
          ];
          
          for (const credName of commonCredentialNames) {
            if (credName in tool.inputSchema.properties) {
              const schema = tool.inputSchema.properties[credName] as any;
              
              credentialRequirements.push({
                id: credName,
                name: schema.title || `${credName.charAt(0).toUpperCase() + credName.slice(1).replace(/_/g, ' ')}`,
                description: schema.description || `${credName} required for authentication`,
                acquisition: schema.acquisition || {}
              });
              
              console.log(`ToolRegistry: Found direct credential parameter '${credName}' for tool ${tool.name}`);
            }
          }
        }
      }
      
      // Register the tool with credential requirements if any
      this.tools.set(tool.name, {
        serverId,
        serverName,
        client,
        tool,
        credentialRequirements: credentialRequirements || [], 
        rating,
      });
      
      console.log(`ToolRegistry: Registered tool ${tool.name} with ${credentialRequirements.length} credential requirements`);
    }
  }

  registerResources(serverId: string, resources: Resource[]): void {
    console.log(`ToolRegistry: Registering ${resources.length} resources from server ID: ${serverId}`);
    
    for (const resource of resources) {
      // Store server ID as part of the key to avoid conflicts between servers
      const resourceKey = `${serverId}:${resource.uri}`;
      this.resources.set(resourceKey, resource);
      console.log(`ToolRegistry: Registered resource ${resource.name} with URI ${resource.uri}`);
    }
  }

  registerResourceTemplates(serverId: string, templates: ResourceTemplate[]): void {
    console.log(`ToolRegistry: Registering ${templates.length} resource templates from server ID: ${serverId}`);
    
    for (const template of templates) {
      // Store server ID as part of the key to avoid conflicts between servers
      const templateKey = `${serverId}:${template.uriTemplate}`;
      this.resourceTemplates.set(templateKey, template);
      console.log(`ToolRegistry: Registered resource template ${template.name} with URI template ${template.uriTemplate}`);
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
      serverName: info.serverName,
      rating: info.rating ?? 0
    }));
    
    console.log(`ToolRegistry: getAllTools returning ${tools.length} tools`);
    return tools;
  }

  getAllResources(): Resource[] {
    const resources = Array.from(this.resources.values());
    console.log(`ToolRegistry: getAllResources returning ${resources.length} resources`);
    return resources;
  }

  getAllResourceTemplates(): ResourceTemplate[] {
    const templates = Array.from(this.resourceTemplates.values());
    console.log(`ToolRegistry: getAllResourceTemplates returning ${templates.length} templates`);
    return templates;
  }

  getResourcesByServerId(serverId: string): Resource[] {
    const resources: Resource[] = [];
    
    this.resources.forEach((resource, key) => {
      if (key.startsWith(`${serverId}:`)) {
        resources.push(resource);
      }
    });
    
    console.log(`ToolRegistry: getResourcesByServerId returning ${resources.length} resources for server ${serverId}`);
    return resources;
  }

  getResourceTemplatesByServerId(serverId: string): ResourceTemplate[] {
    const templates: ResourceTemplate[] = [];
    
    this.resourceTemplates.forEach((template, key) => {
      if (key.startsWith(`${serverId}:`)) {
        templates.push(template);
      }
    });
    
    console.log(`ToolRegistry: getResourceTemplatesByServerId returning ${templates.length} templates for server ${serverId}`);
    return templates;
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
    // Restored credential requirements functionality
    console.log(`ToolRegistry: getToolsWithCredentialRequirements: checking for tools with credential requirements`);
    
    const toolsWithCredentials = Array.from(this.tools.values())
      .filter((info) => info.credentialRequirements && info.credentialRequirements.length > 0)
      .map((info) => ({
        toolName: info.tool.name,
        serverName: info.serverName,
        serverId: info.serverId,
        credentials: info.credentialRequirements || []
      }));
      
    console.log(`ToolRegistry: Found ${toolsWithCredentials.length} tools requiring credentials`);
    return toolsWithCredentials;
  }

  removeToolsByServerId(serverId: string): void {
    for (const [toolName, info] of this.tools.entries()) {
      if (info.serverId === serverId) {
        this.tools.delete(toolName);
      }
    }
  }

  removeResourcesByServerId(serverId: string): void {
    for (const key of this.resources.keys()) {
      if (key.startsWith(`${serverId}:`)) {
        this.resources.delete(key);
      }
    }
    
    for (const key of this.resourceTemplates.keys()) {
      if (key.startsWith(`${serverId}:`)) {
        this.resourceTemplates.delete(key);
      }
    }
  }
}
