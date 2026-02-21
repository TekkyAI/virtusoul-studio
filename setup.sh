#!/usr/bin/env bash
set -e

echo "🔧 VirtuSoul OpenClaw Studio — Setup"
echo ""

# Check for OpenClaw config
OC_CONFIG="$HOME/.openclaw/openclaw.json"
GW_TOKEN=""
GW_PORT="18789"

if [ -f "$OC_CONFIG" ]; then
  echo "✓ Found OpenClaw config at $OC_CONFIG"
  GW_TOKEN=$(python3 -c "import json; c=json.load(open('$OC_CONFIG')); print(c.get('gateway',{}).get('auth',{}).get('token',''))" 2>/dev/null || true)
  GW_PORT=$(python3 -c "import json; c=json.load(open('$OC_CONFIG')); print(c.get('gateway',{}).get('port',18789))" 2>/dev/null || echo "18789")

  if [ -n "$GW_TOKEN" ]; then
    echo "✓ Auto-detected gateway auth token"
    echo "✓ Gateway port: $GW_PORT"
  else
    echo "⚠ Could not read gateway token — you'll need to set GATEWAY_AUTH_TOKEN manually in .env"
  fi

  # Apply recommended memory settings if not already configured
  HAS_MEMORY_FLUSH=$(python3 -c "import json; c=json.load(open('$OC_CONFIG')); print(c.get('agents',{}).get('defaults',{}).get('compaction',{}).get('memoryFlush',{}).get('enabled',False))" 2>/dev/null || echo "False")
  if [ "$HAS_MEMORY_FLUSH" != "True" ]; then
    echo ""
    echo "📝 Applying recommended memory settings (memory flush, hybrid search, context pruning, session indexing)..."
    python3 -c "
import json
with open('$OC_CONFIG') as f:
    c = json.load(f)
d = c.setdefault('agents', {}).setdefault('defaults', {})
d['compaction'] = {**d.get('compaction', {}), 'reserveTokensFloor': 20000, 'memoryFlush': {'enabled': True, 'softThresholdTokens': 40000, 'systemPrompt': 'Session nearing compaction. Store durable memories now.', 'prompt': 'Write any lasting notes to memory/YYYY-MM-DD.md — focus on decisions, state changes, lessons, and blockers. Reply with NO_REPLY if nothing to store.'}}
d['contextPruning'] = d.get('contextPruning') or {'mode': 'cache-ttl', 'ttl': '6h', 'keepLastAssistants': 3}
ms = d.setdefault('memorySearch', {})
ms.setdefault('query', {})['hybrid'] = {'enabled': True, 'vectorWeight': 0.7, 'textWeight': 0.3}
ms['experimental'] = ms.get('experimental', {}); ms['experimental']['sessionMemory'] = True
ms['sources'] = list(set(ms.get('sources', []) + ['memory', 'sessions']))
with open('$OC_CONFIG', 'w') as f:
    json.dump(c, f, indent=2); f.write('\n')
" 2>/dev/null && echo "✓ Memory settings applied" || echo "⚠ Could not apply memory settings — you can configure them in the Studio GUI"
  else
    echo "✓ Memory settings already configured"
  fi
else
  echo "⚠ No OpenClaw config found at $OC_CONFIG"
  echo "  Make sure OpenClaw Gateway is installed and has been run at least once."
  echo "  You'll need to set GATEWAY_AUTH_TOKEN manually in .env"
fi

# Generate session secret
SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

# Prompt for admin password
echo ""
read -sp "Set admin password (default: changeme): " ADMIN_PW
echo ""
ADMIN_PW=${ADMIN_PW:-changeme}

# Create .env
cat > .env <<EOF
# Database
DATABASE_URL=postgresql://studio:studio@localhost:5432/openclaw_studio

# Auth
ADMIN_PASSWORD=$ADMIN_PW
SESSION_SECRET=$SESSION_SECRET

# OpenClaw Gateway
GATEWAY_URL=ws://localhost:$GW_PORT
GATEWAY_AUTH_TOKEN=$GW_TOKEN

# Server
API_PORT=5181
EOF

echo ""
echo "✓ Created .env"
echo ""
echo "Next steps:"
echo "  1. Start PostgreSQL:  docker compose up -d db"
echo "  2. Install deps:      npm install"
echo "  3. Run migrations:    npm run db:migrate"
echo "  4. Start dev server:  npm run dev"
echo ""
echo "Open http://localhost:5173 and login with your admin password."
