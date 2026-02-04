FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port (optional, for health checks)
EXPOSE 3002

# Start the service
CMD ["node", "src/server.js"]
