#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Manual entry point for the canary's Gmail steps; the nightly run uses the same modules from its test.
//
//   node src/main.ts auth                     # step 02: mint the Gmail grant into .secrets/mail-canary-gmail.env
//   node src/main.ts import-pool <mbox>       # step 02: import the pool from step 01 (resumable)
//   node src/main.ts pool-status              # step 02: check the pool is non-empty, archived and old enough
//   node src/main.ts seed [--count 100]       # copy pool messages into the inbox as fresh dx-seed mail
//   node src/main.ts trash [--days 2]         # move older dx-seed copies to Trash
//
// Every command except `auth` reads the grant from GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and
// GMAIL_REFRESH_TOKEN; pass `--env-file-if-exists=.secrets/mail-canary-gmail.env` to node to load them.

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mintRefreshToken } from './auth.ts';
import { accessToken, canaryAccount, credentialsFromEnv, makeGmail } from './gmail.ts';
import { importPool } from './pool.ts';
import { POOL_LABEL, SEED_LABEL, seedCopies, trashOldCopies } from './seed.ts';

const SYNC_WINDOW_DAYS = 30;

class CanaryError extends Data.TaggedError('CanaryError')<{ readonly message: string }> {}

const flag = (name: string, fallback: number): Effect.Effect<number, CanaryError> => {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) {
    return Effect.succeed(fallback);
  }
  const value = Number(process.argv[index + 1]);
  return Number.isInteger(value) && value > 0
    ? Effect.succeed(value)
    : Effect.fail(new CanaryError({ message: `--${name} takes a positive integer` }));
};

/** The monorepo root, where `.secrets/` lives (git-ignored at every depth). */
const repoRoot = (): string => {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, 'pnpm-workspace.yaml')) && dirname(dir) !== dir) {
    dir = dirname(dir);
  }
  return dir;
};

const gmailForAccount = Effect.gen(function* () {
  const credentials = credentialsFromEnv();
  if (!credentials) {
    return yield* new CanaryError({
      message: 'set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN (run `auth` first; see README)',
    });
  }
  const gmail = makeGmail(yield* accessToken(credentials));
  yield* gmail.assertAccount(canaryAccount());
  return gmail;
});

const program = Effect.gen(function* () {
  const command = process.argv[2];
  switch (command) {
    case 'auth': {
      const clientId = process.env.GMAIL_CLIENT_ID;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return yield* new CanaryError({
          message: 'set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET of a Desktop OAuth client',
        });
      }
      const refreshToken = yield* mintRefreshToken({ clientId, clientSecret, loginHint: canaryAccount() });
      const gmail = makeGmail(yield* accessToken({ clientId, clientSecret, refreshToken }));
      yield* gmail.assertAccount(canaryAccount());
      const file = join(repoRoot(), '.secrets', 'mail-canary-gmail.env');
      mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
      writeFileSync(
        file,
        `GMAIL_CLIENT_ID=${clientId}\nGMAIL_CLIENT_SECRET=${clientSecret}\nGMAIL_REFRESH_TOKEN=${refreshToken}\n`,
        { mode: 0o600 },
      );
      console.log(
        `Saved the grant for ${canaryAccount()} to ${file}. Copy its values into the CI secrets and 1Password (see README).`,
      );
      return;
    }
    case 'import-pool': {
      const mboxPath = process.argv[3];
      if (!mboxPath) {
        return yield* new CanaryError({ message: 'usage: import-pool <mbox from step 01>' });
      }
      const gmail = yield* gmailForAccount;
      const result = yield* importPool(gmail, {
        mboxPath,
        onProgress: (imported, total) => console.error(`imported ${imported} / ${total}`),
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'pool-status': {
      const gmail = yield* gmailForAccount;
      const pool = yield* gmail.count(`label:${POOL_LABEL}`);
      const inInbox = yield* gmail.count(`label:${POOL_LABEL} in:inbox`);
      const recent = yield* gmail.count(`label:${POOL_LABEL} newer_than:${SYNC_WINDOW_DAYS + 1}d`);
      console.log(JSON.stringify({ pool, inInbox, newerThanSyncWindow: recent }, null, 2));
      if (pool === 0 || inInbox > 0 || recent > 0) {
        return yield* new CanaryError({
          message: `pool is not ready: it must be non-empty, archived, and older than ${SYNC_WINDOW_DAYS + 1} days`,
        });
      }
      return;
    }
    case 'seed': {
      const gmail = yield* gmailForAccount;
      const { poolSize, seededIds } = yield* seedCopies(gmail, { count: yield* flag('count', 100), now: new Date() });
      console.log(JSON.stringify({ poolSize, seeded: seededIds.length, label: SEED_LABEL }, null, 2));
      return;
    }
    case 'trash': {
      const gmail = yield* gmailForAccount;
      const trashed = yield* trashOldCopies(gmail, yield* flag('days', 2));
      console.log(JSON.stringify({ trashed }, null, 2));
      return;
    }
    default:
      return yield* new CanaryError({
        message: `unknown command: ${command ?? '(none)'}; expected auth, import-pool, pool-status, seed or trash`,
      });
  }
});

const exit = await Effect.runPromiseExit(program);
if (Exit.isFailure(exit)) {
  console.error(String(exit.cause));
  process.exitCode = 1;
}
