#!/usr/bin/env bash
# Turns ./backend into a complete Laravel 11 project. Run from the repo root:  bash scripts/setup-backend.sh
# Prereqs: PHP 8.2+, Composer, and the MySQL database/user from step 2 of the README.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v php >/dev/null      || { echo "PHP 8.2+ is required"; exit 1; }
command -v composer >/dev/null || { echo "Composer is required"; exit 1; }

if [ ! -f backend/artisan ]; then
  echo "→ Scaffolding Laravel 11 …"
  composer create-project laravel/laravel:^11.0 _laravel_tmp --no-interaction
  cp -rn _laravel_tmp/. backend/      # -n = never overwrite our own files
  rm -rf _laravel_tmp
fi

cd backend

if [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate --no-interaction
fi

# Merge .env.additions into .env (replacing any existing lines for the same keys)
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  grep -v -E "^#?\s*${key}=" .env > .env.tmp || true
  mv .env.tmp .env
  echo "${key}=${value}" >> .env
done < .env.additions

echo "→ Installing Sanctum / API scaffolding …"
composer require laravel/sanctum --no-interaction
php artisan install:api --no-interaction --without-migration-prompt 2>/dev/null || php artisan install:api --no-interaction || true

if ! grep -q "HasApiTokens" app/Models/User.php; then
  sed -i 's/^namespace App\\Models;/namespace App\\Models;\n\nuse Laravel\\Sanctum\\HasApiTokens;/' app/Models/User.php
  sed -i 's/use HasFactory, Notifiable;/use HasApiTokens, HasFactory, Notifiable;/' app/Models/User.php
fi

if ! grep -q "openalex" config/services.php; then
  sed -i "0,/^\];/s//    'openalex' => ['mailto' => env('OPENALEX_MAILTO')],\n];/" config/services.php
fi

echo
echo "✔ Backend scaffolded. Now run:"
echo "    cd backend && php artisan migrate --seed && php artisan serve"
