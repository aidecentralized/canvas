import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextProps {
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  isAuthenticated: boolean;
  setAnthropicApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  clearApiKeys: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [anthropicApiKey, setAnthropicApiKeyState] = useState<string | null>(
    null
  );
  const [openaiApiKey, setOpenaiApiKeyState] = useState<string | null>(null);

  // Load API keys from localStorage on initial render
  useEffect(() => {
    // Use environment variables first if available
    const envAnthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    const envOpenaiKey = import.meta.env.VITE_OPENAI_API_KEY;

    // Then check localStorage (which would override env vars if present)
    const savedAnthropicKey = localStorage.getItem("anthropic-api-key");
    const savedOpenaiKey = localStorage.getItem("openai-api-key");

    if (envAnthropicKey) {
      setAnthropicApiKeyState(envAnthropicKey);
    } else if (savedAnthropicKey) {
      setAnthropicApiKeyState(savedAnthropicKey);
    }

    if (envOpenaiKey) {
      setOpenaiApiKeyState(envOpenaiKey);
    } else if (savedOpenaiKey) {
      setOpenaiApiKeyState(savedOpenaiKey);
    }
  }, []);

  const setAnthropicApiKey = (key: string) => {
    localStorage.setItem("anthropic-api-key", key);
    setAnthropicApiKeyState(key);
  };

  const setOpenaiApiKey = (key: string) => {
    localStorage.setItem("openai-api-key", key);
    setOpenaiApiKeyState(key);
  };

  const clearApiKeys = () => {
    localStorage.removeItem("anthropic-api-key");
    localStorage.removeItem("openai-api-key");
    setAnthropicApiKeyState(null);
    setOpenaiApiKeyState(null);
  };

  // Determine authentication status based on the presence of at least one API key
  const isAuthenticated = !!(anthropicApiKey || openaiApiKey);

  const value: AuthContextProps = {
    anthropicApiKey,
    openaiApiKey,
    isAuthenticated,
    setAnthropicApiKey,
    setOpenaiApiKey,
    clearApiKeys,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the Auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
