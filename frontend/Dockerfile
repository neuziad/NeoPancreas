# Use Node.js to build the frontend
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy project files
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Clear any vulnerabilities
RUN npm audit fix

# Use Nginx to serve the built files
FROM nginx:alpine
COPY ../nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
