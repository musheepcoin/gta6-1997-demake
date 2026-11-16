#!/usr/bin/env bash
# ============================================================================
# VICE CITY 26 — 1-CLICK HOSTINGER KVM2 PERSISTENT WORLD INSTALLER
# Usage on your Hostinger KVM2 VPS (Ubuntu / Debian):
#   curl -fsSL https://raw.githubusercontent.com/musheepcoin/gta6-1997-demake/main/server/install_hostinger.sh | bash
# ============================================================================
set -e

echo "🌴 Installing Vice City 26 Persistent World Server on Hostinger KVM2..."

# 1. Install Node.js & git if not already installed
if ! command -v node >/dev/null 2>&1; then
    echo "📦 Installing Node.js..."
    apt-get update -y
    apt-get install -y curl git ufw
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# 2. Install PM2 process manager for 24/7 auto-restart
if ! command -v pm2 >/dev/null 2>&1; then
    echo "⚙️ Installing PM2..."
    npm install -g pm2
fi

# 3. Clone or update repository in /opt/vice-city-26-server
mkdir -p /opt/vice-city-26-server
cd /opt/vice-city-26-server
if [ ! -d ".git" ]; then
    git clone --depth 1 https://github.com/musheepcoin/gta6-1997-demake.git .
else
    git pull origin main
fi

# 4. Open port 8787 if ufw is active
if command -v ufw >/dev/null 2>&1; then
    ufw allow 8787/tcp >/dev/null 2>&1 || true
fi

# 5. Start or reload world_server.js with PM2 and save startup service
cd /opt/vice-city-26-server/server
pm2 delete vc26-world >/dev/null 2>&1 || true
PORT=8787 pm2 start world_server.js --name "vc26-world"
pm2 save

PUBLIC_IP=$(curl -4 -s ifconfig.me || hostname -I | awk '{print $1}')
echo "===================================================================="
echo "✅ VICE CITY 26 PERSISTENT WORLD SERVER IS LIVE 24/7!"
echo "🔗 WebSocket URL : ws://${PUBLIC_IP}:8787"
echo "📊 Status JSON   : http://${PUBLIC_IP}:8787/status"
echo ""
echo "👉 In the game chat [T], type:"
echo "   /server ws://${PUBLIC_IP}:8787"
echo "   (or open the game with ?ws=ws://${PUBLIC_IP}:8787)"
echo "===================================================================="
