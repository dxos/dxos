#!/usr/bin/env python3
"""Hand one allowlisted secret from the repo-root `.env` to a local browser page, once.

Why this exists: an agent driving the local Composer instance needs to put an API key into
the page (e.g. the HeyGen connector's `AccessToken`). Passing it as a literal in a
`browser_evaluate` call would write the secret permanently into the session transcript. This
lets the *browser* fetch the value directly over loopback instead, so it never enters the
agent's context.

Deliberately narrow, because a permission rule that names this path inherits whatever this
file does:
  - reads only `<repo-root>/.env`, never a path supplied by the caller;
  - serves only a variable named in ALLOWED below;
  - binds 127.0.0.1 only;
  - the URL carries a random single-use token;
  - exits after the first successful read, or after TIMEOUT seconds.

Usage (from the repo root):  python3 .claude/scripts/keyserve.py HEYGEN_API_KEY 8901
Prints the fetch URL on stdout. Never prints the value.
"""

import http.server
import json
import os
import re
import secrets
import sys
import threading

ALLOWED = {'HEYGEN_API_KEY', 'IDEOGRAM_API_KEY'}
TIMEOUT = 180

def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__); return 2
    var, port = sys.argv[1], int(sys.argv[2])
    if var not in ALLOWED:
        print(f'refused: {var} is not in the allowlist {sorted(ALLOWED)}'); return 2

    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env = os.path.join(root, '.env')
    value = None
    try:
        with open(env) as handle:
            for line in handle:
                match = re.match(r'^\s*(?:export\s+)?' + re.escape(var) + r'\s*=(.*)$', line)
                if match:
                    value = match.group(1).strip().strip('"').strip("'")
                    break
    except FileNotFoundError:
        print(f'no .env at {env} — run: op inject -i .env.tpl -o .env'); return 1
    if not value:
        print(f'{var} not set in .env'); return 1

    token = secrets.token_urlsafe(16)
    served = threading.Event()

    class Handler(http.server.BaseHTTPRequestHandler):
        def _cors(self) -> None:
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', '*')

        def do_OPTIONS(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler contract.
            self.send_response(204); self._cors(); self.end_headers()

        def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler contract.
            if self.path != '/' + token:
                self.send_response(404); self._cors(); self.end_headers(); return
            body = json.dumps({'value': value}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self._cors(); self.end_headers()
            self.wfile.write(body); served.set()

        def log_message(self, *args) -> None:  # Silence: the URL carries the token.
            pass

    server = http.server.HTTPServer(('127.0.0.1', port), Handler)
    print(f'http://127.0.0.1:{port}/{token}', flush=True)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    served.wait(timeout=TIMEOUT)
    server.shutdown()
    print('served' if served.is_set() else 'timeout', flush=True)
    return 0 if served.is_set() else 1

if __name__ == '__main__':
    sys.exit(main())
