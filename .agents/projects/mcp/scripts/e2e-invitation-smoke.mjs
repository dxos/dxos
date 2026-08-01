#!/usr/bin/env node
//
// E2E smoke (Path B / device invitation): CLI hosts a HALO device invitation, a fresh browser
// joins it (reset-and-join flow landed in #12426), then the CLI identity creates a document via
// MCP and it must appear in the joined browser.
//
// Prereqs: edge stack up (TESTING.md), Composer served at --app from a checkout that includes
// the invitation fix, `halo create`/`share` registered (this branch; run CLI with DX_SOURCE=1).
//
// Usage: node e2e-invitation-smoke.mjs [--app http://localhost:5173] [--url http://localhost:8791]
//        [--cli <path to packages/devtools/cli>] [--headless] [--keep-profile]
//
// Legs: 1 cli identity → 2 host invitation → 3 browser join (playwright) → 4 whoami via MCP
//       (OAuth stub with the CLI identity) → 5 createObject document + attach → 6 assert in browser.
// NOTE: leg 3 is the open question (invitation handshake with a bun-hosted CLI peer). The script
// reports PASS/FAIL per leg so a leg-3 hang is itself a result.
//

import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    'app': { type: 'string', default: 'http://localhost:5173' },
    'url': { type: 'string', default: 'http://localhost:8791' },
    'cli': {
      type: 'string',
      default: `${process.env.HOME}/Code/dxos/dxos/.claude/worktrees/plugin-outliner-task-management-60c3ad/packages/devtools/cli`,
    },
    'profile': { type: 'string', default: `e2e-inv-${Date.now()}` },
    'headless': { type: 'boolean', default: true },
    'join-timeout': { type: 'string', default: '60000' },
  },
});

const fail = (step, detail) => {
  console.error(`FAIL [${step}]`, detail);
  process.exit(1);
};
const step = (name) => console.log(`--- ${name}`);

const dx = (cliArgs, { profile = true, ...opts } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn('./bin/dx', [...(profile ? ['-p', args.profile] : []), ...cliArgs], {
      cwd: args.cli,
      env: { ...process.env, DX_SOURCE: '1' },
      ...opts,
    });
    let out = '';
    child.stdout.on('data', (data) => (out += data));
    child.stderr.on('data', (data) => (out += data));
    child.on('exit', (code) =>
      code === 0 ? resolve(out) : reject(new Error(`dx ${cliArgs[0]} exit ${code}: ${out.slice(-400)}`)),
    );
  });

// 1. Fresh CLI profile + identity (identity + agent + personal space on the local edge).
step('cli identity');
// `-p` would auto-create the profile config before `profile create` runs, so omit it here.
await dx(['profile', 'create', '--template', 'local', '--name', args.profile], { profile: false }).catch((err) =>
  fail('profile create', err.message),
);
const created = await dx(['halo', 'create', '--displayName', args.profile]).catch((err) =>
  fail('halo create', err.message),
);
console.log(
  created
    .split('\n')
    .filter((line) => line.includes('identityDid'))
    .join(' ')
    .trim() || 'identity created',
);

// 2. Host the invitation (long-running; parse Secret + Invitation from stream).
step('host invitation');
const share = spawn('./bin/dx', ['-p', args.profile, 'halo', 'share', '--lifetime', '3600'], {
  cwd: args.cli,
  env: { ...process.env, DX_SOURCE: '1' },
});
let shareOut = '';
share.stdout.on('data', (data) => (shareOut += data));
share.stderr.on('data', (data) => (shareOut += data));
const waitFor = async (pattern, timeout, what) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const match = shareOut.match(pattern);
    if (match) return match[1];
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail(what, `not found in share output: ${shareOut.slice(-300)}`);
};
const authCode = await waitFor(/Secret: (\d+)/, 30000, 'auth code');
const invitationCode = await waitFor(/Invitation: (\S+)/, 30000, 'invitation code');
console.log('authCode', authCode, 'invitation', `${invitationCode.slice(0, 16)}…`);

// 3. Browser joins (fresh profile; the reset-and-join dialog from #12426 handles onboarding).
step('browser join');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ headless: args.headless });
const page = await (await browser.newContext()).newPage();
const joinTimeout = Number(args['join-timeout']);
try {
  await page.goto(`${args.app}/?deviceInvitationCode=${invitationCode}`);
  // The join dialog connects, then asks for the auth code; type it wherever the input appears.
  const codeInput = page.locator('input').first();
  await codeInput.waitFor({ timeout: joinTimeout });
  await codeInput.fill(authCode);
  await page.keyboard.press('Enter');
  // Success = the shell renders with the CLI identity's display name / a Personal Space.
  await page.getByText('Personal Space', { exact: false }).first().waitFor({ timeout: joinTimeout });
  console.log('joined');
} catch (err) {
  await page.screenshot({ path: '/tmp/e2e-invitation-join-fail.png' }).catch(() => {});
  fail(
    'browser join',
    `${err.message} (screenshot /tmp/e2e-invitation-join-fail.png; share output tail: ${shareOut.slice(-300)})`,
  );
}
share.kill();

// 4+5+6 to be enabled once leg 3 passes (whoami via stub with CLI identity key, createObject,
// attach, assert — same pattern as e2e-oauth-smoke.mjs).
console.log('LEG 3 PASSED — extend with MCP legs next.');
await browser.close();
