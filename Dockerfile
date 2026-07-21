FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN npm install express cors docx
COPY server.js ./
COPY --from=build /app/build ./build

ENV DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server.js"]
