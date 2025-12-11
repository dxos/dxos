//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { invariant } from '@dxos/invariant';

export const recover = Command.make(
  'recover',
  {
    recoveryCode: Args.text({ name: 'recoveryCode' }).pipe(Args.withDescription('The recovery code seed phrase.')),
  },
  Effect.fn(function* ({ recoveryCode }) {
    const client = yield* ClientService;
    // TODO(wittjosiah): How to surface this error to the user cleanly?
    invariant(!client.halo.identity.get(), 'Identity already exists');

    const identity = yield* Effect.tryPromise(() => client.halo.recoverIdentity({ recoveryCode }));
    yield* Console.log('Identity recovered successfully');
    yield* Console.log('Identity key:', identity?.identityKey?.toHex());
    yield* Console.log('Display name:', identity?.profile?.displayName);
  }),
).pipe(Command.withDescription('Recover an existing identity using a recovery code.'));
