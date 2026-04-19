#!/bin/bash
# CrowdSync Cloud Deployment Pipeline

echo "Step 1: Setting up environment..."
# In a real environment, you'd pull from GCP Secret Manager here
export DATABASE_URL=${DATABASE_URL}

echo "Step 2: Pushing Prisma Schema to Cloud SQL..."
cd backend
npx prisma db push --accept-data-loss

echo "Step 3: Database deployed successfully!"
