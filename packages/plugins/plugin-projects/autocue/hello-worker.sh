#!/usr/bin/env bash
# Records the Hello Worker pipeline demo (hello-worker.mjs) in three cuts, one take each:
#   light       light mode, no ident, no captions
#   dark        dark mode, no ident, no captions
#   dark-ident  dark mode, DXOS ident and burned-in captions
# Each take is a fresh profile and a fresh agent run, so the three cuts show the same flow, not the same frames.
#
# usage: hello-worker.sh [out-dir] [variant ...]       (default: temp/autocue/hello-worker, all three)
# env:   URL      app to drive (default http://localhost:4173; see the flow's @app line)
#        PORT     driver control port (default 7341)
#        IDENT    --ident value for the ident cut (default: the DXOS ident; `composer` for the Composer logo)
#        UPLOAD   on to publish each cut to the Composer media bucket (default off)
#        TRIM     extra trim-static.mjs flags, e.g. "--duration 60-90"
set -uo pipefail
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
FLOW="$ROOT/packages/plugins/plugin-projects/autocue/hello-worker.mjs"
SCRIPTS="$ROOT/.agents/skills/autocue/scripts"
OUT=$(mkdir -p "${1:-$ROOT/temp/autocue/hello-worker}" && cd "${1:-$ROOT/temp/autocue/hello-worker}" && pwd)
shift $(( $# > 0 ? 1 : 0 ))
[ $# -gt 0 ] || set -- light dark dark-ident
VARIANTS=("$@")
URL=${URL:-http://localhost:4173}
PORT=${PORT:-7341}
UPLOAD=${UPLOAD:-off}

command -v ffmpeg > /dev/null || { echo "a full ffmpeg is required (apt-get install ffmpeg, or FFMPEG_PATH)" >&2; exit 1; }
[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$URL/" || true)" = 200 ] || {
  echo "nothing serves $URL; start the app as hello-worker.mjs's @app line says" >&2
  exit 1
}

DRIVER=
trap '[ -n "$DRIVER" ] && kill "$DRIVER" 2>/dev/null || true' EXIT

# take <variant> <theme> <captions on|off>: records one take into $OUT/take-<variant>.
take() {
  local variant=$1 theme=$2 captions=$3 dir="$OUT/take-$1"
  rm -rf "$dir" && mkdir -p "$dir"
  # A driver left over from an aborted run holds the port, and the take would fail.
  lsof -ti "tcp:$PORT" -sTCP:LISTEN | xargs -r kill || true
  node "$SCRIPTS/driver.mjs" --port "$PORT" --url "$URL" --out "$dir" --theme "$theme" --captions "$captions" \
    --overlay on --ready-timeout 180000 > "$dir/driver.log" 2>&1 &
  DRIVER=$!
  until [ -f "$dir/token" ]; do
    kill -0 "$DRIVER" 2> /dev/null || { echo "driver exited:"; tail -5 "$dir/driver.log"; return 1; }
    sleep 1
  done
  local token
  token=$(cat "$dir/token")
  cmd() { curl -sS -H "x-demo-token: $token" "localhost:$PORT/cmd" -d "$1"; echo; }
  cmd '{"op":"goto"}' | cut -c1-120
  cmd "{\"op\":\"steps\",\"file\":\"$FLOW\"}" > /dev/null
  # No client timeout: the agent's run holds this request for minutes.
  local result
  result=$(cmd '{"op":"run","countdown":false,"pace":0}')
  cmd '{"op":"stop"}' | cut -c1-160
  wait "$DRIVER" 2> /dev/null || true
  DRIVER=
  echo "$result" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for s in d.get('steps', []):
    print('  ', s['step'], 'ok ' if s['ok'] else 'ERR', s['name'], (s.get('error') or '').split(chr(10))[0][:160])
if d.get('error'): print('error:', d['error'][:300])
sys.exit(0 if d.get('ok', True) and all(s['ok'] for s in d.get('steps', [])) else 1)
"
}

# cut <variant> <theme> [ident flags...]: trims the take into $OUT/hello-worker-<variant>.{webm,mp4}.
cut() {
  local variant=$1 theme=$2
  shift 2
  # shellcheck disable=SC2086
  node "$SCRIPTS/trim-static.mjs" --in "$OUT/take-$variant/session.webm" --out "$OUT/hello-worker-$variant.webm" \
    --theme "$theme" --mp4 --upload "$UPLOAD" --name "plugin-projects-hello-worker-$variant" "$@" ${TRIM:-}
}

status=0
for variant in "${VARIANTS[@]}"; do
  echo "== $variant"
  case $variant in
    light) take light light off && cut light light || status=1 ;;
    dark) take dark dark off && cut dark dark || status=1 ;;
    dark-ident)
      if [ -n "${IDENT:-}" ]; then ident=(--ident "$IDENT"); else ident=(--ident); fi
      take dark-ident dark on && cut dark-ident dark "${ident[@]}" || status=1
      ;;
    *) echo "unknown variant: $variant (light, dark, dark-ident)" >&2; status=1 ;;
  esac
done
echo "== cuts in $OUT"
ls -1 "$OUT"/hello-worker-*.{webm,mp4} 2> /dev/null || true
exit $status
