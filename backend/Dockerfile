# Stage 1: Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production runtime stage
FROM node:18-alpine
WORKDIR /app

# Install openssl for runtime certificate generation
RUN apk add --no-cache openssl

# Copy built dependencies and app source
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Use non-root user for security
USER node

# Expose backend HTTPS port
EXPOSE 5443

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-check-certificate --quiet --tries=1 --spider https://localhost:5443/api/health || exit 1

# Start backend server
CMD ["npm", "run", "dev"]