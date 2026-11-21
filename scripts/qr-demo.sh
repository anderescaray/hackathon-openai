#!/usr/bin/env bash
# roomie · public demo link + QR codes for phones.
#
#   bash scripts/qr-demo.sh            # build, serve on :3200, open a Cloudflare quick tunnel, print QRs
#
# - Serves a production build of THIS laptop on port 3200 (the dev server on 3000/3100 is untouched).
# - Public HTTPS link via a free Cloudflare quick tunnel (no account). Works while this script runs; Ctrl+C stops it.
# - QR images are written to ~/roomie-qr/ (outside the repo):
#     try-swipe.png      → /try            swipe the 5 demo homes (no API key needed)
#     try-interview.png  → /try/interview  voice interview, then the 5 demo homes (needs OPENAI_API_KEY in .env.local)
# - Each phone keeps its own state, so many people can try it at once.
set -euo pipefail

PORT="${PORT:-3200}"
OUT_DIR="${OUT_DIR:-$HOME/roomie-qr}"
BIN_DIR="$HOME/.local/bin"
CLOUDFLARED="$BIN_DIR/cloudflared"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$(mktemp -d)"

cd "$REPO_DIR"
mkdir -p "$OUT_DIR" "$BIN_DIR"

if ! command -v cloudflared >/dev/null 2>&1 && [ ! -x "$CLOUDFLARED" ]; then
  echo "→ Downloading cloudflared to $CLOUDFLARED"
  case "$(uname -m)" in
    x86_64) ARCH=amd64 ;;
    aarch64 | arm64) ARCH=arm64 ;;
    *) echo "Unsupported CPU: $(uname -m)"; exit 1 ;;
  esac
  curl -fsSL -o "$CLOUDFLARED" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$ARCH"
  chmod +x "$CLOUDFLARED"
fi
command -v cloudflared >/dev/null 2>&1 && CLOUDFLARED="$(command -v cloudflared)"

if [ -f .env.local ] && grep -q '^OPENAI_API_KEY=.\+' .env.local; then
  echo "→ OPENAI_API_KEY found in .env.local: the interview QR will work."
else
  echo "→ No OPENAI_API_KEY in .env.local: only the swipe QR will work (the interview will show an error)."
fi

echo "→ Building the app (production)…"
npm run build >"$LOG_DIR/build.log" 2>&1 || { echo "Build failed, see $LOG_DIR/build.log"; exit 1; }

cleanup() {
  echo
  echo "→ Stopping the public link and the server."
  [ -n "${TUNNEL_PID:-}" ] && kill "$TUNNEL_PID" 2>/dev/null || true
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ Starting the app on http://localhost:$PORT"
npx next start -p "$PORT" >"$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$PORT/" && break
  sleep 1
done

echo "→ Opening the public link (Cloudflare quick tunnel)…"
"$CLOUDFLARED" tunnel --no-autoupdate --url "http://localhost:$PORT" >"$LOG_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!
URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done
[ -z "$URL" ] && { echo "Could not open the tunnel, see $LOG_DIR/tunnel.log"; exit 1; }

# Wait until the public link actually answers (DNS for a new quick tunnel can take a few seconds).
for _ in $(seq 1 40); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$URL/try")" = "200" ] && break
  sleep 2
done

npx -y qrcode@1.5.4 -o "$OUT_DIR/try-swipe.png" -w 720 -m 2 "$URL/try" >/dev/null
npx -y qrcode@1.5.4 -o "$OUT_DIR/try-interview.png" -w 720 -m 2 "$URL/try/interview" >/dev/null
printf '%s/try\n%s/try/interview\n' "$URL" "$URL" >"$OUT_DIR/links.txt"

echo
echo "================ roomie is live ================"
echo "Swipe only:        $URL/try"
echo "Interview + swipe: $URL/try/interview"
echo "QR images:         $OUT_DIR/try-swipe.png  ·  $OUT_DIR/try-interview.png"
echo
echo "Swipe QR:"
npx -y qrcode@1.5.4 -t terminal -s 1 "$URL/try" 2>/dev/null || true
echo "Logs: $LOG_DIR · Press Ctrl+C to stop."
wait "$TUNNEL_PID"
