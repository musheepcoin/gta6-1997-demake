#!/usr/bin/env bash
# ============================================================================
# VICE CITY 26 — 1-CLICK HOSTINGER KVM2 PERSISTENT WORLD INSTALLER
# Zero npm required: uses native Node.js + Ubuntu systemd 24/7 service!
# ============================================================================
set -e

echo "🌴 Installing Vice City 26 Persistent World Server on Hostinger KVM2..."

# 1. Ensure node and git are installed
if ! command -v node >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
    echo "📦 Installing Node.js & Git..."
    apt-get update -y
    apt-get install -y curl git nodejs
fi

NODE_BIN=$(command -v node)
echo "✅ Found Node.js at: ${NODE_BIN} ($(node -v))"

# 2. Clone or update repository in /opt/vice-city-26-server
mkdir -p /opt/vice-city-26-server
cd /opt/vice-city-26-server
if [ ! -d ".git" ]; then
    git clone --depth 1 https://github.com/musheepcoin/gta6-1997-demake.git .
else
    git pull origin main
fi

# 3. Open port 8787 if ufw is active
if command -v ufw >/dev/null 2>&1; then
    ufw allow 8787/tcp >/dev/null 2>&1 || true
fi

# 4. Create & enable native systemd 24/7 auto-restart service (zero npm/pm2 needed!)
cat <<EOF > /etc/systemd/system/vc26-world.service
[Unit]
Description=Vice City 26 Persistent World Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/vice-city-26-server/server
Environment=PORT=8787
Environment=HOST=0.0.0.0
ExecStart=${NODE_BIN} /opt/vice-city-26-server/server/world_server.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vc26-world >/dev/null 2>&1 || true
systemctl restart vc26-world
sleep 1

PUBLIC_IP=$(curl -4 -s ifconfig.me || hostname -I | awk '{print $1}')
HOST_FQDN=$(hostname -f 2>/dev/null || hostname)

echo "===================================================================="
echo "✅ VICE CITY 26 PERSISTENT WORLD SERVER IS LIVE 24/7!"
echo "🖥️  Hostname      : ${HOST_FQDN}"
echo "🌐 Public IP     : ${PUBLIC_IP}"
echo "🔗 WebSocket URL : ws://${PUBLIC_IP}:8787"
echo "📊 Status JSON   : http://${PUBLIC_IP}:8787/status"
echo "--------------------------------------------------------------------"
echo "🔍 Active Web/Server Ports (80 / 443 / 8787):"
ss -tlnp | grep -E ':80 |:443 |:8787 ' || true
echo "===================================================================="
