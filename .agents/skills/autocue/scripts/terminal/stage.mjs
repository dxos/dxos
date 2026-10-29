#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * A terminal demo stage for autocue: a real shell behind a pseudo-terminal, streamed to xterm.js in a page the
 * driver records, with a title band above the window and a preview pane that shows each SVG the session writes.
 *
 *   node .agents/skills/autocue/scripts/terminal/stage.mjs --cwd /tmp/demo/work --port 4180 [--init setup.sh]
 *
 * `--init` is sourced by the shell before the first prompt and cleared from the screen: aliases, a working copy of
 * the demo's files, anything the take should start from.
 *
 * The PTY comes from util-linux `script(1)`, so the stage needs no native module. Output streams over
 * server-sent events and keystrokes come back as POSTs, so it needs no WebSocket library either.
 * Loopback only: anything that can reach the port can type into the shell.
 */

import { execFileSync, spawn } from 'node:child_process';
import { readdirSync, readFileSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../../..');

/**
 * `~/demo >` in grey and violet, led by an invisible OSC 777 mark the page counts, so a flow can wait for a
 * command to finish without parsing the screen.
 */
const PROMPT = '\\[\\e]777;prompt\\a\\]\\[\\e[38;5;245m\\]~/demo\\[\\e[0m\\] \\[\\e[38;5;141m\\]>\\[\\e[0m\\] ';

const options = { port: 4180, cwd: process.cwd(), cols: 100, rows: 26, shell: 'bash' };
const argv = process.argv.slice(2);
for (let index = 0; index < argv.length; index += 2) {
  const key = argv[index].replace(/^--/, '');
  options[key] = /^\d+$/.test(argv[index + 1]) ? Number(argv[index + 1]) : argv[index + 1];
}

/** The installed copy of a package under the pnpm store, since the stage runs outside any workspace package. */
const pnpmPackage = (storePrefix, name) => {
  const store = path.join(ROOT, 'node_modules/.pnpm');
  const entry = readdirSync(store).find((dir) => dir.startsWith(storePrefix));
  if (!entry) {
    throw new Error(`${name} is not installed; run pnpm install.`);
  }
  return path.join(store, entry, 'node_modules', name);
};

const ASSETS = {
  '/xterm.js': [path.join(pnpmPackage('@xterm+xterm@', '@xterm/xterm'), 'lib/xterm.js'), 'text/javascript'],
  '/xterm.css': [path.join(pnpmPackage('@xterm+xterm@', '@xterm/xterm'), 'css/xterm.css'), 'text/css'],
  '/mono.woff2': [
    path.join(
      pnpmPackage('@fontsource-variable+jetbrains-mono@', '@fontsource-variable/jetbrains-mono'),
      'files/jetbrains-mono-latin-wght-normal.woff2',
    ),
    'font/woff2',
  ],
  '/sans.woff2': [
    path.join(
      pnpmPackage('@fontsource-variable+inter@', '@fontsource-variable/inter'),
      'files/inter-latin-wght-normal.woff2',
    ),
    'font/woff2',
  ],
  '/': [path.join(HERE, 'stage.html'), 'text/html'],
};

// `script` gives the shell a real tty, so prompts, colours and line editing behave as in a terminal window.
const shell = spawn('script', ['-qfc', `${options.shell} --noprofile --norc -i`, '/dev/null'], {
  cwd: options.cwd,
  env: {
    ...process.env,
    TERM: 'xterm-256color',
    COLUMNS: String(options.cols),
    LINES: String(options.rows),
    // Keeps the take free of bash's own history noise.
    HISTFILE: '/dev/null',
  },
  stdio: ['pipe', 'pipe', 'pipe'],
});
// Sent as input rather than through the environment, which bash ignores for an interactive shell's prompt; the
// `clear` wipes the line before any page sees it.
// `--init` is sourced in the same line, so its setup (and any output) is cleared before the first frame.
const init = options.init ? `source ${JSON.stringify(path.resolve(options.init))}; ` : '';
shell.stdin.write(`stty cols ${options.cols} rows ${options.rows}; ${init}PS1='${PROMPT}'; clear\n`);

/** Sets the shell's window size from outside, as a terminal emulator does, so nothing is typed on camera. */
const resize = (cols, rows) => {
  const shellPid = execFileSync('pgrep', ['-P', String(shell.pid)])
    .toString()
    .trim()
    .split('\n')[0];
  const tty = execFileSync('ps', ['-o', 'tty=', '-p', shellPid]).toString().trim();
  execFileSync('stty', ['-F', `/dev/${tty}`, 'cols', String(cols), 'rows', String(rows)]);
  process.kill(Number(shellPid), 'SIGWINCH');
};

const clients = new Set();
/** Everything printed so far, replayed to a page that connects late (a reload, or the driver's first `goto`). */
let scrollback = '';
const broadcast = (event, data) => {
  for (const response of clients) {
    response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
};
const onOutput = (chunk) => {
  const text = chunk.toString('utf8');
  scrollback = (scrollback + text).slice(-200_000);
  broadcast('output', text);
};
shell.stdout.on('data', onOutput);
shell.stderr.on('data', onOutput);
shell.on('exit', (code) => {
  broadcast('exit', code);
  process.exit(code ?? 0);
});

// The preview follows the newest SVG written in the working directory.
let latest;
const svgs = () =>
  readdirSync(options.cwd)
    .filter((name) => name.endsWith('.svg'))
    .map((name) => ({ name, mtime: statSync(path.join(options.cwd, name)).mtimeMs }));
watch(options.cwd, (_, name) => {
  if (!name?.endsWith('.svg')) {
    return;
  }
  // Writes land in pieces; wait for the file to settle before sending it.
  setTimeout(() => {
    try {
      const svg = readFileSync(path.join(options.cwd, name), 'utf8');
      if (svg.trimEnd().endsWith('</svg>')) {
        latest = { name, svg };
        broadcast('preview', latest);
      }
    } catch {}
  }, 150);
});

const readBody = (request) =>
  new Promise((resolve) => {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => resolve(body));
  });

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/events') {
    response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    response.write(`event: output\ndata: ${JSON.stringify(scrollback)}\n\n`);
    if (latest) {
      response.write(`event: preview\ndata: ${JSON.stringify(latest)}\n\n`);
    }
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }
  if (url.pathname === '/input' && request.method === 'POST') {
    shell.stdin.write(await readBody(request));
    response.end('ok');
    return;
  }
  if (url.pathname === '/resize' && request.method === 'POST') {
    const { cols, rows } = JSON.parse(await readBody(request));
    try {
      resize(cols, rows);
      response.end('ok');
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
    return;
  }
  if (url.pathname === '/files') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(svgs()));
    return;
  }
  const asset = ASSETS[url.pathname];
  if (asset) {
    response.writeHead(200, { 'content-type': asset[1] });
    response.end(readFileSync(asset[0]));
    return;
  }
  response.writeHead(404).end();
}).listen(options.port, '127.0.0.1', () => {
  console.log(`stage on http://localhost:${options.port} (shell in ${options.cwd})`);
});
