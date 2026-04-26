FROM node:20-alpine
RUN apk add --no-cache git python3 make g++
WORKDIR /app
COPY package.json .
RUN npm install --legacy-peer-deps
COPY . .
EXPOSE 3001
CMD ["node", "server.mjs"]
