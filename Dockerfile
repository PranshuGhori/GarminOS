# GarminOS: single-container image. Data lives in the /data volume.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma/schema.prisma prisma/schema.prisma
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

ENV NODE_ENV=production \
    GARMIN_DATA_DIR=/data \
    PORT=3000
VOLUME /data
EXPOSE 3000

# Inside a container the server must listen on all interfaces; exposure is controlled by the port mapping
# (docker-compose.yml publishes it on 127.0.0.1 only) and by the Host-header guard in src/proxy.ts.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
CMD ["docker-entrypoint.sh"]
