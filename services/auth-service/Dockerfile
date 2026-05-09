FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN apk add --no-cache ffmpeg curl
USER app
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD ["node","dist/index.js"]
