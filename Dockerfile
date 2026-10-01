FROM node:22-bookworm

ENV NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    libuuid1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN npm install --include=optional --no-audit --no-fund \
    && npm cache clean --force

ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
