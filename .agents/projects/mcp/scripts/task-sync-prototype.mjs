// Prototype for the task-planning ⇄ Composer sync design
// (agents/superpowers/specs/2026-08-01-task-planning-composer-sync-design.md):
// locate a tasks outline by name, read its checklist through the content ref, and apply a
// `$track`-style append as a CRDT text edit (updateObject.edits — never a whole-file rewrite,
// so Automerge history and concurrent Composer edits are preserved).
//
// Usage: node task-sync-prototype.mjs <identityKeyHex> <spaceId> [haloSpaceId] [docName] [taskText]
import { createHash, randomBytes } from 'node:crypto';

const baseUrl = process.env.MCP_URL ?? 'http://localhost:8791';
const redirectUri = 'http://localhost:9/callback';
const [identity, space, haloSpace, docName = 'MCP Tasks', taskText] = process.argv.slice(2);
const fail = (step, detail) => {
  console.error(`FAIL ${step}: ${detail}`);
  process.exit(1);
};
if (!identity || !space) fail('args', 'usage: task-sync-prototype.mjs <identityKeyHex> <spaceId> [haloSpaceId] [docName] [taskText]');

// --- OAuth stub (TESTING.md Path A) ---
const reg = await (
  await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'task-sync-prototype',
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
const nonce = formHtml.match(/name="nonce"\s+value="([^"]+)"/)?.[1] ?? fail('authorize form', formHtml.slice(0, 200));
const submit = await fetch(`${baseUrl}/authorize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    nonce,
    identity_key: identity,
    space_ids: space,
    ...(haloSpace ? { halo_space_id: haloSpace } : {}),
  }).toString(),
  redirect: 'manual',
});
const location = submit.headers.get('location') ?? fail('authorize', `${submit.status}`);
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
if (!token.access_token) fail('token', JSON.stringify(token).slice(0, 200));

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
const call = async (name, args, id) => {
  const resp = await mcp('tools/call', { name, arguments: { spaceId: space, ...args } }, id);
  if (resp.error || resp.result?.isError) fail(name, JSON.stringify(resp).slice(0, 400));
  return resp.result.structuredContent;
};

await mcp('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'task-sync', version: '0' } }, 1);

// --- 1. Locate the tasks document by name (outline or markdown document). ---
// In the full design registry.yml carries the echo:// DXN directly; name lookup is the bootstrap path.
const { results } = await call('queryObjects', { typename: 'org.dxos.type.outline', includeContent: true }, 2);
const doc = results.find((candidate) => candidate?.name === docName) ?? fail('locate', `no outline named "${docName}" — found: ${results.map((r) => r?.name).join(', ')}`);
const docId = doc.id ?? doc['@id'] ?? fail('locate', `no id on result: ${JSON.stringify(doc).slice(0, 200)}`);
console.log(`1. located "${docName}" → ${docId}`);

// --- 2. Read the checklist through the content ref (two-hop until a readText verb exists). ---
const contentRef = doc.content?.['/'] ?? fail('content ref', JSON.stringify(doc).slice(0, 300));
const { object: text } = await call('getObject', { id: contentRef }, 3);
console.log(`2. read content (${text.content.length} chars):\n---\n${text.content}\n---`);

// --- 3. $track-style append as a CRDT edit (empty oldString = append to end). ---
const line = `- [ ] ${taskText ?? `prototype task added ${new Date().toISOString()}`}`;
const { newContent } = await call('updateObject', { id: docId, edits: [{ newString: `\n${line}` }] }, 4);
console.log(`3. appended: ${line}`);

// --- 4. Verify the edit landed. ---
newContent.includes(line) || fail('verify', `appended line missing from newContent:\n${newContent}`);
console.log('4. verified in returned content.');
console.log('OK: task-sync prototype round-trip succeeded (locate → read → edit → verify).');
