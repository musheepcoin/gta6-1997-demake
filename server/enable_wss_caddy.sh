#!/usr/bin/env bash
# ============================================================================
# Safely enable WSS (TLS WebSocket) via Caddy on port 8443 for srv2162111.hstgr.cloud
# without modifying or breaking whatever already runs on port 80/443!
# ============================================================================
set -e

HOST_FQDN=$(hostname -f 2>/dev/null || echo "srv2162111.hstgr.cloud")
CADDYFILE="/etc/caddy/Caddyfile"

echo "🔍 Checking existing Caddyfile at ${CADDYFILE}..."
if [ -f "${CADDYFILE}" ]; then
    cp "${CADDYFILE}" "${CADDYFILE}.bak_vc26"
    if ! grep -q ":8443" "${CADDYFILE}"; then
        cat <<EOF >> "${CADDYFILE}"

${HOST_FQDN}:8443 {
    reverse_proxy 127.0.0.1:8787
}
EOF
    fi
    if command -v ufw >/dev/null 2>&1; then
        ufw allow 8443/tcp >/dev/null 2>&1 || true
    fi
    caddy validate --config "${CADDYFILE}" && systemctl reload caddy
    echo "===================================================================="
    echo "✅ WSS (HTTPS WebSocket) ENABLED ON PORT 8443!"
    echo "🔒 Secure WebSocket URL : wss://${HOST_FQDN}:8443"
    echo "📊 Secure Status URL    : https://${HOST_FQDN}:8443/status"
    echo "===================================================================="
else
    echo "⚠️ Caddyfile not at /etc/caddy/Caddyfile; searching..."
    ps aux | grep caddy
fi
