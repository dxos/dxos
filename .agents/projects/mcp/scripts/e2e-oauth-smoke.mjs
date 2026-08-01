#!/usr/bin/env node
//
// E2E smoke (Path A / OAuth stub): MCP createObject(document) → appears in Composer.
//
// Prereqs (see ../TESTING.md): edge stack up (START_MCP=1 DX_PARALLEL_WRANGLER_DEV=1
// moon run edge:dev) and Composer served at --app pointing at the local edge. The identity's
// agent must be registered (reload Composer once) or pass --halo-space.
//
// Usage:
//   node e2e-oauth-smoke.mjs --identity <hex> --space <spaceId> [--halo-space <id>]
//     [--url http://localhost:8791] [--app http://localhost:5173] [--headless]
//
// Asserts: the created document's title is visible in the Composer navtree within the timeout.
// Exit 0 on success; 1 with a FAIL line on any step.
//

import { createHash, randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    'url': { type: 'string', default: 'http://localhost:8791' },
    'app': { type: 'string', default: 'http://localhost:5173' },
    'identity': { type: 'string' },
    'space': { type: 'string' },
    'halo-space': { type: 'string' },
    'headless': { type: 'boolean', default: true },
    'timeout': { type: 'string', default: '30000' },
  },
});

// With --identity/--space: assert-only against an existing profile's space (needs that profile's
// browser, so headed use only). Without: fully self-contained — boot a fresh browser profile,
// let onboarding auto-create its identity, harvest key+space from the edge dev log, and assert in
// the SAME context (a fresh context cannot see another identity's space).

const fail = (step, detail) => {
  console.error(`FAIL [${step}]`, detail);
  process.exit(1);
};
const step = (name) => console.log(`--- ${name}`);

const baseUrl = args.url.replace(/\/$/, '');
const redirectUri = 'http://localhost:3000/callback';
const EDGE_LOG = process.env.EDGE_DEV_LOG ?? `${process.env.HOME}/Code/dxos/edge/packages/services/edge/edge-dev.log`;

const { chromium } = await import('@playwright/test');
const { readFileSync } = await import('node:fs');
const browser = await chromium.launch({ headless: args.headless });
const page = await (await browser.newContext()).newPage();

if (!args.identity || !args.space) {
  step('bootstrap browser identity');
  const logHead = readFileSync(EDGE_LOG, 'utf8');
  const logMark = logHead.length;
  const preexistingSpaces = new Set([...logHead.matchAll(/spaceId\\?":\\?"(B[A-Z2-7]{32})/g)].map((m) => m[1]));
  await page.goto(args.app);
  // Onboarding auto-creates the identity and registers the agent; wait for the shell.
  await page.getByText('Personal Space', { exact: false }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(8000);
  const tail = readFileSync(EDGE_LOG, 'utf8').slice(logMark);
  const keys = [...tail.matchAll(/identityKey\\?":\\?"(04[0-9a-f]{128})/g)].map((m) => m[1]);
  args.identity = keys.at(-1) ?? fail('bootstrap', 'no identityKey in edge log');
  // Only spaces first seen after boot belong to the fresh identity — the user's own browser may
  // still be replicating its (busier) spaces into the same log.
  const spaces = [...tail.matchAll(/spaceId\\?":\\?"(B[A-Z2-7]{32})/g)]
    .map((m) => m[1])
    .filter((id) => !preexistingSpaces.has(id));
  const counts = spaces.reduce((acc, id) => ((acc[id] = (acc[id] ?? 0) + 1), acc), {});
  args.space =
    Object.entries(counts).toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? fail('bootstrap', 'no spaceId in edge log');
  const quiet = Object.entries(counts).toSorted((a, b) => a[1] - b[1])[0]?.[0];
  if (quiet && quiet !== args.space) args['halo-space'] = quiet;
  console.log('bootstrapped identity', args.identity.slice(0, 8), 'space', args.space);
}

// 1. OAuth (dynamic registration → PKCE authorize form → token).
step('oauth');
const reg = await (
  await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'e2e-oauth-smoke',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
    }),
  })
).json();
const codeVerifier = randomBytes(32).toString('base64url');
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
const authorizeUrl = new URL(`${baseUrl}/authorize`);
authorizeUrl.searchParams.set('client_id', reg.client_id);
authorizeUrl.searchParams.set('redirect_uri', redirectUri);
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('code_challenge', codeChallenge);
authorizeUrl.searchParams.set('code_challenge_method', 'S256');
const formHtml = await (await fetch(authorizeUrl)).text();
const nonce = formHtml.match(/name="nonce"\s+value="([^"]+)"/)?.[1] ?? fail('authorize form', formHtml.slice(0, 300));
const submitBody = new URLSearchParams({ nonce, identity_key: args.identity, space_ids: args.space });
if (args['halo-space']) submitBody.set('halo_space_id', args['halo-space']);
const submit = await fetch(`${baseUrl}/authorize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: submitBody.toString(),
  redirect: 'manual',
});
const location =
  submit.headers.get('location') ??
  fail('authorize submit', `${submit.status}: ${(await submit.text()).slice(0, 300)}`);
const code = new URL(location).searchParams.get('code');
const token = await (
  await fetch(`${baseUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: reg.client_id,
      client_secret: reg.client_secret,
      code_verifier: codeVerifier,
    }),
  })
).json();
if (!token.access_token) fail('token', JSON.stringify(token).slice(0, 300));

