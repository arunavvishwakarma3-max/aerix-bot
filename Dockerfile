FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /data && chown -R node:node /data

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

USER node

CMD ["node", "index.js"]
