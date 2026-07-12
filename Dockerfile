FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV JARVIS_WORKSPACE_ROOT=/data/cyvora

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN mkdir -p /data/cyvora/data /data/cyvora/tenants /data/cyvora/logs /data/cyvora/backend/app/agents/orchestrator \
  && chown -R node:node /app /data/cyvora

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
