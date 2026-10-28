#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Step 03: creates the canary's preview identity and space with the dx CLI, and verifies the space
// once Gmail is bound in Composer (README, step 03); the CLI cannot bind the mailbox and its sync yet.
//
//   node scripts/mail-canary/03-setup-space.mjs create <hub access code>   # profile, identity, space, recovery phrase
//   MAIL_CANARY_RECOVERY_PHRASE=... node scripts/mail-canary/03-setup-space.mjs verify <space id>   # mailbox, trace feed, one sync trigger
//
// verify reads the space as the nightly does: an in-process client recovers the identity and pulls the space.

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canaryAccount } from '../../src/canary/gmail/index.ts';
import { CanarySpace, previewClientLayer } from '../../src/canary/space/index.ts';

const PROFILE = 'mail-canary';
const SPACE_NAME = 'Mail canary';
const PREVIEW_HUB = 'https://preview.dxos.network/hub/';
const DX = fileURLToPath(new URL('../../../../../packages/devtools/cli/bin/dx', import.meta.url));
const env = { ...process.env, DX_PROFILE: PROFILE };
const dx = (...args) => execFileSync(DX, args, { env, stdio: 'inherit' });
const dxJson = (...args) => JSON.parse(execFileSync(DX, ['--json', ...args], { env, encoding: 'utf8' }));

const [command, argument] = process.argv.slice(2);
if (command === 'create' && argument) {
  // Without DX_PROFILE: dx would first bootstrap a bare profile under that name, and the create would refuse it.
  execFileSync(DX, ['profile', 'create', '--template', 'preview', '--name', PROFILE], { stdio: 'inherit' });
  // The preview template names no hub, so signup would check the access code against production's.
  appendFileSync(join(homedir(), '.config/dx/profile', `${PROFILE}.yml`), `\n    hub:\n      url: ${PREVIEW_HUB}\n`);
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

Next: bind Gmail in Composer (README, step 03), then run verify ${space.id} with the phrase set.`);
} else if (command === 'verify' && argument && process.env.MAIL_CANARY_RECOVERY_PHRASE) {
  const exit = await Effect.runPromiseExit(
    CanarySpace.open({ spaceId: argument, recoveryPhrase: process.env.MAIL_CANARY_RECOVERY_PHRASE }).pipe(
      Effect.flatMap((space) => space.snapshot()),
      Effect.provide(previewClientLayer),
    ),
  );
  if (Exit.isFailure(exit)) {
    console.error(String(exit.cause));
    process.exit(1);
  }
  const { triggers, invocations, messages } = exit.value;
  console.log(JSON.stringify({ triggers, messages: messages.length, syncInvocations: invocations.length }, null, 2));
  if (triggers.length !== 1 || !triggers[0].enabled) {
    console.error('expected exactly one enabled remote timer trigger: the */10 mail sync');
    process.exit(1);
  }
} else {
  console.error(
    'usage: 03-setup-space.mjs create <hub access code> | verify <space id> (with MAIL_CANARY_RECOVERY_PHRASE set)',
  );
  process.exit(1);
}
