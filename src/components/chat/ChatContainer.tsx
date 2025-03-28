import React, { useEffect, useState } from "react";
import ChatThread from "./ChatThread";
import ChatInput from "./ChatInput.tsx";
import { useChat } from "@/contexts/ChatContext";
import { useMCP } from "@/contexts/MCPContext";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { MCPTool } from "@/types/chat";

const ChatContainer: React.FC = () => {
  const { currentThreadId, createThread, sendMessage, isLoading } = useChat();
  const { tools, servers, status } = useMCP();
  const [selectedTools, setSelectedTools] = useState<MCPTool[]>([]);
  const [showToolSelector, setShowToolSelector] = useState(false);

  // If no thread exists, create one
  useEffect(() => {
    if (!currentThreadId) {
      createThread();
    }
  }, [currentThreadId, createThread]);

  // Map MCP tools to a format usable by the AI API
  const mapMCPTools = (): MCPTool[] => {
    const mcpTools: MCPTool[] = [];

    // Iterate through all servers and their tools
    Object.entries(tools).forEach(([serverId, serverTools]) => {
      // Only include tools from connected servers
      if (status[serverId]?.connected) {
        serverTools.forEach((tool: Tool) => {
          mcpTools.push({
            serverId,
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          });
        });
      }
    });

    return mcpTools;
  };

  // Toggle tool selection
  const toggleTool = (tool: MCPTool) => {
    setSelectedTools((prev) => {
      const exists = prev.some(
        (t) => t.serverId === tool.serverId && t.name === tool.name
      );

      if (exists) {
        return prev.filter(
          (t) => !(t.serverId === tool.serverId && t.name === tool.name)
        );
      } else {
        return [...prev, tool];
      }
    });
  };

  // Handle message submission
  const handleSendMessage = async (message: string) => {
    if (message.trim()) {
      await sendMessage(
        message,
        selectedTools.length > 0 ? selectedTools : mapMCPTools()
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto">
        {currentThreadId && <ChatThread threadId={currentThreadId} />}
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
        {showToolSelector && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg max-h-60 overflow-y-auto">
            <h3 className="text-sm font-medium mb-2">Available Tools</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {mapMCPTools().map((tool, index) => {
                const isSelected = selectedTools.some(
                  (t) => t.serverId === tool.serverId && t.name === tool.name
                );
                const serverName =
                  servers.find((s) => s.id === tool.serverId)?.name ||
                  tool.serverId;

                return (
                  <div
                    key={`${tool.serverId}-${tool.name}-${index}`}
                    className={`p-2 border rounded-md cursor-pointer text-sm ${
                      isSelected
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900"
                        : "border-gray-200 dark:border-gray-600"
                    }`}
                    onClick={() => toggleTool(tool)}
                  >
                    <div className="font-medium">{tool.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {serverName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          showToolSelector={showToolSelector}
          onToggleToolSelector={() => setShowToolSelector((prev) => !prev)}
          selectedToolCount={selectedTools.length}
        />
      </div>
    </div>
  );
};

export default ChatContainer;
