import React, { useState } from "react";
import {
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import ToolDetail from "./ToolDetail";

interface ToolCardProps {
  tool: Tool;
  serverName: string;
  isConnected: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  serverName,
  isConnected,
}) => {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        <div className="p-4">
          {/* Tool header */}
          <div className="flex justify-between items-start">
            <h3
              className="text-lg font-medium text-gray-900 dark:text-white truncate"
              title={tool.name}
            >
              {tool.name}
            </h3>
            <div className="flex items-center">
              {isConnected ? (
                <span className="flex items-center text-xs text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Disconnected
                </span>
              )}
            </div>
          </div>

          {/* Server name */}
          <div
            className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate"
            title={serverName}
          >
            {serverName}
          </div>

          {/* Tool description */}
          <div className="mt-2">
            <p
              className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2"
              title={tool.description}
            >
              {tool.description || "No description available"}
            </p>
          </div>

          {/* Tool schema indicator */}
          <div className="mt-3 flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {tool.inputSchema
                  ? `${
                      Object.keys(tool.inputSchema.properties || {}).length
                    } parameters`
                  : "No parameters"}
              </span>
            </div>
            <button
              className="flex items-center text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetail(true);
              }}
            >
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Tool detail modal */}
      {showDetail && (
        <ToolDetail
          tool={tool}
          serverName={serverName}
          isConnected={isConnected}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
};

export default ToolCard;
