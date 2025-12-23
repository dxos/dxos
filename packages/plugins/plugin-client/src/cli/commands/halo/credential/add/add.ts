//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { schema } from '@dxos/protocols/proto';

export const handler = Effect.fn(function* ({ credential }: { credential: Option.Option<string> }) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;

  let credentialHex = Option.getOrUndefined(credential);
  if (!credentialHex) {
    credentialHex = yield* Prompt.text({ message: 'Enter credential (hex string)' }).pipe(Prompt.run);
  }

  invariant(credentialHex, 'Invalid credential.');

  const identity = client.halo.identity;
  if (!identity) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'Profile not initialized' }, null, 2));
    } else {
      yield* Console.log('Profile not initialized.');
    }
    return;
  }

  yield* Effect.gen(function* () {
    const codec = schema.getCodecForType('dxos.halo.credentials.Credential');
    const credentialBytes = yield* Effect.try({
      try: () => Buffer.from(credentialHex, 'hex'),
      catch: (error) => new Error(`Failed to parse hex string: ${error}`),
    });

    const verifyError = codec.protoType.verify(credentialBytes);
    if (verifyError) {
      yield* Effect.fail(new Error(verifyError));
    }

    const credentialObj = yield* Effect.try({
      try: () => codec.decode(credentialBytes),
      catch: (error) => new Error(`Failed to decode credential: ${error}`),
    });

    yield* Effect.tryPromise({
      try: () => client.halo.writeCredentials([credentialObj]),
      catch: (error) => new Error(`Failed to write credential: ${error}`),
    });

    if (json) {
      yield* Console.log(JSON.stringify({ success: true }, null, 2));
    } else {
      yield* Console.log('Credential added successfully.');
    }
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        if (json) {
          yield* Console.log(
            JSON.stringify(
              {
                error: 'Invalid credential',
                message: error instanceof Error ? error.message : String(error),
              },
              null,
              2,
            ),
          );
        } else {
          yield* Console.log('Invalid credential.');
        }
        yield* Effect.fail(error);
      }),
    ),
  );
});

export const add = Command.make(
  'add',
  {
    credential: Args.text({ name: 'credential' }).pipe(
      Args.withDescription('Credential as hex string.'),
      Args.optional,
    ),
  },
  handler,
).pipe(Command.withDescription('Import credential into HALO.'));
