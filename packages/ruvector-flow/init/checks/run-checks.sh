#!/bin/bash
# @ruvector/flow - Initialization Validation Checks Runner
# This script runs all validation checks and reports results

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        @ruvector/flow - Validation Checks Runner              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ to run validation checks"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js version is too old (${NODE_VERSION})${NC}"
    echo "Please upgrade to Node.js 18+"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"
echo ""

# Check if TypeScript files exist
if [ ! -f "$SCRIPT_DIR/index.ts" ]; then
    echo -e "${RED}✗ Validation check files not found${NC}"
    echo "Expected location: $SCRIPT_DIR/index.ts"
    exit 1
fi

echo -e "${GREEN}✓ Validation check files found${NC}"
echo ""

# Check if package is built
if [ ! -d "$PACKAGE_DIR/dist" ]; then
    echo -e "${YELLOW}⚠ Package not built. Building now...${NC}"
    cd "$PACKAGE_DIR"
    npm run build || {
        echo -e "${RED}✗ Build failed${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Build successful${NC}"
    echo ""
fi

# Run validation checks
echo -e "${BLUE}Running validation checks...${NC}"
echo ""

cd "$PACKAGE_DIR"

# Use tsx if available, otherwise compile and run
if command -v tsx &> /dev/null; then
    tsx "$SCRIPT_DIR/index.ts"
    EXIT_CODE=$?
elif command -v ts-node &> /dev/null; then
    ts-node --esm "$SCRIPT_DIR/index.ts"
    EXIT_CODE=$?
else
    # Compile and run
    node "$PACKAGE_DIR/dist/init/checks/index.js"
    EXIT_CODE=$?
fi

# Report final status
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  ✓ All checks passed!                         ║${NC}"
    echo -e "${GREEN}║         @ruvector/flow is ready to use                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                  ✗ Validation failed!                         ║${NC}"
    echo -e "${RED}║         Please fix the errors above                           ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
