FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY --from=build /app/build ./build

ENV DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server.js"]
