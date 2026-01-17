# Build stage - install dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Production stage - includes node for building + nginx for serving
FROM node:20-alpine

# Install nginx
RUN apk add --no-cache nginx

# Create nginx directories
RUN mkdir -p /usr/share/nginx/html /run/nginx

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy app source and node_modules from builder
WORKDIR /app
COPY --from=builder /app ./

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Build at runtime and start nginx
ENTRYPOINT ["/entrypoint.sh"]
