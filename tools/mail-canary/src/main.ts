#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Manual entry point for the canary's Gmail steps; the nightly run uses the same modules from its test.
//
//   node src/main.ts pool-status          # step 02: count the pool and check none of it is in the inbox
//   node src/main.ts seed [--count 100]   # copy pool messages into the inbox as fresh dx-seed mail
//   node src/main.ts trash [--days 2]     # move older dx-seed copies to Trash

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { accessToken, credentialsFromEnv, makeGmail } from './gmail.ts';
import { POOL_LABEL, SEED_LABEL, seedCopies, trashOldCopies } from './seed.ts';

const SYNC_WINDOW_DAYS = 30;

class CanaryError extends Data.TaggedError('CanaryError')<{ readonly message: string }> {}

const flag = (name: string, fallback: number): number => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : Number(process.argv[index + 1]);
};

const credentials = credentialsFromEnv();
if (!credentials) {
  console.error('error: set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN (see README).');
  process.exit(1);
}

const program = Effect.gen(function* () {
  const gmail = makeGmail(yield* accessToken(credentials));
  const command = process.argv[2];
  switch (command) {
    case 'pool-status': {
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
      const { poolSize, seededIds } = yield* seedCopies(gmail, { count: flag('count', 100), now: new Date() });
      console.log(JSON.stringify({ poolSize, seeded: seededIds.length, label: SEED_LABEL }, null, 2));
      return;
    }
    case 'trash': {
      const trashed = yield* trashOldCopies(gmail, flag('days', 2));
      console.log(JSON.stringify({ trashed }, null, 2));
      return;
    }
    default:
      return yield* new CanaryError({
        message: `unknown command: ${command ?? '(none)'}; expected pool-status, seed or trash`,
      });
  }
});

const exit = await Effect.runPromiseExit(program);
if (Exit.isFailure(exit)) {
  console.error(String(exit.cause));
  process.exitCode = 1;
}
