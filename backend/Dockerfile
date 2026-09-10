FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source code
COPY --chown=node:node . .

USER node

# Expose the backend port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
