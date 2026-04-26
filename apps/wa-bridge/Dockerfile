FROM node:20-bullseye
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["node", "server.mjs"]
