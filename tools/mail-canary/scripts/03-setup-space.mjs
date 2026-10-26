#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Step 03: creates the canary's preview identity and space with the dx CLI, and verifies the space
// once Gmail is bound in Composer (README, step 03); the CLI cannot bind the mailbox and its sync yet.
//
//   node scripts/03-setup-space.mjs create <hub access code>   # profile, identity, space, recovery phrase
//   node scripts/03-setup-space.mjs verify <space id>          # mailbox, trace feed and one enabled sync trigger

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { canaryAccount } from '../src/gmail/index.ts';
import { SpaceReader } from '../src/space/index.ts';

const PROFILE = 'mail-canary';
const SPACE_NAME = 'Mail canary';
const DX = fileURLToPath(new URL('../../../packages/devtools/cli/bin/dx', import.meta.url));
const env = { ...process.env, DX_PROFILE: PROFILE };
const dx = (...args) => execFileSync(DX, args, { env, stdio: 'inherit' });
const dxJson = (...args) => JSON.parse(execFileSync(DX, ['--json', ...args], { env, encoding: 'utf8' }));

const [command, argument] = process.argv.slice(2);
if (command === 'create' && argument) {
  dx('profile', 'create', '--template', 'preview', '--name', PROFILE);
  // Binds the identity to a hub account for the test address; follow the link the hub emails.
  dx('account', 'signup', '--method', 'email', argument, canaryAccount());
  dx('space', 'create', '--name', SPACE_NAME);
  const space = dxJson('space', 'list').find((entry) => entry.name === SPACE_NAME);
  const { recoveryCode } = dxJson('halo', 'seed');
  console.log(`
Created space "${SPACE_NAME}" for ${canaryAccount()} on preview.

  Repository variable MAIL_CANARY_SPACE_ID = ${space.id}
  Repository secret   MAIL_CANARY_RECOVERY_PHRASE = (below, printed once; store it now)

${recoveryCode}

Next: bind Gmail in Composer (README, step 03), then run: node scripts/03-setup-space.mjs verify ${space.id}`);
} else if (command === 'verify' && argument) {
  const reader = new SpaceReader({ spaceId: argument, home: homedir(), profile: PROFILE });
  const exit = await Effect.runPromiseExit(reader.snapshot({ since: Date.now() - 86_400_000, maxMessages: 0 }));
  if (Exit.isFailure(exit)) {
    console.error(String(exit.cause));
    process.exit(1);
  }
  const { triggers, events } = exit.value;
  console.log(JSON.stringify({ triggers, syncEventsLastDay: events.length }, null, 2));
  if (triggers.length !== 1 || !triggers[0].enabled) {
    console.error('expected exactly one enabled remote timer trigger: the */10 mail sync');
    process.exit(1);
  }
} else {
  console.error('usage: 03-setup-space.mjs create <hub access code> | verify <space id>');
  process.exit(1);
}
