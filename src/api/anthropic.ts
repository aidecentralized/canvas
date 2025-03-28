import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage, ChatResponse, MCPTool } from "@/types/chat";

// Initialize the Anthropic client
const getClient = () => {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Anthropic API key not found. Please set the VITE_ANTHROPIC_API_KEY environment variable."
    );
  }

  return new Anthropic({
    apiKey,
  });
};

// Convert MCP tools to Anthropic tool format
const convertMCPToolsToAnthropicTools = (mcpTools: MCPTool[]): any[] => {
  return mcpTools.map((tool) => ({
    name: `${tool.serverId}:${tool.name}`,
    description: tool.description || "",
    input_schema: tool.inputSchema,
  }));
};

// Map our message format to Anthropic's format
const mapToAnthropicMessages = (messages: ChatMessage[]): any[] => {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
};

export const chatWithClaude = async (
  messages: ChatMessage[],
  availableTools: MCPTool[] = [],
  model: string = import.meta.env.VITE_DEFAULT_ANTHROPIC_MODEL ||
    "claude-3-7-sonnet-20250219",
  temperature: number = 0.7,
  maxTokens: number = 4000
): Promise<ChatResponse> => {
  try {
    const client = getClient();
    const anthropicMessages = mapToAnthropicMessages(messages);

    // Create request parameters
    const requestParams: any = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: anthropicMessages,
    };

    // Add tools if available
    if (availableTools.length > 0) {
      requestParams.tools = convertMCPToolsToAnthropicTools(availableTools);
    }

    // Make API call
    const response = await client.messages.create(requestParams);

    // Map tool calls
    const toolCalls = (response.content as any[])
      .filter((content) => content.type === "tool_use")
      .map((content) => {
        const parts = (content as any).name.split(":");
        const serverId = parts[0];
        const toolName = parts.slice(1).join(":");

        return {
          serverId,
          toolName,
          args: (content as any).input,
        };
      });

    // Extract text content
    const textContent = response.content
      .filter((content) => content.type === "text")
      .map((content) => (content as any).text)
      .join("\n");

    return {
      content: textContent,
      toolCalls,
      model: response.model,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens:
          (response.usage?.input_tokens || 0) +
          (response.usage?.output_tokens || 0),
      },
    };
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    throw error;
  }
};

export const streamChatWithClaude = async (
  messages: ChatMessage[],
  availableTools: MCPTool[] = [],
  model: string = import.meta.env.VITE_DEFAULT_ANTHROPIC_MODEL ||
    "claude-3-7-sonnet-20250219",
  temperature: number = 0.7,
  maxTokens: number = 4000,
  onUpdate: (partialResponse: string) => void
): Promise<ChatResponse> => {
  try {
    const client = getClient();
    const anthropicMessages = mapToAnthropicMessages(messages);

    // Create request parameters
    const requestParams: any = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: anthropicMessages,
      stream: true,
    };

    // Add tools if available
    if (availableTools.length > 0) {
      requestParams.tools = convertMCPToolsToAnthropicTools(availableTools);
    }
    // Make streaming API call
    const stream = (await client.messages.create(
      requestParams
    )) as unknown as AsyncIterable<any>;

    let fullText = "";
    let toolCalls: any[] = [];
    let modelInfo: string = model;
    let usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    for await (const chunk of stream) {
      // Process text chunks
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        fullText += chunk.delta.text;
        onUpdate(fullText);
      }

      // Process tool use chunks
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "tool_use_delta"
      ) {
        // Tool calls are handled in the final message
      }

      // Store model info
      if (chunk.type === "message_start") {
        modelInfo = chunk.message.model;
      }

      // Store usage info
      if (chunk.type === "message_stop") {
        if (chunk.message.usage) {
          usage = {
            promptTokens: chunk.message.usage.prompt_tokens || 0,
            completionTokens: chunk.message.usage.completion_tokens || 0,
            totalTokens: chunk.message.usage.total_tokens || 0,
          };
        }

        // Process final tool calls from complete message
        if (chunk.message.content) {
          toolCalls = chunk.message.content
            .filter((content: any) => content.type === "tool_use")
            .map((content: any) => {
              const parts = content.name.split(":");
              const serverId = parts[0];
              const toolName = parts.slice(1).join(":");

              return {
                serverId,
                toolName,
                args: content.input,
              };
            });
        }
      }
    }

    return {
      content: fullText,
      toolCalls,
      model: modelInfo,
      usage,
    };
  } catch (error) {
    console.error("Error calling Anthropic streaming API:", error);
    throw error;
  }
};
