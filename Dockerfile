FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    ca-certificates

# Install yt-dlp
RUN pip3 install --break-system-packages yt-dlp

# Create app directory
WORKDIR /app

# Copy backend dependencies first for layer caching
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy frontend
COPY frontend/ ./frontend/

# Create downloads directory
RUN mkdir -p /downloads

# Expose port
EXPOSE 8484

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8484
ENV DOWNLOADS_DIR=/downloads

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8484/api/health || exit 1

CMD ["node", "backend/src/index.js"]
