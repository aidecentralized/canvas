import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { setupMcpManager } from "@/app/mcp/manager";
import { MessageParam } from "@anthropic-ai/sdk/resources/messages.mjs";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

const mcpManager = setupMcpManager();

export async function POST(request: Request) {
  try {
    const { messages, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey,
    });

    // Get available tools
    const discoveredTools = await mcpManager.discoverTools();
    console.log(discoveredTools)
    const availableTools = discoveredTools.map((tool: Tool) => ({
      name: tool.name,
      description: tool.description || "",
      input_schema: tool.inputSchema,
    }));
    console.log("Available Tools: ", availableTools)
    // Create initial completion
    const completion = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 10000,
      messages: messages as MessageParam[],
      tools: availableTools.length > 0 ? availableTools : undefined,
    });

    // Process tool calls if present
    const finalMessages = [...messages];
    let finalResponse = completion;

    // Check if there are any tool calls in the response
    const toolUses = completion.content.filter((c) => c.type === "tool_use");

    if (toolUses.length > 0) {
      // Add the assistant's response with tool calls
      finalMessages.push({
        role: "assistant",
        content: completion.content,
      });

      // Process each tool call
      for (const toolUse of toolUses) {
        try {
          const result = await mcpManager.executeToolCall(
            toolUse.name,
            toolUse.input
          );

          // Add the tool result to the messages
          finalMessages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result.content.map((c: { type: string; text?: string }) => {
                  if (c.type === "text") {
                    return {
                      type: "text",
                      text: c.text,
                    };
                  }
                  return c;
                }),
              },
            ],
          });
        } catch (error) {
          console.error(`Error executing tool ${toolUse.name}:`, error);

          // Add a tool error result
          finalMessages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: [
                  {
                    type: "text",
                    text: `Error executing tool: ${(error as Error).message || "Unknown error"}`,
                  },
                ],
              },
            ],
          });
        }
      }

      // Get a new completion with all the tool results
      finalResponse = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 10000,
        messages: finalMessages,
      });
    }

    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}