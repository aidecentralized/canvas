import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMCP } from "@/contexts/MCPContext";
import {
  ChatBubbleLeftRightIcon,
  WrenchScrewdriverIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const WelcomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { servers } = useMCP();

  const connectedServers = servers.filter((server) => server.enabled).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to MCP Client
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            A modern interface for discovering and using AI tools with Model
            Context Protocol
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/chat"
              className="btn-primary flex items-center justify-center gap-2"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              Start Chatting
            </Link>
            <Link
              to="/tools"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <WrenchScrewdriverIcon className="h-5 w-5" />
              Explore Tools
            </Link>
          </div>
        </div>

        {/* Status section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            System Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Authentication
              </h3>
              {isAuthenticated ? (
                <div className="flex items-center text-green-600 dark:text-green-400">
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
                  <span>Connected with API keys</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600 dark:text-red-400">
                  <svg
                    className="h-5 w-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    Not connected
                    <Link
                      to="/settings"
                      className="ml-2 text-primary-600 dark:text-primary-400 underline"
                    >
                      Configure API keys
                    </Link>
                  </span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                MCP Servers
              </h3>
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <span className="font-medium text-2xl mr-2">
                  {connectedServers}
                </span>
                <span>servers connected</span>
                <Link
                  to="/tools"
                  className="ml-auto text-primary-600 dark:text-primary-400"
                >
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Status
              </h3>
              <div className="flex items-center text-green-600 dark:text-green-400">
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
                <span>System ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick start section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Quick Start Guide
          </h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-800 dark:text-primary-200 font-bold">
                1
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Configure API Keys
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Add your Anthropic or OpenAI API keys in the settings page to
                  enable AI interactions.
                </p>
                <Link
                  to="/settings"
                  className="text-primary-600 dark:text-primary-400 font-medium flex items-center mt-1"
                >
                  Go to Settings
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-800 dark:text-primary-200 font-bold">
                2
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Discover MCP Tools
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Browse and connect to available MCP servers to enhance your AI
                  with powerful tools.
                </p>
                <Link
                  to="/tools"
                  className="text-primary-600 dark:text-primary-400 font-medium flex items-center mt-1"
                >
                  Explore Tools
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-800 dark:text-primary-200 font-bold">
                3
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Start Chatting
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Begin a conversation with AI and utilize connected tools to
                  accomplish tasks.
                </p>
                <Link
                  to="/chat"
                  className="text-primary-600 dark:text-primary-400 font-medium flex items-center mt-1"
                >
                  Start Chat
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
