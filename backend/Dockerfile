# HustleHub+ API image
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl wget

# Production dependencies only (reproducible, from package-lock.json)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --chown=node:node src ./src
RUN mkdir -p certs && chown node:node certs

# Never run as root
USER node
EXPOSE 5443

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-check-certificate -qO- https://localhost:5443/api/health || exit 1

# The API is HTTPS-only. Create a self-signed dev certificate on first start
# (never baked into the image); mount real certificates in production.
CMD ["sh", "-c", "[ -f certs/key.pem ] || openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj '/CN=localhost' -keyout certs/key.pem -out certs/cert.pem; exec node src/server.js"]
