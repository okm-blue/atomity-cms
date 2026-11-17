FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs renderer.mjs seed.mjs ./
EXPOSE 4000
CMD ["npm", "start"]
