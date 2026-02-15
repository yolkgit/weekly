# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run Application
FROM node:20-alpine
WORKDIR /app

# Copy dependency files
COPY package*.json ./
# Install all dependencies (including dev, needed for tsx and prisma)
RUN npm install

# Copy relevant files from build stage
COPY --from=frontend-build /app/dist ./dist
COPY --from=frontend-build /app/prisma ./prisma
COPY --from=frontend-build /app/*.ts ./
COPY --from=frontend-build /app/tsconfig*.json ./
# Copy folders for backend context
COPY --from=frontend-build /app/context ./context
COPY --from=frontend-build /app/pages ./pages
COPY --from=frontend-build /app/components ./components
COPY --from=frontend-build /app/services ./services
COPY --from=frontend-build /app/types.ts ./
COPY --from=frontend-build /app/constants.ts ./
COPY --from=frontend-build /app/authMiddleware.ts ./

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 4000
CMD ["npx", "tsx", "server.ts"]
