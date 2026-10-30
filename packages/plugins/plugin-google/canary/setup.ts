//
// Copyright 2026 DXOS.org
//

// One-time setup (README). Run from packages/plugins/plugin-google with the grant in the environment:
//   op run --env-file canary/gmail.env.tpl -- vite-node canary/setup.ts import <pool.mbox>
//   MAIL_CANARY_RECOVERY_PHRASE=... vite-node canary/setup.ts verify <space id>

import * as Effect from 'effect/Effect';
import { readFileSync } from 'node:fs';

import * as EffectEx from '@dxos/effect/EffectEx';

import { splitMbox } from '../scripts/mbox.ts';
import { CanaryError, CanaryMailbox, POOL_LABEL, credentialsFromEnv } from './mailbox.ts';
import { CanarySpace, previewClientLayer } from './space.ts';

// Gmail's simple upload takes 5 MB, and base64url grows a message by a third.
const MAX_MESSAGE_BYTES = 3_500_000;

/** Imports the pool into the inbox under the pool label alone, each message dated by its own `Date` header. */
const importPool = Effect.fn(function* (mboxPath: string) {
  const credentials = credentialsFromEnv();
  if (!credentials) {
    return yield* new CanaryError({ message: 'set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN' });
  }
  const mailbox = yield* CanaryMailbox.connect(credentials);
  const labels = ['INBOX', yield* mailbox.ensureLabel(POOL_LABEL)];
  const messages = splitMbox(readFileSync(mboxPath, 'latin1')).filter(
    (message) => Buffer.byteLength(message, 'latin1') <= MAX_MESSAGE_BYTES,
  );
  // Gmail allows 250 quota units per user per second; an import costs 25.
  yield* Effect.forEach(messages, (message) => mailbox.import(message, labels), { concurrency: 5, discard: true });
  console.log(
    `imported ${messages.length} messages; the pool holds ${(yield* mailbox.listIds(`label:${POOL_LABEL}`)).length}`,
  );
});

/** Reads the space as the nightly does and checks it has the mail sync's one enabled remote trigger. */
const verifySpace = Effect.fn(function* (spaceId: string) {
  const phrase = process.env.MAIL_CANARY_RECOVERY_PHRASE;
  if (!phrase) {
    return yield* new CanaryError({ message: 'set MAIL_CANARY_RECOVERY_PHRASE' });
  }
  const { triggers, messages, invocations } = yield* (yield* CanarySpace.open(spaceId, phrase)).snapshot();
  console.log(JSON.stringify({ triggers, messages: messages.length, syncInvocations: invocations.length }, null, 2));
  if (triggers.length !== 1 || !triggers[0].enabled) {
    return yield* new CanaryError({ message: 'expected exactly one enabled remote timer trigger: the */10 mail sync' });
  }
}, Effect.provide(previewClientLayer));

const [command, argument] = process.argv.slice(2);
await EffectEx.runPromise(
  Effect.gen(function* () {
    if (command === 'import' && argument) {
      return yield* importPool(argument);
    }
    if (command === 'verify' && argument) {
      return yield* verifySpace(argument);
    }
    return yield* new CanaryError({ message: 'usage: setup.ts import <mbox> | verify <space id>' });
  }),
);
