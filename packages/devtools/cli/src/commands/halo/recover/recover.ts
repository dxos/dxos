//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { invariant } from '@dxos/invariant';

import { CommandConfig } from '../../../services';
import { print } from '../../../util';
import { printIdentity } from '../util';

export const recover = Command.make(
  'recover',
  {
    recoveryCode: Args.text({ name: 'recoveryCode' }).pipe(Args.withDescription('The recovery code seed phrase.')),
  },
  Effect.fn(function* ({ recoveryCode }) {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;
    // TODO(wittjosiah): How to surface this error to the user cleanly?
    invariant(!client.halo.identity.get(), 'Identity already exists');

    const identity = yield* Effect.tryPromise(() => client.halo.recoverIdentity({ recoveryCode }));
    if (json) {
      yield* Console.log(
        JSON.stringify(
          {
            identityKey: identity.identityKey.toHex(),
            displayName: identity.profile?.displayName,
          },
          null,
          2,
        ),
      );
    } else {
      yield* Console.log('Identity recovered successfully');
      yield* Console.log(print(printIdentity(identity)));
    }
  }),
).pipe(Command.withDescription('Recover an existing identity using a recovery code.'));
