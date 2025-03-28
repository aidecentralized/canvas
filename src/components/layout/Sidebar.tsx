import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useChat } from "@/contexts/ChatContext";
import {
  ChatBubbleLeftRightIcon,
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
  HomeIcon,
  PlusCircleIcon,
  Bars3Icon,
  XMarkIcon,
  TrashIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { threads, currentThreadId, createThread, deleteThread, renameThread } =
    useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");

  // Navigation items
  const navItems = [
    { name: "Home", path: "/", icon: <HomeIcon className="h-5 w-5" /> },
    {
      name: "Chat",
      path: "/chat",
      icon: <ChatBubbleLeftRightIcon className="h-5 w-5" />,
    },
    {
      name: "Tools",
      path: "/tools",
      icon: <WrenchScrewdriverIcon className="h-5 w-5" />,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Cog6ToothIcon className="h-5 w-5" />,
    },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleCreateThread = () => {
    createThread();
    setIsOpen(true); // Ensure sidebar is open when creating a new thread
  };

  const startEditing = (threadId: string, title: string) => {
    setIsEditing(threadId);
    setEditedTitle(title);
  };

  const handleRename = (threadId: string) => {
    if (editedTitle.trim()) {
      renameThread(threadId, editedTitle);
    }
    setIsEditing(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, threadId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRename(threadId);
    } else if (e.key === "Escape") {
      setIsEditing(null);
    }
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-20 p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-10 w-64 bg-white dark:bg-gray-900 shadow-lg transition-transform transform 
          ${isOpen ? "translate-x-0" : "-translate-x-full"} 
          lg:translate-x-0 lg:static lg:inset-auto
        `}
      >
        <div className="h-full flex flex-col">
          {/* Brand header */}
          <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  src="/logo.svg"
                  alt="MCP Client"
                  className="h-8 w-8"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/32";
                  }}
                />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-medium text-gray-900 dark:text-white">
                  MCP Client
                </h1>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 bg-white dark:bg-gray-900 space-y-2 overflow-y-auto">
            {/* Main navigation */}
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Main Navigation
              </p>

              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md
                    ${
                      location.pathname === item.path
                        ? "bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    }
                  `}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Chat threads */}
            <div className="mt-8 space-y-1">
              <div className="px-3 flex justify-between items-center">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Your Conversations
                </p>
                <button
                  onClick={handleCreateThread}
                  className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  aria-label="New conversation"
                >
                  <PlusCircleIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {threads.length > 0 ? (
                  threads.map((thread) => (
                    <div key={thread.id} className="group relative">
                      <Link
                        to={`/chat?thread=${thread.id}`}
                        className={`
                          flex items-center px-3 py-2 text-sm font-medium rounded-md w-full truncate
                          ${
                            thread.id === currentThreadId
                              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                          }
                        `}
                      >
                        {isEditing === thread.id ? (
                          <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={() => handleRename(thread.id)}
                            onKeyDown={(e) => handleKeyDown(e, thread.id)}
                            className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:text-white"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate">{thread.title}</span>
                        )}
                      </Link>

                      {/* Thread actions */}
                      {!isEditing && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden group-hover:flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(thread.id, thread.title);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 rounded"
                            aria-label="Rename conversation"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this conversation?"
                                )
                              ) {
                                deleteThread(thread.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 rounded"
                            aria-label="Delete conversation"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                    No conversations yet
                  </div>
                )}
              </div>
            </div>
          </nav>

          {/* Sidebar footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Connected to MCP</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-0 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        ></div>
      )}
    </>
  );
};

export default Sidebar;
