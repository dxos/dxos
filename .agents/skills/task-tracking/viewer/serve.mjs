#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Minimal live viewer for a TASKS.md file. Serves a self-contained page that
// polls the markdown and re-renders on change. Read-only, bound to loopback —
// intended to be opened in the Claude Code preview (Browser) pane.
//
// Usage: node serve.mjs [path/to/TASKS.md] [--port 8787]
// Defaults: ./TASKS.md in the current directory, port 8787.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const port = portFlag !== -1 ? Number(args[portFlag + 1]) : 8787;
const positional = args.filter((arg, index) => !arg.startsWith('--') && index !== portFlag + 1);
const mdPath = resolve(positional[0] ?? 'TASKS.md');
const here = dirname(fileURLToPath(import.meta.url));

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/' || req.url === '/index.html') {
      const html = await readFile(join(here, 'viewer.html'), 'utf8');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    } else if (req.url === '/tasks.md') {
      // Read fresh every request so the client always polls current state.
      const md = await readFile(mdPath, 'utf8').catch(() => '# TASKS.md not found\n');
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end(md);
    } else {
      res.writeHead(404).end('not found');
    }
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(String(err));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`TASKS.md viewer → http://127.0.0.1:${port}/  (watching ${mdPath})`);
});
