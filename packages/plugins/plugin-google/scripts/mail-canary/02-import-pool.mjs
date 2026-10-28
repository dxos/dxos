#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Step 02: puts the pool from step 01 into the test account through the Gmail API.
//
//   node scripts/mail-canary/02-import-pool.mjs auth     # once: browser consent; writes the grant to .secrets/mail-canary-gmail.env
//   node scripts/mail-canary/02-import-pool.mjs <mbox>   # import (resumable), then check the pool holds exactly the mbox
//   node scripts/mail-canary/02-import-pool.mjs purge    # trash the pool, to clear the 10-message trial
//
// The grant comes from GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN, else the .secrets
// file, else (with a 1Password service account, as in the cloud sandbox) the references in gmail.env.tpl.
// Run it before step 03: a space that already syncs takes imported mail as new, by id with no date
// check, so it would pull the whole pool in.

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CanaryMailbox, canaryAccount, credentialsFromEnv, mintRefreshToken } from '../../src/canary/gmail/index.ts';
import { Pool } from '../../src/canary/pool/index.ts';

const SECRETS = fileURLToPath(new URL('../../../../../.secrets/mail-canary-gmail.env', import.meta.url));
const [command] = process.argv.slice(2);

if (command !== 'auth' && !process.env.GMAIL_REFRESH_TOKEN) {
  if (existsSync(SECRETS)) {
    process.loadEnvFile(SECRETS);
  } else if (process.env.OP_SERVICE_ACCOUNT_TOKEN) {
    const template = fileURLToPath(new URL('./gmail.env.tpl', import.meta.url));
    const run = spawnSync('op', ['run', `--env-file=${template}`, '--', process.execPath, ...process.argv.slice(1)], {
      stdio: 'inherit',
    });
    process.exit(run.status ?? 1);
  }
}

const authorize = Effect.gen(function* () {
  const { GMAIL_CLIENT_ID: clientId, GMAIL_CLIENT_SECRET: clientSecret } = process.env;
  if (!clientId || !clientSecret) {
    return yield* Effect.fail(
      new Error('set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (eng-dev/com.google, section dev)'),
    );
  }
  const refreshToken = yield* mintRefreshToken({ clientId, clientSecret, loginHint: canaryAccount() });
  yield* CanaryMailbox.connect({ clientId, clientSecret, refreshToken }, canaryAccount());
  mkdirSync(dirname(SECRETS), { recursive: true, mode: 0o700 });
  const grant = `GMAIL_CLIENT_ID=${clientId}\nGMAIL_CLIENT_SECRET=${clientSecret}\nGMAIL_REFRESH_TOKEN=${refreshToken}\n`;
  writeFileSync(SECRETS, grant, { mode: 0o600 });
  console.log(
    `Saved the grant for ${canaryAccount()} to ${SECRETS}. Copy its values into the CI secrets and 1Password.`,
  );
});

const importOrPurge = Effect.gen(function* () {
  const credentials = credentialsFromEnv();
  if (!command || !credentials) {
    return yield* Effect.fail(
      new Error('usage: 02-import-pool.mjs auth | <mbox> | purge, with the grant set (see README)'),
    );
  }
  const pool = new Pool(yield* CanaryMailbox.connect(credentials, canaryAccount()));
  if (command === 'purge') {
    console.log(`trashed ${yield* pool.purge()} pool messages`);
    return;
  }
  const result = yield* pool.import({
    mboxPath: command,
    onProgress: (imported, total) => console.error(`imported ${imported} / ${total}`),
  });
  const status = yield* pool.status({ mboxPath: command });
  console.log(JSON.stringify({ ...result, ...status }, null, 2));
  if (!status.ready) {
    // A purge trashes the messages but leaves the progress file, so a rerun would skip them all.
    const hint = status.size < (status.expected ?? 0) ? `; to import again, delete ${command}.imported first` : '';
    return yield* Effect.fail(
      new Error(
        `pool is not ready: it must hold exactly the mbox (purge a trial first), in the inbox and inside the 30-day sync window${hint}`,
      ),
    );
  }
});

const exit = await Effect.runPromiseExit(command === 'auth' ? authorize : importOrPurge);
if (Exit.isFailure(exit)) {
  console.error(String(exit.cause));
  process.exitCode = 1;
}
