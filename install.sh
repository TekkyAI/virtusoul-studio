#!/usr/bin/env bash
set -e

main() {

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║    VirtuSoul Studio Installer     ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"

# ── Install system dependencies ──────────────────────────

if ! command -v git &>/dev/null; then
  echo -e "${YELLOW}Git not found. Installing...${NC}"
  sudo apt-get update -qq </dev/null && sudo apt-get install -y -qq git </dev/null
fi

if ! command -v node &>/dev/null; then
  echo -e "${YELLOW}Node.js not found. Installing v22 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource.sh
  sudo -E bash /tmp/nodesource.sh </dev/null
  sudo apt-get install -y nodejs </dev/null
  rm -f /tmp/nodesource.sh
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo -e "${RED}Node.js 20+ required (found v${NODE_VER}).${NC}"
  exit 1
fi

if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}Docker not found. Installing...${NC}"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh </dev/null
  rm -f /tmp/get-docker.sh
  sudo usermod -aG docker "$USER" 2>/dev/null || true
  echo -e "${GREEN}✓ Docker installed${NC}"
fi

# Verify docker works
DOCKER=""
if docker info &>/dev/null 2>&1; then
  DOCKER="docker"
elif sudo docker info &>/dev/null 2>&1; then
  DOCKER="sudo docker"
else
  echo -e "${RED}Docker installed but not accessible. Try logging out and back in, then re-run.${NC}"
  exit 1
fi

# ── Install OpenClaw ─────────────────────────────────────

if ! command -v openclaw &>/dev/null; then
  echo -e "${YELLOW}OpenClaw not found. Installing...${NC}"
  curl -fsSL https://openclaw.ai/install.sh -o /tmp/install-openclaw.sh
  bash /tmp/install-openclaw.sh --no-onboard </dev/null
  rm -f /tmp/install-openclaw.sh
  # Add to PATH for this session
  export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"
  if ! command -v openclaw &>/dev/null; then
    echo -e "${RED}OpenClaw install failed. Install manually: https://github.com/openclaw/openclaw${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ OpenClaw installed${NC}"

  # Set up gateway with sensible defaults
  echo -e "${CYAN}Setting up OpenClaw Gateway...${NC}"
  openclaw gateway setup --auth-choice skip --gateway-bind loopback 2>/dev/null || true
  openclaw gateway start 2>/dev/null &
  sleep 2
  echo -e "${GREEN}✓ Gateway running${NC}"
fi

echo -e "${GREEN}✓ Prerequisites OK${NC} (OpenClaw $(openclaw --version 2>&1 | grep -oP '[\d.]+[-\d]*' | head -1), Node $(node -v), Docker $($DOCKER --version 2>/dev/null | cut -d' ' -f3 | tr -d ','))"
echo ""

# ── Clone Studio ─────────────────────────────────────────

INSTALL_DIR="${STUDIO_DIR:-$HOME/virtusoul-studio}"

if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}Directory $INSTALL_DIR already exists. Updating...${NC}"
  cd "$INSTALL_DIR" && git pull --ff-only 2>/dev/null || true
else
  echo -e "${CYAN}Cloning VirtuSoul Studio...${NC}"
  git clone --depth 1 https://github.com/TekkyAI/virtusoul-studio.git "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

# ── Configure .env ───────────────────────────────────────

if [ ! -f .env ]; then
  cp .env.example .env

  GW_TOKEN=$(openclaw config get gateway.auth.token 2>/dev/null || true)
  if [ -n "$GW_TOKEN" ]; then
    sed -i "s|GATEWAY_AUTH_TOKEN=.*|GATEWAY_AUTH_TOKEN=$GW_TOKEN|" .env
    echo -e "${GREEN}✓ Gateway token auto-detected${NC}"
  else
    echo -e "${YELLOW}⚠ Set GATEWAY_AUTH_TOKEN in .env manually${NC}"
  fi

  SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -d '/+=' | head -c 64)
  sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" .env
else
  echo -e "${GREEN}✓ .env already exists, keeping it${NC}"
fi

# ── Set password ─────────────────────────────────────────

echo ""
echo -e "${CYAN}Set your admin password:${NC}"
while true; do
  read -s -p "Password (min 6 chars): " ADMIN_PASS </dev/tty
  echo
  if [ ${#ADMIN_PASS} -lt 6 ]; then
    echo -e "${RED}Too short. Try again.${NC}"
    continue
  fi
  read -s -p "Confirm: " ADMIN_PASS2 </dev/tty
  echo
  if [ "$ADMIN_PASS" != "$ADMIN_PASS2" ]; then
    echo -e "${RED}Passwords don't match. Try again.${NC}"
    continue
  fi
  break
done

# ── Start services ───────────────────────────────────────

echo ""
echo -e "${CYAN}Starting PostgreSQL...${NC}"
$DOCKER compose up -d db 2>&1 | tail -2

echo -e "${CYAN}Waiting for PostgreSQL...${NC}"
for i in $(seq 1 15); do
  if $DOCKER compose exec -T db pg_isready -U studio &>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL ready${NC}"
    break
  fi
  sleep 2
done

echo -e "${CYAN}Installing dependencies...${NC}"
npm install --silent 2>&1 | tail -1

echo -e "${CYAN}Running database migrations...${NC}"
npx drizzle-kit migrate 2>&1 || echo -e "${YELLOW}⚠ Migration will run on first start${NC}"

echo ""
echo -e "${CYAN}Building and starting Studio...${NC}"
$DOCKER compose up -d --build 2>&1 | tail -2
sleep 2
$DOCKER compose exec -T app npx drizzle-kit migrate 2>/dev/null || true

# Set the password via API
sleep 2
for i in $(seq 1 10); do
  RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5181/api/auth/setup/password \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"$ADMIN_PASS\"}" 2>/dev/null)
  if [ "$RESULT" = "200" ]; then
    curl -s -X POST http://localhost:5181/api/auth/setup/complete >/dev/null 2>&1
    echo -e "${GREEN}✓ Password set${NC}"
    break
  fi
  sleep 2
done

# ── Done ─────────────────────────────────────────────────

IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   VirtuSoul Studio is ready!                 ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}║   ${CYAN}http://${IP}:5181${GREEN}                    ║${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}║   Login with your admin password.             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Directory: ${INSTALL_DIR}"
echo -e "  Logs:      cd ${INSTALL_DIR} && docker compose logs -f"
echo -e "  Stop:      cd ${INSTALL_DIR} && docker compose down"
echo ""

}
main "$@"
