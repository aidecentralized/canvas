import React, { useState } from "react";
import {
  PlusCircleIcon,
  ServerStackIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import ToolList from "@/components/tools/ToolList";
import { useMCP } from "@/contexts/MCPContext";
import { ServerConfig } from "@/lib/mcp/connection";

interface ServerFormData {
  name: string;
  description: string;
  transport: {
    type: "stdio" | "sse";
    config: {
      command?: string;
      args?: string[];
      url?: string;
      messageEndpoint?: string;
    };
  };
}

const ToolsPage: React.FC = () => {
  const { servers, status, addServer, discoverServers, toggleServerEnabled } =
    useMCP();

  const [isAddingServer, setIsAddingServer] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredServers, setDiscoveredServers] = useState<ServerConfig[]>(
    []
  );
  const [formData, setFormData] = useState<ServerFormData>({
    name: "",
    description: "",
    transport: {
      // type: "stdio",
      type: "sse",
      config: {
        command: "",
        args: [],
      },
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => {
        const parentKey = parent as keyof ServerFormData;
        const parentValue = prev[parentKey];

        // Make sure parentValue is an object before spreading
        if (parentValue && typeof parentValue === "object") {
          return {
            ...prev,
            [parent]: {
              ...parentValue,
              [child]: value,
            },
          };
        }

        // Fallback in case the parent isn't an object (shouldn't happen with your schema)
        return prev;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleTransportTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const type = e.target.value as "stdio" | "sse";

    setFormData((prev) => ({
      ...prev,
      transport: {
        type,
        config:
          type === "stdio"
            ? { command: "", args: [] }
            : { url: "", messageEndpoint: "/messages" },
      },
    }));
  };

  const handleServerToggle = async (serverId: string, enabled: boolean) => {
    try {
      await toggleServerEnabled(serverId, enabled);
    } catch (error) {
      console.error("Error toggling server:", error);
      alert(
        `Failed to ${enabled ? "enable" : "disable"} server: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const serverConfig: ServerConfig = {
        id: `server_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        transport: {
          type: formData.transport.type,
          config:
            formData.transport.type === "stdio"
              ? {
                  command: formData.transport.config.command || "",
                  args: formData.transport.config.args?.filter(Boolean) || [],
                }
              : {
                  url: formData.transport.config.url || "",
                  messageEndpoint:
                    formData.transport.config.messageEndpoint || "/messages",
                  headers: {},
                },
        },
        enabled: true,
      };

      await addServer(serverConfig);

      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        transport: {
          type: "stdio",
          config: {
            command: "",
            args: [],
          },
        },
      });
      setIsAddingServer(false);
    } catch (error) {
      console.error("Error adding server:", error);
      alert(
        `Failed to add server: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const handleDiscoverServers = async () => {
    try {
      setIsDiscovering(true);
      const discovered = await discoverServers();
      setDiscoveredServers(discovered);
    } catch (error) {
      console.error("Error discovering servers:", error);
      alert(
        `Failed to discover servers: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAddDiscoveredServer = async (server: ServerConfig) => {
    try {
      await addServer({
        ...server,
        enabled: true,
      });

      // Remove from discovered list
      setDiscoveredServers((prev) => prev.filter((s) => s.id !== server.id));
    } catch (error) {
      console.error("Error adding discovered server:", error);
      alert(
        `Failed to add server: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            MCP Tools
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Discover and manage MCP servers and tools
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setIsAddingServer(true)}
            className="btn-primary flex items-center justify-center"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Add Server
          </button>

          <button
            onClick={handleDiscoverServers}
            className="btn-secondary flex items-center justify-center"
            disabled={isDiscovering}
          >
            {isDiscovering ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <ServerStackIcon className="h-5 w-5 mr-2" />
                Discover Servers
              </>
            )}
          </button>
        </div>
      </div>

      {/* Server list */}
      {servers.length > 0 && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Connected Servers
          </h2>

          <div className="space-y-4">
            {servers.map((server) => (
              <div
                key={server.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {server.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {server.description || "No description"}
                  </p>
                  <div className="mt-1 flex items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 mr-2">
                      Type: {server.transport.type}
                    </span>
                    <span
                      className={`flex items-center ${
                        status[server.id]?.connected
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full mr-1 ${
                          status[server.id]?.connected
                            ? "bg-green-600 dark:bg-green-400"
                            : "bg-red-600 dark:bg-red-400"
                        }`}
                      ></span>
                      {status[server.id]?.connected
                        ? "Connected"
                        : "Disconnected"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="mr-4">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={server.enabled}
                        onChange={() =>
                          handleServerToggle(server.id, !server.enabled)
                        }
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                        {server.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovered servers */}
      {discoveredServers.length > 0 && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Discovered Servers
          </h2>

          <div className="space-y-4">
            {discoveredServers.map((server) => (
              <div
                key={server.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {server.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {server.description || "No description"}
                  </p>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Type: {server.transport.type}
                  </div>
                </div>

                <button
                  onClick={() => handleAddDiscoveredServer(server)}
                  className="btn-outline flex items-center"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-1" />
                  Add Server
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool list */}
      <ToolList />

      {/* Add server modal */}
      {isAddingServer && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Add MCP Server
                </h3>

                <form onSubmit={handleAddServer} className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Server Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Description (optional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="transport.type"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Transport Type
                    </label>
                    <select
                      id="transport.type"
                      name="transport.type"
                      value={formData.transport.type}
                      onChange={handleTransportTypeChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="stdio">STDIO</option>
                      <option value="sse">SSE</option>
                    </select>
                  </div>

                  {formData.transport.type === "stdio" ? (
                    <>
                      <div>
                        <label
                          htmlFor="transport.config.command"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Command
                        </label>
                        <input
                          type="text"
                          id="transport.config.command"
                          name="transport.config.command"
                          value={formData.transport.config.command || ""}
                          onChange={handleInputChange}
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., node, python, npx"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="transport.config.args"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Arguments (comma-separated)
                        </label>
                        <input
                          type="text"
                          id="transport.config.args"
                          name="transport.config.args"
                          value={(formData.transport.config.args || []).join(
                            ","
                          )}
                          onChange={(e) => {
                            const args = e.target.value
                              .split(",")
                              .map((arg) => arg.trim())
                              .filter(Boolean);
                            setFormData((prev) => ({
                              ...prev,
                              transport: {
                                ...prev.transport,
                                config: {
                                  ...prev.transport.config,
                                  args,
                                },
                              },
                            }));
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., script.js, --port, 8080"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label
                          htmlFor="transport.config.url"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Server URL
                        </label>
                        <input
                          type="url"
                          id="transport.config.url"
                          name="transport.config.url"
                          value={formData.transport.config.url || ""}
                          onChange={handleInputChange}
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., http://localhost:3000/sse"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="transport.config.messageEndpoint"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Message Endpoint
                        </label>
                        <input
                          type="text"
                          id="transport.config.messageEndpoint"
                          name="transport.config.messageEndpoint"
                          value={
                            formData.transport.config.messageEndpoint || ""
                          }
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                          placeholder="/messages"
                        />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Default: /messages
                        </p>
                      </div>
                    </>
                  )}

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Add Server
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingServer(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPage;
