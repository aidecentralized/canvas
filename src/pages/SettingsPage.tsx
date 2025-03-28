import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const SettingsPage: React.FC = () => {
  const {
    anthropicApiKey,
    openaiApiKey,
    setAnthropicApiKey,
    setOpenaiApiKey,
    clearApiKeys,
  } = useAuth();

  const [anthropicKey, setAnthropicKey] = useState(anthropicApiKey || "");
  const [openaiKey, setOpenaiKey] = useState(openaiApiKey || "");
  const [anthropicModel, setAnthropicModel] = useState(
    localStorage.getItem("anthropic-model") || "claude-3-7-sonnet-20250219"
  );
  const [openaiModel, setOpenaiModel] = useState(
    localStorage.getItem("openai-model") || "gpt-4o"
  );
  const [defaultProvider, setDefaultProvider] = useState(
    localStorage.getItem("default-provider") || "anthropic"
  );
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Update local state when context values change
  useEffect(() => {
    setAnthropicKey(anthropicApiKey || "");
    setOpenaiKey(openaiApiKey || "");
  }, [anthropicApiKey, openaiApiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Save API keys
    if (anthropicKey) {
      setAnthropicApiKey(anthropicKey);
    }

    if (openaiKey) {
      setOpenaiApiKey(openaiKey);
    }

    // Save other settings to localStorage
    localStorage.setItem("anthropic-model", anthropicModel);
    localStorage.setItem("openai-model", openaiModel);
    localStorage.setItem("default-provider", defaultProvider);

    // Show success message
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  const handleClearKeys = () => {
    if (confirm("Are you sure you want to clear all API keys?")) {
      clearApiKeys();
      setAnthropicKey("");
      setOpenaiKey("");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          Settings
        </h1>

        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-md">
            <p className="flex items-center">
              <svg
                className="h-5 w-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Settings saved successfully!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* API Keys Section */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              API Keys
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="anthropic-api-key"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Anthropic API Key
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="password"
                    id="anthropic-api-key"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-api..."
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get your Claude API key from the{" "}
                  <a
                    href="https://console.anthropic.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 dark:text-primary-400 underline"
                  >
                    Anthropic Console
                  </a>
                </p>
              </div>

              <div>
                <label
                  htmlFor="openai-api-key"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  OpenAI API Key
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="password"
                    id="openai-api-key"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get your OpenAI API key from the{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 dark:text-primary-400 underline"
                  >
                    OpenAI Dashboard
                  </a>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClearKeys}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                >
                  Clear API Keys
                </button>
              </div>
            </div>
          </div>

          {/* Model Settings */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Model Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="default-provider"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Default Provider
                </label>
                <select
                  id="default-provider"
                  value={defaultProvider}
                  onChange={(e) => setDefaultProvider(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                >
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="openai">OpenAI GPT</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="anthropic-model"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Claude Model
                </label>
                <select
                  id="anthropic-model"
                  value={anthropicModel}
                  onChange={(e) => setAnthropicModel(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                >
                  <option value="claude-3-7-sonnet-20250219">
                    Claude 3.7 Sonnet
                  </option>
                  <option value="claude-3-5-sonnet-20241022">
                    Claude 3.5 Sonnet
                  </option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                  <option value="claude-3-sonnet-20240229">
                    Claude 3 Sonnet
                  </option>
                  <option value="claude-3-haiku-20240307">
                    Claude 3 Haiku
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="openai-model"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  OpenAI Model
                </label>
                <select
                  id="openai-model"
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Application Settings */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Application Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="auto-suggest-tools"
                  type="checkbox"
                  checked={
                    localStorage.getItem("auto-suggest-tools") !== "false"
                  }
                  onChange={(e) =>
                    localStorage.setItem(
                      "auto-suggest-tools",
                      e.target.checked.toString()
                    )
                  }
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label
                  htmlFor="auto-suggest-tools"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Automatically suggest tools based on conversation context
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="save-conversations"
                  type="checkbox"
                  checked={
                    localStorage.getItem("save-conversations") !== "false"
                  }
                  onChange={(e) =>
                    localStorage.setItem(
                      "save-conversations",
                      e.target.checked.toString()
                    )
                  }
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label
                  htmlFor="save-conversations"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Save conversations locally
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Save Settings
            </button>
          </div>
        </form>

        {/* About Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            About MCP Client
          </h2>

          <div className="prose dark:prose-invert max-w-none">
            <p>
              MCP Client is an open-source application for interacting with AI
              models and MCP servers. It provides a unified interface for
              connecting to different AI providers and leveraging powerful tools
              through the Model Context Protocol.
            </p>

            <h3>Version</h3>
            <p>0.1.0</p>

            <h3>Credits</h3>
            <p>This project uses the following technologies:</p>
            <ul>
              <li>React</li>
              <li>TypeScript</li>
              <li>TailwindCSS</li>
              <li>Anthropic Claude API</li>
              <li>OpenAI API</li>
              <li>Model Context Protocol</li>
            </ul>

            <h3>License</h3>
            <p>MIT</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
