#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Manual entry point for the canary's Gmail steps; the nightly run uses the same classes from its test.
//
//   node src/cli/canary.ts auth                     # step 02: mint the Gmail grant into .secrets/mail-canary-gmail.env
//   node src/cli/canary.ts import-pool <mbox>       # step 02: import the pool from step 01 (resumable)
//   node src/cli/canary.ts pool-status [mbox]       # step 02: check the pool is archived, old enough, and exactly the mbox
//   node src/cli/canary.ts purge-pool               # step 02: trash the pool, to clear a trial import
//   node src/cli/canary.ts seed [--count 100]       # copy pool messages into the inbox as fresh dx-seed mail
//   node src/cli/canary.ts trash [--days 2]         # move older dx-seed copies to Trash
//
// Every command except `auth` reads the grant from GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and
// GMAIL_REFRESH_TOKEN; pass `--env-file-if-exists=.secrets/mail-canary-gmail.env` to node to load them.

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GmailClient, canaryAccount, credentialsFromEnv, mintRefreshToken } from '../gmail/index.ts';
import { Pool, SYNC_WINDOW_DAYS } from '../pool/index.ts';
import { SEED_LABEL, Seeder } from '../seed/index.ts';

class CanaryError extends Data.TaggedError('CanaryError')<{ readonly message: string }> {}

/** Writes the canary's own Gmail grant to `.secrets/` after a browser consent as the test account. */
const authorize = Effect.gen(function* () {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return yield* new CanaryError({ message: 'set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET of a Desktop OAuth client' });
  }
  const refreshToken = yield* mintRefreshToken({ clientId, clientSecret, loginHint: canaryAccount() });
  yield* GmailClient.connect({ clientId, clientSecret, refreshToken }, canaryAccount());
  const file = join(repoRoot(), '.secrets', 'mail-canary-gmail.env');
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(
    file,
    `GMAIL_CLIENT_ID=${clientId}\nGMAIL_CLIENT_SECRET=${clientSecret}\nGMAIL_REFRESH_TOKEN=${refreshToken}\n`,
    { mode: 0o600 },
  );
  console.log(`Saved the grant for ${canaryAccount()} to ${file}. Copy its values into the CI secrets and 1Password.`);
});

const connect = Effect.gen(function* () {
  const credentials = credentialsFromEnv();
  if (!credentials) {
    return yield* new CanaryError({
      message: 'set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN (run `auth` first; see README)',
    });
  }
  return yield* GmailClient.connect(credentials, canaryAccount());
});

const program = Effect.gen(function* () {
  const [command, argument] = process.argv.slice(2);
  switch (command) {
    case 'auth':
      return yield* authorize;

    case 'import-pool': {
      if (!argument || argument.startsWith('--')) {
        return yield* new CanaryError({ message: 'usage: import-pool <mbox from step 01>' });
      }
      const pool = new Pool(yield* connect);
      const result = yield* pool.import({
        mboxPath: argument,
        onProgress: (imported, total) => console.error(`imported ${imported} / ${total}`),
      });
      print(result);
      return;
    }

    case 'pool-status': {
      const status = yield* new Pool(yield* connect).status({ mboxPath: argument });
      print(status);
      if (!status.ready) {
        return yield* new CanaryError({
          message:
            `pool is not ready: it must be non-empty, archived, older than ${SYNC_WINDOW_DAYS + 1} days` +
            ' and, when an mbox is given, hold exactly its messages (purge a trial import first)',
        });
      }
      return;
    }

    case 'purge-pool': {
      print({ trashed: yield* new Pool(yield* connect).purge() });
      return;
    }

    case 'seed': {
      const count = yield* flag('count', 100);
      const { poolSize, seededIds } = yield* new Seeder(yield* connect).seed({ count, now: new Date() });
      print({ poolSize, seeded: seededIds.length, label: SEED_LABEL });
      return;
    }

    case 'trash': {
      const days = yield* flag('days', 2);
      print({ trashed: yield* new Seeder(yield* connect).trash(days) });
      return;
    }

    default:
      return yield* new CanaryError({
        message: `unknown command: ${command ?? '(none)'}; expected auth, import-pool, pool-status, purge-pool, seed or trash`,
      });
  }
});

const print = (value: unknown): void => console.log(JSON.stringify(value, null, 2));

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

const exit = await Effect.runPromiseExit(program);
if (Exit.isFailure(exit)) {
  console.error(String(exit.cause));
  process.exitCode = 1;
}
