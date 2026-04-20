FROM node:22-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 4000
CMD [ "npm", "start" ]
