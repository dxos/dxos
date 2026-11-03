//
// Copyright 2026 DXOS.org
//

// One-time setup check (README). Run from packages/plugins/plugin-google:
//   MAIL_CANARY_RECOVERY_PHRASE=... vite-node canary/setup.ts verify <space id>

import * as Effect from 'effect/Effect';

import * as EffectEx from '@dxos/effect/EffectEx';

import { CanaryError } from './mailbox.ts';
import { CanarySpace, previewClientLayer, recoverIdentity } from './space.ts';

/** Reads the space as the nightly does and checks it has the mail sync's one enabled remote trigger. */
const verifySpace = Effect.fn(function* (spaceId: string) {
  const phrase = process.env.MAIL_CANARY_RECOVERY_PHRASE;
  if (!phrase) {
    return yield* new CanaryError({ message: 'set MAIL_CANARY_RECOVERY_PHRASE' });
  }
  yield* recoverIdentity(phrase);
  const { triggers, messages, invocations } = yield* (yield* CanarySpace.open(spaceId)).snapshot();
  console.log(JSON.stringify({ triggers, messages: messages.length, syncInvocations: invocations.length }, null, 2));
  if (triggers.length !== 1 || !triggers[0].enabled) {
    return yield* new CanaryError({ message: 'expected exactly one enabled remote timer trigger: the */10 mail sync' });
  }
}, Effect.provide(previewClientLayer));

const [command, argument] = process.argv.slice(2);
await EffectEx.runPromise(
  Effect.gen(function* () {
    if (command === 'verify' && argument) {
      return yield* verifySpace(argument);
    }
    return yield* new CanaryError({ message: 'usage: setup.ts verify <space id>' });
  }),
);
