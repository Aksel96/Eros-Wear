# Imagen lista para cualquier hosting con Docker (Railway, Fly.io, Koyeb, Cloud Run, VPS...)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${PORT:-3000}/healthz || exit 1
CMD ["node", "app.js"]
