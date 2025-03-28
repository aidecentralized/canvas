import React from "react";
import { Dialog } from "@headlessui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

interface ToolDetailProps {
  tool: Tool;
  serverName: string;
  isConnected: boolean;
  onClose: () => void;
}

const ToolDetail: React.FC<ToolDetailProps> = ({
  tool,
  serverName,
  isConnected,
  onClose,
}) => {
  // Get parameters from schema
  const getParameters = () => {
    if (!tool.inputSchema || !tool.inputSchema.properties) {
      return [];
    }

    return Object.entries(tool.inputSchema.properties).map(([name, prop]) => ({
      name,
      description: (prop as any).description || "",
      type: (prop as any).type || "unknown",
      required: Array.isArray(tool.inputSchema?.required)
        ? tool.inputSchema.required.includes(name)
        : false,
      default: (prop as any).default,
    }));
  };

  const parameters = getParameters();

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container for centering */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-between items-center">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <span>{tool.name}</span>
              <span className="ml-3">
                {isConnected ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    <XCircleIcon className="h-3 w-3 mr-1" />
                    Disconnected
                  </span>
                )}
              </span>
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Server info */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Server
              </h3>
              <p className="text-gray-900 dark:text-white">{serverName}</p>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Description
              </h3>
              <p className="text-gray-900 dark:text-white">
                {tool.description || "No description available"}
              </p>
            </div>

            {/* Parameters */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Parameters
              </h3>

              {parameters.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Required
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {parameters.map((param, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0
                              ? "bg-white dark:bg-gray-800"
                              : "bg-gray-50 dark:bg-gray-700"
                          }
                        >
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                            {param.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {param.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {param.required ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {param.description || "No description"}
                            {param.default !== undefined && (
                              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                                (Default: {JSON.stringify(param.default)})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                  This tool does not have any parameters
                </p>
              )}
            </div>

            {/* Raw Schema (collapsible) */}
            <div className="mt-6">
              <details className="group">
                <summary className="flex items-center cursor-pointer text-sm font-medium text-gray-500 dark:text-gray-400">
                  <span>View Raw Schema</span>
                  <span className="ml-2 group-open:rotate-180 transition-transform">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </summary>
                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">
                    {JSON.stringify(tool.inputSchema, null, 2) ||
                      "No schema available"}
                  </pre>
                </div>
              </details>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ToolDetail;
