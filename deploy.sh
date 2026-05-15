#!/bin/bash
set -e

cd "$(dirname "$0")"

# Kleuren
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 PortfolioNL Deploy${NC}"
echo "────────────────────────"

# Commit beschrijving opvragen
if [ -n "$1" ]; then
  MSG="$1"
else
  echo -e "${YELLOW}Wat is de commit beschrijving?${NC}"
  read -r MSG
fi

if [ -z "$MSG" ]; then
  echo -e "${RED}✗ Geen beschrijving opgegeven. Afgebroken.${NC}"
  exit 1
fi

# Controleer of er wijzigingen zijn
if git diff --quiet && git diff --cached --quiet && [ -z "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠ Geen wijzigingen gevonden.${NC}"
  exit 0
fi

# Build
echo -e "\n${BLUE}▶ Bouwen...${NC}"
npm run build

# Commit & push
echo -e "\n${BLUE}▶ Committen en pushen...${NC}"
git add -A
git commit -m "$MSG

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push

echo -e "\n${GREEN}✓ Klaar! Vercel deployt automatisch.${NC}"
echo -e "${GREEN}  → https://portfolionl.nl${NC}"
