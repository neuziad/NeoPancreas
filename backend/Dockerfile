# Use an official Python runtime as a parent image
FROM python:3.12.9-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Django project
COPY backend .

# Collect static files
RUN python manage.py migrate --noinput
RUN python manage.py collectstatic --noinput

# Expose ports for HTTP and WebSockets
EXPOSE 8000 8001

# Copy the supervisor config file
COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Start supervisor to run both servers
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
