import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/store/store";

// Contexts
import { AuthProvider } from "@/contexts/AuthContext";
import { MCPProvider } from "@/contexts/MCPContext";
import { ChatProvider } from "@/contexts/ChatContext";

// Pages
import ChatPage from "@/pages/ChatPage";
import SettingsPage from "@/pages/SettingsPage";
import ToolsPage from "@/pages/ToolsPage";
import WelcomePage from "@/pages/WelcomePage";

// Layout components
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

const App = () => {
  return (
    <Provider store={store}>
      <AuthProvider>
        <MCPProvider>
          <ChatProvider>
            <Router>
              <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <Header />
                  <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <Routes>
                      <Route path="/" element={<WelcomePage />} />
                      <Route path="/chat" element={<ChatPage />} />
                      <Route path="/tools" element={<ToolsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </Router>
          </ChatProvider>
        </MCPProvider>
      </AuthProvider>
    </Provider>
  );
};

export default App;
