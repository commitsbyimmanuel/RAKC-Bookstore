#!/bin/sh
set -e

echo "Building frontend with VITE_API_URL=${VITE_API_URL}"

# Build the Vite app with the runtime environment variable
npm run build

# Move built files to nginx directory
cp -r /app/dist/* /usr/share/nginx/html/

echo "Build complete, starting nginx..."

# Start nginx
exec nginx -g "daemon off;"
