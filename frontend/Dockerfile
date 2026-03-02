# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Accept API_BASE_URL at build time (used by Next.js server-side proxy)
ARG API_BASE_URL=http://localhost:3000
ENV API_BASE_URL=$API_BASE_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Ensure public dir exists (Next.js requires it)
RUN mkdir -p /app/public

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Accept API_BASE_URL at runtime too (server-side env var)
ARG API_BASE_URL=http://localhost:3000
ENV API_BASE_URL=$API_BASE_URL

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from build stage
COPY --from=build /app/next.config.js ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
