FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
COPY server ./server
COPY public ./public
COPY data ./data
COPY scripts ./scripts

EXPOSE 8080
CMD ["node", "server/index.js"]
