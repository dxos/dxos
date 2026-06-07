#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Local debug server for Composer recovery mode (`/recovery.html`).
//
// Usage:
//   node composer-recovery.js 'return await recovery.exportSqlite()'
//   node composer-recovery.js --interactive
//
// In the browser, open /recovery.html and click "Open Debug Port".

import http from 'node:http';
import { createInterface } from 'node:readline';

const DEFAULT_PORT = 9321;
const PORT = Number(process.env.COMPOSER_RECOVERY_PORT ?? DEFAULT_PORT);
const LONG_POLL_MS = 25_000;

/** @type {Array<{ id: number, code: string }>} */
const commandQueue = [];
/** @type {Array<{ session: string, respond: (body: string | null, status?: number) => void, timer: NodeJS.Timeout }>} */
const waiters = [];
let nextCommandId = 1;

const usage = `Usage:
  node composer-recovery.js '<js-snippet>'
  node composer-recovery.js --interactive

Environment:
  COMPOSER_RECOVERY_PORT   Port (default ${DEFAULT_PORT})

Browser:
  Open /recovery.html → "Open Debug Port"

Snippet runs inside an async IIFE with \`recovery\` in scope:
  recovery.status()
  recovery.exportSqlite()
  recovery.reset()
  recovery.log('hello')
`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(usage);
  process.exit(0);
}

const interactive = args.includes('--interactive');
const initialSnippet = args.filter((arg) => !arg.startsWith('-')).join(' ').trim();

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

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, queued: commandQueue.length, waiters: waiters.length }));
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
      console.log(JSON.stringify(payload, null, 2));
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    } catch (error) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end(String(error));
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/enqueue') {
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
});

server.listen(PORT, '127.0.0.1', () => {
  console.error(`Composer recovery debug server listening on http://127.0.0.1:${PORT}`);
  console.error('Open /recovery.html in Composer and click "Open Debug Port".');
  if (interactive) {
    startInteractive();
  }
});

function startInteractive() {
  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
  console.error('Interactive mode — paste JS snippets (empty line to exit).');
  const prompt = () => {
    rl.question('> ', (line) => {
      const code = line.trim();
      if (!code) {
        rl.close();
        server.close();
        process.exit(0);
        return;
      }
      enqueue(code);
      prompt();
    });
  };
  prompt();
}

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