const mcp = async (method, params, id) => {
  const resp = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json, text/event-stream',
      'authorization': `Bearer ${token.access_token}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const text = await resp.text();
  return text.includes('data: ') ? JSON.parse(text.split('data: ')[1].split('\n')[0]) : JSON.parse(text);
};

// 2. MCP: initialize + createObject (markdown document via generic CRUD).
step('mcp createObject');
await mcp(
  'initialize',
  { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'e2e', version: '0' } },
  1,
);
const title = `E2E Smoke ${new Date().toISOString()}`;
// A document is an object whose content is a Text ref; create via the markdown operation shape:
// typename org.dxos.type.document requires an owned Text — the operation-service objectCreate
// handles plain property bags, so create the Text first, then the document referencing it.
const text = await mcp(
  'tools/call',
  {
    name: 'createObject',
    arguments: {
      spaceId: args.space,
      typename: 'org.dxos.type.text',
      properties: { content: `# ${title}\n\nCreated by e2e-oauth-smoke.` },
    },
  },
  2,
);
const textObj = text.result?.structuredContent?.object ?? fail('create text', JSON.stringify(text).slice(0, 400));
const doc = await mcp(
  'tools/call',
  {
    name: 'createObject',
    arguments: {
      spaceId: args.space,
      typename: 'org.dxos.type.document',
      properties: { name: title, content: { '/': textObj['@uri'] ?? `echo:///${textObj.id}` } },
    },
  },
  3,
);
const docObj = doc.result?.structuredContent?.object ?? fail('create document', JSON.stringify(doc).slice(0, 400));
console.log('created:', docObj['@uri'] ?? docObj.id);

// 2b. Attach to the space's root collection — raw objectCreate makes an orphan (queryable but
// absent from the navtree); the deleted createDocument tool used to do this via CollectionModel.add.
step('attach to root collection');
const collections = await mcp(
  'tools/call',
  {
    name: 'queryObjects',
    arguments: { spaceId: args.space, typename: 'org.dxos.type.collection', includeContent: true },
  },
  4,
);
const rootCollection =
  collections.result?.structuredContent?.results?.[0] ??
  fail('find collection', JSON.stringify(collections).slice(0, 300));
const members = [...(rootCollection.objects ?? []), { '/': docObj['@uri'] ?? `echo:///${docObj.id}` }];
const attach = await mcp(
  'tools/call',
  {
    name: 'updateObject',
    arguments: { spaceId: args.space, id: `echo:///${rootCollection.id}`, properties: { objects: members } },
  },
  5,
);
if (attach.result?.isError) fail('attach', JSON.stringify(attach.result.structuredContent).slice(0, 300));

// 3. Browser: assert the document shows up in Composer.
step('browser assert');
try {
  await page.goto(args.app);
  // The navtree's Collections node renders collapsed; the document title is not in the DOM
  // until it is expanded.
  const collections = page.getByText('Collections', { exact: true }).first();
  await collections.waitFor({ timeout: 20000 });
  await collections.click();
  await page
    .getByText(title.slice(0, 24), { exact: false })
    .first()
    .waitFor({ timeout: Number(args.timeout) });
  console.log(`OK: document "${title}" visible in Composer.`);
} finally {
  await browser.close();
}
