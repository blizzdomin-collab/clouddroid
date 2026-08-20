#!/usr/bin/env bash
set -euo pipefail

APP_NAME="clouddroid"
APP_DIR="/var/www/clouddroid"
BRANCH="main"
PM2_ECOSYSTEM="$APP_DIR/deploy/ecosystem.config.cjs"

echo "=== Deploying $APP_NAME ==="

cd "$APP_DIR"

echo "[1/6] Pulling latest code..."
git config --global --add safe.directory "$APP_DIR"
sudo -n chown -R $USER:$USER "$APP_DIR" || true
git fetch origin
git reset --hard "origin/$BRANCH"

echo "[2/6] Installing dependencies..."
npm install --production=false

echo "[2b/6] Ensuring Redis is available..."
if ! command -v redis-server >/dev/null 2>&1; then
  echo "Redis not found. Install it manually on VPS."
fi
if command -v systemctl >/dev/null 2>&1; then
  sudo -n systemctl enable redis-server || true
  sudo -n systemctl restart redis-server || true
fi

echo "[3/6] Cleaning old build artifacts..."
rm -rf dist
rm -rf .astro

echo "[4/6] Building..."
npm run build

echo "[5/6] Verifying build output..."
if [ ! -f "dist/server/entry.mjs" ]; then
  echo "ERROR: Build failed - dist/server/entry.mjs not found"
  exit 1
fi

echo "[6/6] Restarting app with PM2..."
if [ -f "$PM2_ECOSYSTEM" ]; then
  pm2 reload "$PM2_ECOSYSTEM" --update-env || pm2 start "$PM2_ECOSYSTEM"
else
  pm2 reload "$APP_NAME" --update-env || pm2 start dist/server/entry.mjs --name "$APP_NAME"
fi

pm2 save

echo "=== Waiting for PM2 to stabilize..."
sleep 5

echo "=== Verifying PM2 status..."
pm2 status

echo "=== Deployment complete ==="
