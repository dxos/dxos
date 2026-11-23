#
# Copyright 2026 DXOS.org
#

# Static server for the scene, with caching off so every reload picks up edited modules.
# Usage: python3 serve.py [port]

import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


http.server.ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 7420), NoCacheHandler).serve_forever()
