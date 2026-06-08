#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// One-shot debug bridge for Composer recovery mode (`/recovery.html`).
//
// Usage:
//   # Browser: open /recovery.html → Open Debug Port (copy session id from log)
//   node composer-recovery.js --session <uuid> 'return dxos.recovery.status()'
//
//   # Persistent REPL (optional):
//   node composer-recovery.js --session <uuid> --interactive

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PORT = 9321;
const PORT = Number(process.env.COMPOSER_RECOVERY_PORT ?? DEFAULT_PORT);
const LONG_POLL_MS = 25_000;
/** Must match `RECOVERY_DEBUG_RECONNECT_MS` in composer-app recovery/constants.ts */
const BROWSER_RECONNECT_MS = 2_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 3 * BROWSER_RECONNECT_MS;
const DEFAULT_RESULT_TIMEOUT_MS = 120_000;
const TLS_DIR = path.join(__dirname, '.recovery-tls');

/** @type {Map<string, Array<{ id: number, code: string }>>} */
const commandQueues = new Map();
/** @type {Array<{ session: string, respond: (body: string | null, status?: number) => void, timer: NodeJS.Timeout }>} */
const waiters = [];
/** @type {Set<string>} */
const connectedSessions = new Set();
/** @type {Map<string, { resolve: () => void, timer: NodeJS.Timeout }>} */
const connectWaiters = new Map();
let nextCommandId = 1;

/** @type {string | undefined} */
let targetSession;
/** @type {((payload: unknown) => void) | undefined} */
let oneShotResolve;

const usage = `Usage:
  node composer-recovery.js --session <uuid> '<js-snippet>'   One-shot: deliver snippet, print result, exit
  node composer-recovery.js --session <uuid> --interactive     Persistent REPL (multiple commands)

  Copy <uuid> from Composer recovery log after clicking Open Debug Port:
    Session: 951c7576-b636-47ff-acc6-a1c4fdf65fb6
    node composer-recovery.js --session 951c7576-b636-47ff-acc6-a1c4fdf65fb6 "<js snippet>"

Environment:
  COMPOSER_RECOVERY_PORT            Port (default ${DEFAULT_PORT})
  COMPOSER_RECOVERY_SESSION         Session id (alternative to --session)
  COMPOSER_RECOVERY_CONNECT_TIMEOUT Ms to wait for browser poll (default ${DEFAULT_CONNECT_TIMEOUT_MS})
  COMPOSER_RECOVERY_TIMEOUT         Ms to wait for eval result (default ${DEFAULT_RESULT_TIMEOUT_MS})
  COMPOSER_RECOVERY_HTTPS=1         Serve over TLS (required when /recovery.html is on HTTPS)
  COMPOSER_RECOVERY_TLS_CERT        PEM cert path (default: scripts/.recovery-tls/cert.pem)
  COMPOSER_RECOVERY_TLS_KEY         PEM key path (default: scripts/.recovery-tls/key.pem)

Workflow (one-shot):
  1. Open /recovery.html → Open Debug Port (copy session id from log)
  2. node composer-recovery.js --session <uuid> 'return dxos.recovery.status()'
  3. Browser runs snippet; result prints to stdout; process exits

HTTPS pages cannot fetch http://127.0.0.1 (mixed content). Use TLS + trusted cert:
  mkcert -install
  mkcert -cert-file scripts/.recovery-tls/cert.pem -key-file scripts/.recovery-tls/key.pem localhost 127.0.0.1
  COMPOSER_RECOVERY_HTTPS=1 node composer-recovery.js --session <uuid> 'return dxos.recovery.status()'

Snippet runs inside an async IIFE with \`dxos\` and \`recovery\` in scope.

  dxos.recovery.status()
  await dxos.recovery.boot()
  await dxos.recovery.compactDocuments()
`;

const parseCliArgs = (argv) => {
  const flags = new Set();
  let session = process.env.COMPOSER_RECOVERY_SESSION;
  const positional = [];

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--session') {
      session = argv[++index];
      continue;
    }
    if (arg.startsWith('-')) {
      flags.add(arg);
      continue;
    }
    positional.push(arg);
  }

  return {
    session,
    interactive: flags.has('--interactive'),
    useHttps: flags.has('--https') || process.env.COMPOSER_RECOVERY_HTTPS === '1',
    snippet: positional.join(' ').trim(),
  };
};

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(usage);
  process.exit(0);
}

const { session, interactive, useHttps, snippet } = parseCliArgs(args);

if (!session) {
  console.error('Missing --session <uuid> (copy from Composer recovery log after Open Debug Port).');
  console.error(usage);
  process.exit(1);
}

targetSession = session;
const oneShot = !!snippet && !interactive;

if (!snippet && !interactive) {
  console.error(usage);
  process.exit(1);
}

const getQueue = (sessionId) => {
  if (!commandQueues.has(sessionId)) {
    commandQueues.set(sessionId, []);
  }
  return commandQueues.get(sessionId);
};

