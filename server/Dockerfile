# Stage 1: Build the application
FROM node:16 as build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Copy the JSON file to the dist directory
RUN cp ./src/controllers/1000_words.json ./dist/controllers

# Stage 2: Run the application
FROM node:16

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app/dist /app/dist
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Expose the application port
EXPOSE 3009

# Start the application
CMD ["node", "dist/index.js"]

