# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Create data directory for volume mounting
RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production
ENV DB_PATH=/app/data/tailorflow.db

CMD ["node", "dist/index.js"]
