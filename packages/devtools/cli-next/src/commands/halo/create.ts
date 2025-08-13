//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { Effect, Option } from 'effect';

import { invariant } from '@dxos/invariant';

import { ClientService } from '../../services';

const displayName = Options.text('displayName').pipe(
  Options.withDescription('The display name of the identity'),
  Options.optional,
);

export const create = Command.make('create', { displayName }, ({ displayName }) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    // TODO(wittjosiah): How to surface this error to the user cleanly?
    invariant(!client.halo.identity.get(), 'Identity already exists');

    const identity = yield* Effect.tryPromise(() =>
      client.halo.createIdentity({ displayName: Option.getOrUndefined(displayName) }),
    );
    yield* Effect.log('Identity key:', identity.identityKey.toHex());
    yield* Effect.log('Display name:', identity.profile?.displayName);
  }),
);
