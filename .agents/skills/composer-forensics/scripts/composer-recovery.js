#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// One-shot debug bridge for Composer recovery mode (`/recovery.html`).
//
// Usage:
//   # Browser: open /recovery.html → Open Debug Port (keeps polling)
//   node composer-recovery.js 'return dxos.recovery.status()'
//
//   # Persistent REPL (optional):
//   node composer-recovery.js --interactive
//
// In the browser, open /recovery.html and click "Open Debug Port".

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PORT = 9321;
const PORT = Number(process.env.COMPOSER_RECOVERY_PORT ?? DEFAULT_PORT);
const LONG_POLL_MS = 25_000;
const DEFAULT_TIMEOUT_MS = 120_000;
const TLS_DIR = path.join(__dirname, '.recovery-tls');

/** @type {Array<{ id: number, code: string }>} */
const commandQueue = [];
/** @type {Array<{ session: string, respond: (body: string | null, status?: number) => void, timer: NodeJS.Timeout }>} */
const waiters = [];
let nextCommandId = 1;

/** @type {((payload: unknown) => void) | undefined} */
let oneShotResolve;

const usage = `Usage:
  node composer-recovery.js '<js-snippet>'     One-shot: deliver snippet, print result, exit
  node composer-recovery.js --interactive      Persistent REPL (multiple commands)

Environment:
  COMPOSER_RECOVERY_PORT       Port (default ${DEFAULT_PORT})
  COMPOSER_RECOVERY_TIMEOUT    One-shot wait for browser (ms, default ${DEFAULT_TIMEOUT_MS})
  COMPOSER_RECOVERY_HTTPS=1    Serve over TLS (required when /recovery.html is on HTTPS)
  COMPOSER_RECOVERY_TLS_CERT   PEM cert path (default: scripts/.recovery-tls/cert.pem)
  COMPOSER_RECOVERY_TLS_KEY    PEM key path (default: scripts/.recovery-tls/key.pem)

Workflow (one-shot — no persistent server):
  1. Open /recovery.html → "Open Debug Port" (browser retries until server appears)
  2. node composer-recovery.js 'return dxos.recovery.status()'
  3. Browser runs snippet; result prints to stdout; process exits

HTTPS pages cannot fetch http://127.0.0.1 (mixed content). Use TLS + trusted cert:
  mkcert -install
  mkcert -cert-file scripts/.recovery-tls/cert.pem -key-file scripts/.recovery-tls/key.pem localhost 127.0.0.1
  COMPOSER_RECOVERY_HTTPS=1 node composer-recovery.js 'return dxos.recovery.status()'

Snippet runs inside an async IIFE with \`dxos\` and \`recovery\` in scope.
Static \`dxos.Filter\`, \`dxos.Obj\`, etc. are available before boot; \`dxos.client\` after Boot.

  dxos.recovery.status()
  await dxos.recovery.boot()
  await dxos.recovery.exportSqlite()
  await dxos.recovery.compactDocuments()
  dxos.spaces?.()
`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(usage);
  process.exit(0);
}

const interactive = args.includes('--interactive');
const useHttps = args.includes('--https') || process.env.COMPOSER_RECOVERY_HTTPS === '1';
const initialSnippet = args.filter((arg) => !arg.startsWith('-')).join(' ').trim();
const oneShot = !!initialSnippet && !interactive;

if (initialSnippet) {
  enqueue(initialSnippet);
}

if (!initialSnippet && !interactive) {
  console.error(usage);
  process.exit(1);
}

function enqueue(code) {
  const command = { id: nextCommandId++, code };
  commandQueue.push(command);
  flushWaiters();
  console.error(`Queued command #${command.id}`);
  return command;
}

function flushWaiters() {
  while (commandQueue.length > 0 && waiters.length > 0) {
    const command = commandQueue.shift();
    const waiter = waiters.shift();
    clearTimeout(waiter.timer);
    waiter.respond(JSON.stringify(command));
  }
}

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const finishOneShot = (payload) => {
  if (!oneShotResolve) {
    return;
  }
  const resolve = oneShotResolve;
  oneShotResolve = undefined;
  resolve(payload);
};

