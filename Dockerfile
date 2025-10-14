FROM nginx:1.29-alpine

# Copy the built app from the previous stage
COPY ./dist/slideshow/browser /usr/share/nginx/html

# Copy a custom Nginx configuration (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]