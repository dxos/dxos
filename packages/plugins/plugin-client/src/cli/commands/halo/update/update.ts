//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { print } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';

import { printIdentity } from '../util';

export const handler = Effect.fn(function* ({ displayName }: { displayName: string }) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.spaces.waitUntilReady());

  const identity = client.halo.identity.get();
  if (!identity) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'Identity not initialized' }, null, 2));
    } else {
      yield* Console.log('Identity not initialized.');
    }
    return;
  }

  const identityService = client.services.services.IdentityService;
  if (!identityService) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'IdentityService not found' }, null, 2));
    } else {
      yield* Console.log('IdentityService not found.');
    }
    return;
  }

  const updatedIdentity = yield* Effect.tryPromise(() =>
    identityService.updateProfile({
      displayName,
    }),
  );

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          identityKey: updatedIdentity.identityKey.toHex(),
          displayName: updatedIdentity.profile?.displayName,
        },
        null,
        2,
      ),
    );
  } else {
    yield* Console.log(print(printIdentity(updatedIdentity)));
  }
});

export const update = Command.make(
  'update',
  {
    displayName: Options.text('displayName').pipe(Options.withDescription('The display name of the identity.')),
  },
  handler,
).pipe(Command.withDescription('Update identity profile.'));
