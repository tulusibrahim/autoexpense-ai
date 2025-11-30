#!/bin/sh
# Docker entrypoint script to inject runtime environment variables

# Create config.js from environment variables
cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-https://autoexpense-ai-backend-production.up.railway.app}"
};
EOF

# Start nginx
exec nginx -g "daemon off;"