const requestHandler = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, queued: commandQueue.length, waiters: waiters.length, oneShot }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/poll') {
    const session = url.searchParams.get('session') ?? 'anonymous';
    if (commandQueue.length > 0) {
      const command = commandQueue.shift();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(command));
      console.error(`Delivered command #${command.id} to session ${session}`);
      return;
    }

    await new Promise((resolve) => {
      const respond = (body, status = 200) => {
        res.writeHead(status, body ? { 'content-type': 'application/json' } : undefined);
        res.end(body ?? '');
        resolve();
      };
      const timer = setTimeout(() => {
        const index = waiters.findIndex((waiter) => waiter.respond === respond);
        if (index >= 0) {
          waiters.splice(index, 1);
        }
        respond(null, 204);
      }, LONG_POLL_MS);
      waiters.push({ session, respond, timer });
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/result') {
    const raw = await readBody(req);
    try {
      const payload = JSON.parse(raw);
      if (oneShot) {
        finishOneShot(payload);
      } else {
        console.log(JSON.stringify(payload, null, 2));
      }
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    } catch (error) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end(String(error));
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/enqueue') {
    if (oneShot) {
      res.writeHead(409, { 'content-type': 'text/plain' });
      res.end('One-shot mode — use CLI snippet or --interactive');
      return;
    }
    const raw = await readBody(req);
    try {
      const payload = JSON.parse(raw);
      const command = enqueue(String(payload.code ?? ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(command));
    } catch (error) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end(String(error));
    }
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
};

const ensureTlsMaterial = () => {
  const certPath = process.env.COMPOSER_RECOVERY_TLS_CERT ?? path.join(TLS_DIR, 'cert.pem');
  const keyPath = process.env.COMPOSER_RECOVERY_TLS_KEY ?? path.join(TLS_DIR, 'key.pem');

  if (!existsSync(certPath) || !existsSync(keyPath)) {
    mkdirSync(TLS_DIR, { recursive: true });
    console.error(`Generating self-signed TLS cert in ${TLS_DIR} (trust with mkcert for HTTPS pages).`);
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '825',
        '-subj',
        '/CN=localhost',
      ],
      { stdio: 'inherit' },
    );
  }

  return {
    cert: readFileSync(certPath),
    key: readFileSync(keyPath),
    certPath,
    keyPath,
  };
};

const server = useHttps
  ? https.createServer(ensureTlsMaterial(), requestHandler)
  : http.createServer(requestHandler);

const scheme = useHttps ? 'https' : 'http';
const origin = `${scheme}://127.0.0.1:${PORT}`;

const shutdown = (code = 0) => {
  server.close(() => process.exit(code));
};

const waitForOneShotResult = () => {
  const timeoutMs = Number(process.env.COMPOSER_RECOVERY_TIMEOUT ?? DEFAULT_TIMEOUT_MS);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      oneShotResolve = undefined;
      reject(
        new Error(
          `Timed out after ${timeoutMs}ms waiting for browser (open /recovery.html → Open Debug Port first).`,
        ),
      );
    }, timeoutMs);
    oneShotResolve = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
  });
};

server.listen(PORT, '127.0.0.1', () => {
  console.error(`Composer recovery debug server listening on ${origin}`);
  if (useHttps) {
    console.error('HTTPS enabled — required when /recovery.html is served over HTTPS.');
  } else if (!oneShot) {
    console.error('HTTP mode — fine for http://localhost dev; use COMPOSER_RECOVERY_HTTPS=1 on production HTTPS origins.');
  }

  if (interactive) {
    console.error('Interactive mode — paste JS snippets (empty line to exit).');
    startInteractive();
    return;
  }

  if (oneShot) {
    console.error('One-shot mode — waiting for browser…');
    waitForOneShotResult()
      .then((payload) => {
        console.log(JSON.stringify(payload, null, 2));
        shutdown(payload && typeof payload === 'object' && payload.ok === false ? 1 : 0);
      })
      .catch((error) => {
        console.error(String(error));
        shutdown(1);
      });
  }
});

function startInteractive() {
  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
  const prompt = () => {
    rl.question('> ', (line) => {
      const code = line.trim();
      if (!code) {
        rl.close();
        shutdown(0);
        return;
      }
      enqueue(code);
      prompt();
    });
  };
  prompt();
}

process.on('SIGINT', () => shutdown(130));
