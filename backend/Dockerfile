FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose the backend port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
