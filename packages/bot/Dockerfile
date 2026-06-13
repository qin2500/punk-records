FROM node:20-alpine

RUN apk upgrade --no-cache

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/bot/package.json ./packages/bot/

RUN npm ci --workspace=packages/shared --workspace=packages/bot

COPY packages/shared/prisma ./packages/shared/prisma
RUN npx prisma generate --schema=packages/shared/prisma/schema.prisma

COPY packages/shared/src ./packages/shared/src
COPY packages/bot/src ./packages/bot/src

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/bot

CMD ["node", "packages/bot/dist/index.js"]
