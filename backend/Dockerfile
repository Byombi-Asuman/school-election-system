FROM node:20-bullseye AS base
WORKDIR /app

# Install dependencies needed by Prisma
RUN apt-get update && apt-get install -y openssl

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build


# Production stage
FROM node:20-bullseye
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y openssl

COPY package*.json ./
RUN npm install 

COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p uploads/photos uploads/logos uploads/imports logs

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]