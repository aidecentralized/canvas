import React, { useState } from "react";
import { useMCP } from "@/contexts/MCPContext";
import ToolCard from "./ToolCard";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

const ToolList: React.FC = () => {
  const { tools, servers, status } = useMCP();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterConnected, setFilterConnected] = useState(false);
  const [filterType, setFilterType] = useState<string>("");

  // Get all tool types from servers
  const getServerTypes = () => {
    const types = new Set<string>();

    servers.forEach((server) => {
      if (server.transport.type) {
        types.add(server.transport.type);
      }
    });

    return Array.from(types);
  };

  // Flatten tools from all servers
  const getAllTools = () => {
    const allTools: any[] = [];

    Object.entries(tools).forEach(([serverId, serverTools]) => {
      const server = servers.find((s) => s.id === serverId);
      const isConnected = status[serverId]?.connected || false;

      if (
        (!filterConnected || isConnected) &&
        (!filterType || server?.transport.type === filterType)
      ) {
        serverTools.forEach((tool) => {
          allTools.push({
            serverId,
            serverName: server?.name || "Unknown Server",
            serverType: server?.transport.type || "unknown",
            isConnected,
            ...tool,
          });
        });
      }
    });

    return allTools;
  };

  // Filter tools based on search query
  const filteredTools = getAllTools().filter((tool) => {
    const searchLower = searchQuery.toLowerCase();

    const nameMatch = tool.name.toLowerCase().includes(searchLower);
    const descriptionMatch = tool.description
      ?.toLowerCase()
      .includes(searchLower);
    const serverMatch = tool.serverName.toLowerCase().includes(searchLower);

    return nameMatch || descriptionMatch || serverMatch;
  });

  // Calculate summary statistics
  const totalTools = filteredTools.length;
  const connectedTools = filteredTools.filter(
    (tool) => tool.isConnected
  ).length;
  const serverCount = new Set(filteredTools.map((tool) => tool.serverId)).size;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Search and filter controls */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center">
            <input
              id="filter-connected"
              type="checkbox"
              checked={filterConnected}
              onChange={(e) => setFilterConnected(e.target.checked)}
              className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <label
              htmlFor="filter-connected"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Connected only
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="filter-verified"
              type="checkbox"
              checked={filterVerified}
              onChange={(e) => setFilterVerified(e.target.checked)}
              className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <label
              htmlFor="filter-verified"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Verified only
            </label>
          </div>

          <div className="flex items-center">
            <label
              htmlFor="filter-type"
              className="mr-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Type:
            </label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm rounded-md border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All types</option>
              {getServerTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tools summary */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Tools
          </div>
          <div className="text-2xl font-bold">{totalTools}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Connected Tools
          </div>
          <div className="text-2xl font-bold">{connectedTools}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Servers
          </div>
          <div className="text-2xl font-bold">{serverCount}</div>
        </div>
      </div>

      {/* Tool cards */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool, index) => (
            <ToolCard
              key={`${tool.serverId}-${tool.name}-${index}`}
              tool={tool}
              serverName={tool.serverName}
              isConnected={tool.isConnected}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <AdjustmentsHorizontalIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            No tools found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default ToolList;
