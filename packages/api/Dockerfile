FROM node:20-slim

RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN npm ci --workspace=packages/shared --workspace=packages/api

# Prisma
COPY packages/shared/prisma ./packages/shared/prisma
RUN npx prisma generate --schema=packages/shared/prisma/schema.prisma

# Source + tsconfigs
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/api/tsconfig.json ./packages/api/
COPY packages/api/src ./packages/api/src

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/api

EXPOSE 3001

CMD ["node", "packages/api/dist/index.js"]
