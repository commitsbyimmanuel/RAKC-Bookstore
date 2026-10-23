#!/bin/sh
set -e

node /app/configure-nginx.mjs

echo "Building frontend with same-origin API access"

# Build the Vite app with the runtime environment variable
npm run build

# Move built files to nginx directory
cp -r /app/dist/* /usr/share/nginx/html/

echo "Build complete, starting nginx..."

# Start nginx
exec nginx -g "daemon off;"