const markSessionConnected = (sessionId) => {
  if (connectedSessions.has(sessionId)) {
    return;
  }
  connectedSessions.add(sessionId);
  const pending = connectWaiters.get(sessionId);
  if (pending) {
    clearTimeout(pending.timer);
    connectWaiters.delete(sessionId);
    pending.resolve();
  }
};

const waitForSessionConnect = (sessionId) => {
  if (connectedSessions.has(sessionId)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeoutMs = Number(process.env.COMPOSER_RECOVERY_CONNECT_TIMEOUT ?? DEFAULT_CONNECT_TIMEOUT_MS);
    const timer = setTimeout(() => {
      connectWaiters.delete(sessionId);
      reject(
        new Error(
          `Browser did not connect for session ${sessionId} within ${timeoutMs}ms ` +
            `(~${Math.ceil(timeoutMs / BROWSER_RECONNECT_MS)} poll intervals). ` +
            'Open /recovery.html → Open Debug Port and pass the session id from the log.',
        ),
      );
    }, timeoutMs);
    connectWaiters.set(sessionId, { resolve, reject, timer });
  });
};

const flushWaitersForSession = (sessionId) => {
  const queue = getQueue(sessionId);
  for (let index = 0; index < waiters.length && queue.length > 0; ) {
    const waiter = waiters[index];
    if (waiter.session !== sessionId) {
      index++;
      continue;
    }
    const command = queue.shift();
    clearTimeout(waiter.timer);
    waiters.splice(index, 1);
    waiter.respond(JSON.stringify(command));
  }
};

const enqueue = (code, sessionId) => {
  const command = { id: nextCommandId++, code };
  getQueue(sessionId).push(command);
  flushWaitersForSession(sessionId);
  console.error(`Queued command #${command.id} for session ${sessionId}`);
  return command;
};

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
    res.end(
      JSON.stringify({
        ok: true,
        connectedSessions: [...connectedSessions],
        queued: Object.fromEntries([...commandQueues.entries()].map(([id, queue]) => [id, queue.length])),
        waiters: waiters.length,
        oneShot,
        targetSession,
      }),
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/poll') {
    const sessionId = url.searchParams.get('session');
    if (!sessionId) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end('Missing session query param');
      return;
    }

    markSessionConnected(sessionId);

    const queue = getQueue(sessionId);
    if (queue.length > 0) {
      const command = queue.shift();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(command));
      console.error(`Delivered command #${command.id} to session ${sessionId}`);
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
      waiters.push({ session: sessionId, respond, timer });
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/result') {
    const raw = await readBody(req);
    try {
      const payload = JSON.parse(raw);
      if (oneShot && targetSession && payload.session !== targetSession) {
        res.writeHead(409, { 'content-type': 'text/plain' });
        res.end(`Result session mismatch (expected ${targetSession}, got ${payload.session})`);
        return;
      }
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
      const sessionId = String(payload.session ?? targetSession ?? '');
      if (!sessionId) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end('Missing session');
        return;
      }
      const command = enqueue(String(payload.code ?? ''), sessionId);
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

const server = useHttps ? https.createServer(ensureTlsMaterial(), requestHandler) : http.createServer(requestHandler);

const scheme = useHttps ? 'https' : 'http';
const origin = `${scheme}://127.0.0.1:${PORT}`;

const shutdown = (code = 0) => {
  server.close(() => process.exit(code));
};

const waitForOneShotResult = () => {
  const timeoutMs = Number(process.env.COMPOSER_RECOVERY_TIMEOUT ?? DEFAULT_RESULT_TIMEOUT_MS);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      oneShotResolve = undefined;
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for command result (session ${targetSession}).`));
    }, timeoutMs);
    oneShotResolve = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
  });
};

const runOneShot = async () => {
  console.error(`One-shot mode — waiting for browser (session ${targetSession})…`);
  try {
    await waitForSessionConnect(targetSession);
    console.error(`Browser connected (session ${targetSession}).`);
    enqueue(snippet, targetSession);
    const payload = await waitForOneShotResult();
    console.log(JSON.stringify(payload, null, 2));
    shutdown(payload && typeof payload === 'object' && payload.ok === false ? 1 : 0);
  } catch (error) {
    console.error(String(error));
    shutdown(1);
  }
};

server.listen(PORT, '127.0.0.1', () => {
  console.error(`Composer recovery debug server listening on ${origin}`);
  if (useHttps) {
    console.error('HTTPS enabled — required when /recovery.html is served over HTTPS.');
  } else if (!oneShot) {
    console.error(
      'HTTP mode — fine for http://localhost dev; use COMPOSER_RECOVERY_HTTPS=1 on production HTTPS origins.',
    );
  }

  if (interactive) {
    void (async () => {
      console.error(`Interactive mode — session ${targetSession}. Paste JS snippets (empty line to exit).`);
      try {
        await waitForSessionConnect(targetSession);
        console.error(`Browser connected (session ${targetSession}).`);
        startInteractive();
      } catch (error) {
        console.error(String(error));
        shutdown(1);
      }
    })();
    return;
  }

  if (oneShot) {
    void runOneShot();
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
      enqueue(code, targetSession);
      prompt();
    });
  };
  prompt();
}

process.on('SIGINT', () => shutdown(130));
