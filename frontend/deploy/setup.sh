#!/bin/bash
# ════════════════════════════════════════════════════════════
# NeuralBox Campus — Deploy Script
# Run on your VPS (Ubuntu 22/24)
# ════════════════════════════════════════════════════════════

set -e
echo "🧠 NeuralBox Campus — Deploy"

# ─── 1. System deps ───
echo "📦 Installing system dependencies..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx nodejs npm postgresql

# Install Node 20+ via nvm if needed
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# ─── 2. Create directories ───
echo "📁 Setting up directories..."
sudo mkdir -p /var/www/neuralbox-campus/{frontend,backend}
sudo chown -R $USER:$USER /var/www/neuralbox-campus

# ─── 3. Backend setup ───
echo "⚡ Setting up backend..."
cd /var/www/neuralbox-campus/backend
# Copy backend files here first, then:
cp .env.example .env
echo "⚠️  Edit /var/www/neuralbox-campus/backend/.env with your secrets!"
npm install
npx prisma generate
npx prisma db push
npm run db:seed

# ─── 4. Frontend setup ───
echo "🎨 Setting up frontend..."
cd /var/www/neuralbox-campus/frontend
npm install
npm run build

# ─── 5. Nginx ───
echo "🌐 Configuring Nginx..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/campus.neuralboxai.com
sudo ln -sf /etc/nginx/sites-available/campus.neuralboxai.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# ─── 6. SSL ───
echo "🔒 Setting up SSL..."
sudo certbot --nginx -d campus.neuralboxai.com --non-interactive --agree-tos -m neuralbox.ia@gmail.com

# ─── 7. PM2 for backend ───
echo "🔄 Setting up PM2..."
sudo npm install -g pm2
cd /var/www/neuralbox-campus/backend
pm2 start src/index.js --name neuralbox-api
pm2 save
pm2 startup

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ NeuralBox Campus deployed!"
echo "🌐 https://campus.neuralboxai.com"
echo "⚡ API: https://campus.neuralboxai.com/api/health"
echo "════════════════════════════════════════════════════════"
echo ""
echo "⚠️  IMPORTANT: Edit your .env file:"
echo "   nano /var/www/neuralbox-campus/backend/.env"
echo ""
echo "📋 Quick commands:"
echo "   pm2 logs neuralbox-api    — Ver logs"
echo "   pm2 restart neuralbox-api — Reiniciar API"
echo "   cd frontend && npm run build — Rebuild frontend"
