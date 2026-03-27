# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Accept VITE_API_URL as a build argument
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config to handle SPA routing
RUN printf "server { \n\
    listen 80; \n\
    location / { \n\
    root /usr/share/nginx/html; \n\
    index index.html index.htm; \n\
    try_files \$uri \$uri/ /index.html; \n\
    } \n\
    location /api/ { \n\
    proxy_pass http://backend:3001/api/; \n\
    proxy_http_version 1.1; \n\
    proxy_set_header Upgrade \$http_upgrade; \n\
    proxy_set_header Connection 'upgrade'; \n\
    proxy_set_header Host \$host; \n\
    proxy_cache_bypass \$http_upgrade; \n\
    } \n\
    }" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
