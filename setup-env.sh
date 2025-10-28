#!/bin/bash

# Script to rename environment files to their proper names
# Run this script to create .env and .env.ref files

echo "Creating environment files..."

# Copy env.example to .env
if [ -f "env.example" ]; then
    cp env.example .env
    echo "✅ Created .env file from env.example"
else
    echo "❌ env.example file not found"
fi

# Copy env.reference to .env.ref
if [ -f "env.reference" ]; then
    cp env.reference .env.ref
    echo "✅ Created .env.ref file from env.reference"
else
    echo "❌ env.reference file not found"
fi

echo ""
echo "Environment files created successfully!"
echo "📝 .env - Your actual environment configuration"
echo "📚 .env.ref - Reference documentation for all environment variables"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual configuration values"
echo "2. Run your load tests with: pnpm run start"
echo "3. Refer to .env.ref for documentation on all available variables"
