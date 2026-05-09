FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ vips-dev
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ vips-dev
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN apk add --no-cache ffmpeg curl
USER app
EXPOSE 3004
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1
CMD ["node","dist/index.js"]
