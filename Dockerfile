# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run Backend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=frontend-build /app/dist ./dist
COPY --from=frontend-build /app/prisma ./prisma
COPY --from=frontend-build /app/*.ts ./
COPY --from=frontend-build /app/tsconfig*.json ./

# Install tsx globally or as a dev dependency
RUN npm install tsx

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 4000
CMD ["npx", "tsx", "server.ts"]
