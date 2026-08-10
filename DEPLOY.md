# CloudDroid Production Deployment

## Prerequisites on VPS

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git

# Install PM2 globally
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/clouddroid
sudo chown -R $USER:$USER /var/www/clouddroid
```

## Initial VPS Setup

```bash
# On VPS - clone repo
git clone <your-repo-url> /var/www/clouddroid
cd /var/www/clouddroid

# Create .env with production values
cp .env.example .env
nano .env

# Create data directory
mkdir -p .data

# Install deps and build
npm install
npm run build

# Start with PM2
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

## Nginx Setup

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/clouddroid
sudo ln -s /etc/nginx/sites-available/clouddroid /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## SSL with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d clouddroid.eu -d www.clouddroid.eu
```

## GitHub Actions Auto-Deploy

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

- `VPS_HOST` - your VPS IP or domain
- `VPS_USER` - SSH user (e.g., `root` or `ubuntu`)
- `VPS_PORT` - SSH port (default 22)
- `VPS_SSH_KEY` - private SSH key for VPS access

### Setup SSH Key

```bash
# On your local machine - generate key if needed
ssh-keygen -t ed25519 -C "deploy@clouddroid"

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-vps-ip

# Add private key to GitHub secrets
cat ~/.ssh/id_ed25519
```

## Manual Deploy from Local PC

```bash
# Push to GitHub (triggers auto-deploy)
git push origin main

# OR deploy directly via SSH
ssh user@your-vps-ip 'bash -s' < deploy/scripts/deploy.sh
```

## PM2 Commands

```bash
pm2 status
pm2 logs clouddroid
pm2 restart clouddroid
pm2 stop clouddroid
pm2 monit
```

## Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Important Notes

- `.env` must exist on VPS with production values
- `.data/` directory must be writable by the app
- Webhook URL: `https://clouddroid.eu/api/webhooks/dodopayments`
- Never commit `.env` or `.data/` to git
