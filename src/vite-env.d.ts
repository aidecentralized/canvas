/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANTHROPIC_API_KEY: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_ANTHROPIC_API_URL: string;
  readonly VITE_OPENAI_API_URL: string;
  readonly VITE_MCP_REGISTRY_URL: string;
  readonly VITE_DEFAULT_API: string;
  readonly VITE_DEFAULT_ANTHROPIC_MODEL: string;
  readonly VITE_DEFAULT_OPENAI_MODEL: string;
  readonly VITE_ENABLE_MCP_DISCOVERY: string;
  readonly VITE_ENABLE_TOOL_SUGGESTIONS: string;
  readonly VITE_LOG_LEVEL: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
