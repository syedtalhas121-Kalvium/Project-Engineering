# Use a specific, lightweight Node.js runtime for a reproducible production image.
FROM node:20-alpine

# Keep application files in a clean, predictable directory.
WORKDIR /app

# Copy dependency manifests first so the install layer remains cached when only source files change.
COPY package*.json ./

# Install only runtime dependencies exactly as recorded in the lockfile.
RUN npm ci --only=production

# Prisma Client generation needs the schema available in the image.
COPY prisma ./prisma/

# Prisma's native query engine needs OpenSSL available in Alpine.
RUN apk add --no-cache openssl
RUN npx prisma generate

# Copy application source after dependency installation to preserve layer caching.
COPY . .

# Document the port used by the application.
EXPOSE 3000

# Start the ShipAPI server.
CMD ["node", "src/server.js"]
