FROM node:20-alpine
RUN apk add --no-cache chromium curl
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY src/ ./src/
EXPOSE 3007
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
CMD ["npm", "start"]