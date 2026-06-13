FROM node:20-alpine

RUN apk upgrade --no-cache

WORKDIR /app

# Copy workspace manifests for dependency install
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN npm ci --workspace=packages/shared --workspace=packages/api

# Copy Prisma schema and generate client
COPY packages/shared/prisma ./packages/shared/prisma
RUN npx prisma generate --schema=packages/shared/prisma/schema.prisma

# Copy source and build
COPY packages/shared/src ./packages/shared/src
COPY packages/api/src ./packages/api/src

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/api

EXPOSE 3001

CMD ["node", "packages/api/dist/index.js"]
