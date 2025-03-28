import OpenAI from "openai";
import { ChatMessage, ChatResponse, MCPTool } from "@/types/chat";

// Initialize the OpenAI client
const getClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Please set the VITE_OPENAI_API_KEY environment variable."
    );
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // For client-side usage
  });
};

// Convert MCP tools to OpenAI tool format
const convertMCPToolsToOpenAITools = (mcpTools: MCPTool[]): any[] => {
  return mcpTools.map((tool) => ({
    type: "function",
    function: {
      name: `${tool.serverId}:${tool.name}`,
      description: tool.description || "",
      parameters: tool.inputSchema || { type: "object", properties: {} },
    },
  }));
};

// Map our message format to OpenAI's format
const mapToOpenAIMessages = (messages: ChatMessage[]): any[] => {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
};

export const chatWithOpenAI = async (
  messages: ChatMessage[],
  availableTools: MCPTool[] = [],
  model: string = import.meta.env.VITE_DEFAULT_OPENAI_MODEL || "gpt-4o",
  temperature: number = 0.7,
  maxTokens: number = 4000
): Promise<ChatResponse> => {
  try {
    const client = getClient();
    const openaiMessages = mapToOpenAIMessages(messages);

    // Create request parameters
    const requestParams: any = {
      model,
      messages: openaiMessages,
      temperature,
      max_tokens: maxTokens,
    };

    // Add tools if available
    if (availableTools.length > 0) {
      requestParams.tools = convertMCPToolsToOpenAITools(availableTools);
      requestParams.tool_choice = "auto";
    }

    // Make API call
    const response = await client.chat.completions.create(requestParams);

    // Get first (and usually only) choice
    const choice = response.choices[0];

    // Map tool calls
    const toolCalls =
      choice.message.tool_calls?.map((tool) => {
        const parts = tool.function.name.split(":");
        const serverId = parts[0];
        const toolName = parts.slice(1).join(":");

        return {
          serverId,
          toolName,
          args: JSON.parse(tool.function.arguments),
        };
      }) || [];

    return {
      content: choice.message.content || "",
      toolCalls,
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
};

export const streamChatWithOpenAI = async (
  messages: ChatMessage[],
  availableTools: MCPTool[] = [],
  model: string = import.meta.env.VITE_DEFAULT_OPENAI_MODEL || "gpt-4o",
  temperature: number = 0.7,
  maxTokens: number = 4000,
  onUpdate: (partialResponse: string) => void
): Promise<ChatResponse> => {
  try {
    const client = getClient();
    const openaiMessages = mapToOpenAIMessages(messages);

    // Create request parameters
    const requestParams: any = {
      model,
      messages: openaiMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    // Add tools if available
    if (availableTools.length > 0) {
      requestParams.tools = convertMCPToolsToOpenAITools(availableTools);
      requestParams.tool_choice = "auto";
    }

    // Make streaming API call
    const stream = (await client.chat.completions.create({
      ...requestParams,
      stream: true,
    })) as unknown as AsyncIterable<OpenAI.ChatCompletionChunk>;

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
      if (chunk.choices[0]?.delta?.content) {
        fullText += chunk.choices[0].delta.content;
        onUpdate(fullText);
      }

      // Process tool use chunks (OpenAI sends the complete tool call at the end)
      if (chunk.choices[0]?.delta?.tool_calls) {
        // Handle tool calls at the end
      }

      if (chunk.model) {
        modelInfo = chunk.model;
      }

      // Get the final tool calls from the last chunk
      if (chunk.choices[0]?.finish_reason === "tool_calls") {
        // We need to collect all tool calls from the final message
        // This will be done by the completion API in the next call
      }
    }

    // For OpenAI, we need to make an additional call to get the final tool calls and usage
    // This is because the streaming API doesn't include complete tool calls
    if (fullText && !toolCalls.length) {
      const finalMessage = {
        role: "assistant" as const,
        content: fullText,
      };

      // Add the assistant response to messages and make a non-streaming call to get tool calls
      const finalMessages = [...openaiMessages, finalMessage];
      const finalResponse = await client.chat.completions.create({
        model,
        messages: finalMessages,
        temperature,
        max_tokens: 1, // We just need the tool calls, not more content
        tools:
          availableTools.length > 0
            ? convertMCPToolsToOpenAITools(availableTools)
            : undefined,
        tool_choice: availableTools.length > 0 ? "auto" : undefined,
      });

      // Get tool calls from final response
      toolCalls =
        finalResponse.choices[0].message.tool_calls?.map((tool) => {
          const parts = tool.function.name.split(":");
          const serverId = parts[0];
          const toolName = parts.slice(1).join(":");

          return {
            serverId,
            toolName,
            args: JSON.parse(tool.function.arguments),
          };
        }) || [];

      // Get usage info
      usage = {
        promptTokens: finalResponse.usage?.prompt_tokens || 0,
        completionTokens: finalResponse.usage?.completion_tokens || 0,
        totalTokens: finalResponse.usage?.total_tokens || 0,
      };
    }

    return {
      content: fullText,
      toolCalls,
      model: modelInfo,
      usage,
    };
  } catch (error) {
    console.error("Error calling OpenAI streaming API:", error);
    throw error;
  }
};
