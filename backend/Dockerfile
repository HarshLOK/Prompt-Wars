FROM node:22-bookworm-slim

# Install system dependencies for Prisma
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Generate Prisma Client
RUN DATABASE_URL=postgresql://root:password@localhost:5432/crowdsync npx prisma generate

EXPOSE 4000
CMD [ "npm", "start" ]
