#!/bin/bash

# Deployment script for SecureFlow contract
# Usage: ./deploy.sh <SECRET_KEY>

set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <SECRET_KEY>"
    echo "Example: ./deploy.sh SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    exit 1
fi

SECRET_KEY=$1
ADMIN_ADDRESS="GA4ZOMOFTULCYRHJ36GBKTQU3RLF4MR4HJH4DI7UBG4SRHCTRNJ7ICS3"
FEE_COLLECTOR="GA4ZOMOFTULCYRHJ36GBKTQU3RLF4MR4HJH4DI7UBG4SRHCTRNJ7ICS3"
PLATFORM_FEE_BP=100  # 1% = 100 basis points

echo "🔨 Building contract..."
cd contracts/secureflow
cargo build --target wasm32-unknown-unknown --release
cd ../..

echo "📦 Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/secureflow.wasm \
    --network testnet \
    --source $SECRET_KEY \
    --output-id 2>&1 | grep -oP 'Contract ID: \K[^\s]+' || echo "")

if [ -z "$CONTRACT_ID" ]; then
    echo "❌ Failed to get contract ID from deployment"
    exit 1
fi

echo "✅ Contract deployed: $CONTRACT_ID"

echo "🔧 Initializing contract..."
stellar contract invoke \
    --id $CONTRACT_ID \
    --network testnet \
    --source $SECRET_KEY \
    -- \
    initialize \
    --owner $ADMIN_ADDRESS \
    --fee_collector $FEE_COLLECTOR \
    --platform_fee_bp $PLATFORM_FEE_BP

echo "✅ Contract initialized"
echo ""
echo "📝 Update your frontend config with:"
echo "   Contract ID: $CONTRACT_ID"
echo "   Or set VITE_SECUREFLOW_CONTRACT_ID=$CONTRACT_ID in your .env file"

