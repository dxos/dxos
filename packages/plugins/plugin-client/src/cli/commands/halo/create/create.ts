//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, PluginService, createIntent } from '@dxos/app-framework';
import { CommandConfig, flushAndSync, spaceLayer } from '@dxos/cli-util';
import { print } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { invariant } from '@dxos/invariant';

import { ClientAction } from '../../../../types';
import { printIdentity } from '../util';

export const handler = Effect.fn(function* ({
  agent,
  displayName,
}: {
  agent: boolean;
  displayName: Option.Option<string>;
}) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  // TODO(wittjosiah): How to surface this error to the user cleanly?
  invariant(!client.halo.identity.get(), 'Identity already exists');

  const manager = yield* PluginService;
  const { dispatch } = manager.context.getCapability(Capabilities.IntentDispatcher);
  const identity = yield* dispatch(
    createIntent(ClientAction.CreateIdentity, { displayName: Option.getOrUndefined(displayName) }),
  );

  if (agent) {
    yield* dispatch(createIntent(ClientAction.CreateAgent));
  }

  yield* Effect.promise(() => client.spaces.waitUntilReady());
  yield* Effect.promise(() => client.spaces.default.waitUntilReady());
  const space = client.spaces.default;
  yield* flushAndSync({ indexes: true }).pipe(Effect.provide(spaceLayer(Option.some(space.id))));

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
    yield* Console.log(print(printIdentity(identity)));
  }
});

export const create = Command.make(
  'create',
  {
    agent: Options.boolean('noAgent', { ifPresent: false }).pipe(
      Options.withDescription('Do not create an EDGE agent for the identity.'),
    ),
    displayName: Options.text('displayName').pipe(
      Options.withDescription('The display name of the identity.'),
      Options.optional,
    ),
  },
  handler,
).pipe(Command.withDescription('Create a new identity.'));
