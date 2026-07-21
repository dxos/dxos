//
// Copyright 2024 DXOS.org
//

//
// Local collector for the extension's dev diagnostic logging (see `src/debug-log.ts`).
//
// The extension runs across isolated contexts (background worker, side panel, content script) whose
// consoles are awkward to observe together. In dev builds, `debugLog` POSTs structured entries here;
// this server appends each one to `crx-debug.jsonl` and echoes it to stdout, so the extension's
// runtime behaviour can be tailed from a single file while debugging off-device.
//
// Usage:
//   node packages/apps/composer-crx/scripts/debug-log-server.mjs
//   tail -f crx-debug.jsonl
//
// It listens on http://localhost:9999/log. When it is not running, the extension's POSTs fail
// silently, so leaving the diagnostic wired in is harmless.
//

import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';

const PORT = 9999;
const LOG_FILE = new URL('../crx-debug.jsonl', import.meta.url).pathname;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const safeParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const line = JSON.stringify({ received: new Date().toISOString(), payload: safeParse(body) });
      appendFileSync(LOG_FILE, line + '\n');
      process.stdout.write(line + '\n');
      res.writeHead(204, CORS);
      res.end();
    });
    return;
  }

  res.writeHead(404, CORS);
  res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`crx debug-log collector listening on http://localhost:${PORT}/log -> ${LOG_FILE}\n`);
});
