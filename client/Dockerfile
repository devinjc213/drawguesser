# Stage 1: Build the application
FROM node:16 as build

# Print out the environment variables for debugging
RUN echo "VITE_DEV_IO_URL=${VITE_DEV_IO_URL}"
RUN echo "VITE_PROD_IO_URL=${VITE_PROD_IO_URL}"

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application using a lightweight web server
FROM nginx:alpine

# Copy the built files from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the port the app runs on
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]

