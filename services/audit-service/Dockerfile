FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN apk add --no-cache curl
USER app
EXPOSE 3006
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3006/health || exit 1
CMD ["node","dist/index.js"]