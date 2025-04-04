# MCP Host

MCP Host is a complete end-to-end implementation of a Model Context Protocol (MCP) host with an in-built MCP client. It provides a beautiful, polished chat interface with tool selection capabilities using MCP.

![MCP Host Screenshot](/path/to/screenshot.png)

## Features

- **Beautiful Chat Interface**: A clean, modern UI with glassmorphism design and a crimson color theme
- **MCP Client Integration**: Discover and use tools from MCP servers
- **Anthropic API Integration**: Powered by Claude, one of the most capable AI assistants
- **Server-Side Processing**: Backend handles communication with Anthropic and MCP servers
- **Docker Support**: Easy local deployment with Docker

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- An [Anthropic API key](https://console.anthropic.com/)

### Running with Docker

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/mcp-host.git
   cd mcp-host
   ```

2. Start the application with Docker Compose:

   ```bash
   docker-compose up -d
   ```

3. Access the application at [http://localhost:3000](http://localhost:3000)

4. In the app, click the gear icon to open settings and enter your Anthropic API key

### Development Setup

If you want to run the application in development mode:

#### Server

```bash
cd server
npm install
npm run dev
```

#### Client

```bash
cd client
npm install
npm start
```

## Configuring MCP Servers

MCP Host can connect to multiple MCP servers. To add a server:

1. Open the application and click the gear icon to access settings
2. Go to the "MCP Servers" tab
3. Fill in the server details:
   - **Server ID**: A unique identifier for the server
   - **Server Name**: A human-readable name
   - **Command**: The command to run the server (e.g., `python`, `node`)
   - **Arguments**: Space-separated list of arguments (e.g., `/path/to/server.py`)
4. Click "Add Server"

## Architecture

MCP Host consists of:

- **Frontend**: React application with Chakra UI
- **Backend**: Node.js server with Express
- **MCP Client**: Integrated client using the official MCP SDK

The application follows a clean architecture pattern with separation of concerns:

- **Client**: UI components, contexts for state management
- **Server**: API endpoints, MCP integration, tool execution
- **Shared**: Common types used by both client and server

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP standard
- [Anthropic](https://www.anthropic.com/) for the Claude AI assistant
- [Chakra UI](https://chakra-ui.com/) for the UI components
