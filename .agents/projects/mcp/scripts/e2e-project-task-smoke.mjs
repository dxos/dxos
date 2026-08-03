#!/usr/bin/env node
//
// E2E smoke (project + task verbs): drives the plugin-projects and plugin-tasks operations over MCP
// and asserts the results — MILESTONE-5.md §8 phase-4 acceptance
// (`projectCreate → taskCreate → taskUpdate → taskComplete` + list).
//
// Prereqs (TESTING.md): edge stack up with an @dxos pin that registers plugin-tasks
// (operation-service TasksPlugin + TaskSet/Task types), Composer served at --app.
//
// Usage:
//   node e2e-task-smoke.mjs --identity <hex> --space <spaceId> [--halo-space <id>]
//     [--url http://localhost:8791] [--app http://localhost:5173] [--browser-assert]
//
// Steps: projectCreate (scaffolds instructions + artifacts + a task set) → taskCreate ×2 (one
//        sub-task) → taskUpdate → taskAssign → taskComplete → taskList → projectList (assert
//        states). With --browser-assert, additionally assert the project renders in Composer.
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
    'browser-assert': { type: 'boolean', default: false },
    'headless': { type: 'boolean', default: true },
  },
});

const fail = (step, detail) => {
  console.error(`FAIL [${step}]`, detail);
  process.exit(1);
};
const step = (name) => console.log(`--- ${name}`);
if (!args.identity || !args.space) fail('args', 'pass --identity <hex> and --space <spaceId> (see TESTING.md Path A)');

const baseUrl = args.url.replace(/\/$/, '');
const redirectUri = 'http://localhost:3000/callback';

// --- OAuth stub (TESTING.md Path A). ---
step('oauth');
const reg = await (
  await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'e2e-task-smoke',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
    }),
  })
).json();
if (!reg.client_id) fail('register', JSON.stringify(reg).slice(0, 300));
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
  submit.headers.get('location') ?? fail('authorize', `${submit.status}: ${(await submit.text()).slice(0, 300)}`);
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
  if (!resp.ok) fail(`mcp ${method}`, `${resp.status}: ${text.slice(0, 300)}`);
  return text.includes('data: ') ? JSON.parse(text.split('data: ')[1].split('\n')[0]) : JSON.parse(text);
};
let callId = 1;
// Never dereference an unexpected response shape: a malformed result is exactly what this smoke
// test exists to report, so it must surface as FAIL rather than a TypeError.
const describeValue = (value) => (value === undefined ? 'undefined' : JSON.stringify(value).slice(0, 400));
const call = async (name, callArgs) => {
  const resp = await mcp('tools/call', { name, arguments: { spaceId: args.space, ...callArgs } }, ++callId);
  if (resp.error || resp.result?.isError || !resp.result?.structuredContent) {
    fail(name, describeValue(resp.error ?? resp.result?.structuredContent ?? resp));
  }
  return resp.result.structuredContent;
};
const uriOf = (obj) => obj['@uri'] ?? `echo:///${obj.id}`;

await mcp(
  'initialize',
  { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'e2e-task', version: '0' } },
  1,
);

// --- 1. Create the project; its scaffold owns the task set the tasks file into. ---
step('projectCreate');
const projectName = `E2E Project ${new Date().toISOString()}`;
const { project } = await call('projectCreate', { name: projectName });
project?.id || fail('projectCreate', describeValue(project));
const projectId = uriOf(project);
const taskSetRef = project.taskSet?.['/'] ?? fail('projectCreate taskSet', describeValue(project.taskSet));
// Refs come back space-relative; task verbs accept either form.
const taskSetId = taskSetRef;
console.log('project:', projectId, 'taskSet:', taskSetId);

// --- 2. taskCreate: root task + sub-task (parent-edge containment). ---
step('taskCreate');
const { task: rootTask } = await call('taskCreate', { taskSetId, title: 'Ship the task verbs', priority: 'high' });
rootTask?.title === 'Ship the task verbs' || fail('taskCreate', describeValue(rootTask));
rootTask?.status === 'todo' || fail('taskCreate default status', describeValue(rootTask?.status));
const rootTaskId = uriOf(rootTask);
const { task: subTask } = await call('taskCreate', { taskSetId, title: 'Write the e2e', parentId: rootTaskId });
const subTaskId = uriOf(subTask);
console.log('tasks:', rootTaskId, subTaskId);

// --- 3. taskUpdate: schema-checked patch. ---
step('taskUpdate');
const { task: updated } = await call('taskUpdate', { id: rootTaskId, status: 'in-progress', estimate: 2 });
updated?.status === 'in-progress' || fail('taskUpdate', describeValue(updated));

// --- 4. taskAssign + taskComplete. ---
step('taskAssign + taskComplete');
await call('taskAssign', { id: subTaskId, assignee: { role: 'assistant', name: 'Scout' } });
const { task: completed } = await call('taskComplete', { id: subTaskId });
completed?.status === 'done' || fail('taskComplete', describeValue(completed));

// --- 5. taskList: both tasks visible with final states. ---
step('taskList');
const { results } = await call('taskList', { limit: 100 });
const byTitle = Object.fromEntries(results.map((task) => [task.title, task]));
byTitle['Ship the task verbs']?.status === 'in-progress' ||
  fail('taskList root', JSON.stringify(byTitle).slice(0, 400));
byTitle['Write the e2e']?.status === 'done' || fail('taskList sub', JSON.stringify(byTitle).slice(0, 400));
console.log(`listed ${results.length} tasks; states verified.`);

// --- 6. projectList / projectGet: the project is queryable and still owns its task set. ---
step('projectList + projectGet');
const { results: projects } = await call('projectList', { limit: 100 });
projects.some((entry) => entry?.name === projectName) ||
  fail('projectList', JSON.stringify(projects.map((entry) => entry?.name)).slice(0, 300));
const { project: reloaded } = await call('projectGet', { id: projectId });
reloaded?.taskSet?.['/'] === taskSetRef || fail('projectGet', describeValue(reloaded));
console.log(`listed ${projects.length} projects; project graph verified.`);

// --- 7. Optional: assert the project renders in Composer. ---
if (args['browser-assert']) {
  step('browser assert');
  // `projects.create` files the project through SpaceOperation.AddObject, so it is already in the graph.
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: args.headless });
  process.on('exit', () => browser.process()?.kill());
  try {
    const page = await (await browser.newContext()).newPage();
    await page.goto(args.app);
    const collectionsNode = page.getByText('Collections', { exact: true }).first();
    await collectionsNode.waitFor({ timeout: 20000 });
    await collectionsNode.click();
    await page.getByText(projectName.slice(0, 20), { exact: false }).first().waitFor({ timeout: 30000 });
    console.log('project visible in Composer.');
  } finally {
    await browser.close();
  }
}

console.log('OK: project + task verb e2e passed (projectCreate → taskCreate ×2 → update → assign → complete → list).');
