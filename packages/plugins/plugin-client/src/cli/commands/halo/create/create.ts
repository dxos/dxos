//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { print } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { invariant } from '@dxos/invariant';

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

  const identity = yield* Effect.tryPromise(() =>
    client.halo.createIdentity({ displayName: Option.getOrUndefined(displayName) }),
  );

  if (agent) {
    yield* Effect.tryPromise(() => {
      invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
      return client.services.services.EdgeAgentService.createAgent(null as any, { timeout: 10_000 });
    });
  }

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
