import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChatContainer from "@/components/chat/ChatContainer";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";

const ChatPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { threads, setCurrentThread, createThread, currentThreadId } =
    useChat();

  // Parse the thread ID from the URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const threadId = params.get("thread");

    if (threadId) {
      // Check if the thread exists
      const threadExists = threads.some((thread) => thread.id === threadId);

      if (threadExists) {
        setCurrentThread(threadId);
      } else {
        // If the thread doesn't exist, redirect to the chat page without query params
        navigate("/chat", { replace: true });
      }
    } else if (threads.length > 0 && !currentThreadId) {
      // If no thread ID is provided and there are existing threads, use the most recent one
      const latestThread = threads.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      setCurrentThread(latestThread.id);
      navigate(`/chat?thread=${latestThread.id}`, { replace: true });
    } else if (threads.length === 0) {
      // If there are no threads at all, create one
      const newThreadId = createThread();
      navigate(`/chat?thread=${newThreadId}`, { replace: true });
    }
  }, [location.search, threads, navigate, setCurrentThread, createThread]);

  // If not authenticated, show a message prompting to add API keys
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[80vh]">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">
            API Key Required
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Please add your Claude or OpenAI API key in the settings to start
            chatting.
          </p>
          <a
            href="/settings"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 h-[calc(100vh-8rem)]">
      <ChatContainer />
    </div>
  );
};

export default ChatPage;
