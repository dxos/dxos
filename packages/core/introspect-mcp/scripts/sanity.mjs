#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// End-to-end sanity test for the full Inspector flow:
//   1. Spawn the Inspector launcher (same one users invoke)
//   2. Wait for the printed URL containing MCP_PROXY_AUTH_TOKEN
//   3. Authenticate against the proxy with that token
//   4. Confirm the proxy is accepting requests
//   5. Kill everything, report
//
// Exits 0 if the entire flow works; non-zero with diagnostics otherwise.
// Run from any cwd:
//   node packages/core/introspect-mcp/scripts/sanity.mjs

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const launcher = resolve(here, 'inspect.mjs');

const STARTUP_TIMEOUT_MS = 60_000;
const HTTP_TIMEOUT_MS = 5_000;

const checkpoint = (msg) => console.log(`✓ ${msg}`);
const failure = (msg, detail) => {
  console.error(`✗ ${msg}`);
  if (detail) {
    console.error(detail);
  }
  process.exit(1);
};

const child = spawn('node', [launcher], { stdio: ['ignore', 'pipe', 'pipe'] });
let buf = '';
child.stdout.on('data', (chunk) => {
  buf += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  buf += chunk.toString();
});

child.on('error', (err) => failure('failed to spawn launcher', err.message));

const cleanup = () => {
  try {
    child.kill('SIGINT');
  } catch {
    // best effort
  }
};
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

const waitForUrl = () =>
  new Promise((resolveUrl, rejectUrl) => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const match = buf.match(/http:\/\/localhost:\d+\/\?MCP_PROXY_AUTH_TOKEN=[a-f0-9]+/);
      if (match) {
        clearInterval(interval);
        resolveUrl(match[0]);
        return;
      }
      if (Date.now() - startedAt > STARTUP_TIMEOUT_MS) {
        clearInterval(interval);
        rejectUrl(new Error(`timed out after ${STARTUP_TIMEOUT_MS}ms — Inspector never printed a URL`));
      }
    }, 200);
  });

try {
  const url = await waitForUrl();
  checkpoint(`launcher printed Inspector URL`);

  const tokenMatch = url.match(/MCP_PROXY_AUTH_TOKEN=([a-f0-9]+)/);
  if (!tokenMatch) {
    failure('URL missing MCP_PROXY_AUTH_TOKEN query param', url);
  }
  const token = tokenMatch[1];
  checkpoint(`auth token extracted (${token.slice(0, 8)}…)`);

  const portMatch = url.match(/localhost:(\d+)/);
  if (!portMatch) {
    failure('URL missing port', url);
  }
  const uiPort = Number(portMatch[1]);
  // Inspector default proxy port is 6277 (UI default 6274).
  const proxyPort = uiPort - 3 === 6274 ? 6277 : 6277;
  checkpoint(`UI listening on :${uiPort}, proxy expected on :${proxyPort}`);

  // Probe the proxy's /config endpoint with the auth header — same path the
  // browser hits before opening the WebSocket. 200 = proxy is up and the
  // token is correct.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`http://localhost:${proxyPort}/config`, {
      headers: { 'X-MCP-Proxy-Auth': `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch (err) {
    failure(`proxy fetch failed`, String(err));
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    failure(`proxy returned ${res.status} ${res.statusText}`, body.slice(0, 500));
  }
  checkpoint(`proxy /config returned ${res.status}`);

  // Verify the JSON shape — minimal proof the proxy is correctly configured.
  const cfg = await res.json().catch(() => null);
  if (!cfg) {
    failure(`proxy /config did not return JSON`);
  }
  checkpoint(`proxy /config responded with valid JSON`);

  console.log('\n✅ Inspector + proxy authentication works end-to-end.');
  cleanup();
  process.exit(0);
} catch (err) {
  failure('sanity test failed', String(err) + '\n--- captured launcher output ---\n' + buf.slice(-2000));
}
