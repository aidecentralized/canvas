FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install
RUN npm install dotenv cors socket.io uuid @anthropic-ai/sdk axios

# Copy built application code
COPY server/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Expose the port
EXPOSE 4000

# Start the application
CMD ["node", "dist/index.js"]
