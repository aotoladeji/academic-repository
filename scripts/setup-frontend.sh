#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../frontend"
[ -f .env ] || cp .env.example .env
npm install
echo "✔ Frontend ready. Start it with: cd frontend && npm run dev"
