#!/bin/bash

# --- NOVA.AI CONTROL PROTOCOL ---

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}---------------------------------------${NC}"
echo -e "${PURPLE}      NOVA.AI SYSTEM INITIALIZER       ${NC}"
echo -e "${PURPLE}---------------------------------------${NC}"

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo -e "${RED}[ERROR] Node.js not found. Please install Node.js to run NOVA.${NC}"
    exit
fi

echo -e "${GREEN}[INFO] System integrity verified.${NC}"
echo -e "${GREEN}[INFO] Starting NOVA Intelligence Console...${NC}"

# Start development server
# If you are on Windows and scripts are disabled, run: npx next dev
npm run dev
