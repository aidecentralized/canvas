# MCP Client

A React-based client application for interacting with AI models and MCP (Model Context Protocol) servers. This application provides a chatbot-like interface that connects to Claude or OpenAI APIs for AI interactions, while supporting tool discovery and selection through the MCP protocol.

## Features

- 🤖 **AI Integration**: Connect to Claude or OpenAI models for natural language conversations
- 🔌 **MCP Support**: Discover and connect to MCP servers for enhanced tool capabilities
- 🔎 **Tool Discovery**: Search and browse available tools from connected MCP servers
- 💬 **Chat Interface**: Modern, responsive chat UI with message history
- 🔧 **Tool Selection**: Intelligently recommend and use tools based on conversation context
- 🔒 **API Key Management**: Secure storage and management of API keys
- 🐳 **Docker Support**: Easy deployment with Docker containers

## Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- Docker (optional, for containerized deployment)
- Valid API keys for Anthropic Claude and/or OpenAI

### Installation

#### Local Development

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/mcp-client.git
   cd mcp-client
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file from the example:

   ```
   cp .env.example .env
   ```

4. Fill in your API keys and configuration in the `.env` file

5. Start the development server:

   ```
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

#### Docker Deployment

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/mcp-client.git
   cd mcp-client
   ```

2. Create a `.env` file and fill in your configuration

3. Build and run with Docker Compose:

   ```
   docker-compose up -d
   ```

4. Access the application at `http://localhost:3000`

## Usage

### Configuring API Keys

1. Navigate to the Settings page
2. Enter your Anthropic Claude API key and/or OpenAI API key
3. Save your settings

### Connecting to MCP Servers

1. Go to the Tools page
2. Click "Add Server" to manually add a server or "Discover Servers" to search for available ones
3. Configure the server connection details and enable it

### Starting a Conversation

1. Navigate to the Chat page
2. Type your message in the input box and press Enter or click the send button
3. The AI will respond and may suggest relevant tools based on the conversation context
4. Select tools to enhance the AI's capabilities

## Architecture

The application follows a component-based architecture using React and TypeScript. It uses:

- React with TypeScript for type safety
- Context API for state management across components
- Tailwind CSS for styling
- Axios for API communication
- MCP SDK for protocol implementation

The main components include:

- Chat interface for user interactions
- MCP connection manager for server discovery and tool management
- API clients for Claude and OpenAI integration
- Settings management for user preferences

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Anthropic](https://www.anthropic.com/) for the Claude API and MCP specification
- [OpenAI](https://openai.com/) for the OpenAI API
- [Model Context Protocol](https://modelcontextprotocol.io/) community for the protocol implementation
- All the open-source libraries and tools used in this project
