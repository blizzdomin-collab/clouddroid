#!/usr/bin/env bash
set -euo pipefail

APP_NAME="clouddroid"
APP_DIR="/var/www/clouddroid"
BRANCH="main"
PM2_ECOSYSTEM="$APP_DIR/deploy/ecosystem.config.cjs"

echo "=== Deploying $APP_NAME ==="

cd "$APP_DIR"

echo "[1/5] Pulling latest code..."
git fetch origin
git reset --hard "origin/$BRANCH"

  echo "[2/5] Installing dependencies..."
  chown -R "$USER:$USER" "$APP_DIR" || true
  npm install --production=false --unsafe-perm

  echo "[2b/5] Ensuring Redis is available..."
  if ! command -v redis-server >/dev/null 2>&1; then
    echo "Redis not found. Install it manually on VPS."
  fi
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable redis-server || true
    systemctl restart redis-server || true
  fi

echo "[3/5] Building..."
npm run build

echo "[4/5] Ensuring data directory exists..."
mkdir -p "$APP_DIR/.data"

echo "[5/5] Restarting app with PM2..."
if [ -f "$PM2_ECOSYSTEM" ]; then
  pm2 reload "$PM2_ECOSYSTEM" --update-env || pm2 start "$PM2_ECOSYSTEM"
else
  pm2 reload "$APP_NAME" --update-env || pm2 start dist/server/entry.mjs --name "$APP_NAME"
fi

pm2 save

echo "=== Deployment complete ==="
pm2 status
