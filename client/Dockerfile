# Stage 1: build the Vite React app
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve with an unprivileged nginx (runs as a non-root user, listens on 8080)
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
USER nginx
CMD ["nginx", "-g", "daemon off;"]
