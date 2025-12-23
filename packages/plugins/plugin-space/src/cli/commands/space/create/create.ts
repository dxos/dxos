//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { print, waitForSync } from '@dxos/cli-util';
import { FormBuilder } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';

export const handler = Effect.fn(function* ({ name }: { name: Option.Option<string> }) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;

  const space = yield* Effect.tryPromise(() => client.spaces.create());
  yield* Effect.tryPromise(() => space.waitUntilReady());

  if (Option.isSome(name)) {
    space.properties.name = Option.getOrUndefined(name);
  }

  // Output first, then flush and sync
  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          key: space.key.toHex(),
          ...(space.properties.name ? { name: space.properties.name } : {}),
        },
        null,
        2,
      ),
    );
  } else {
    const builder = FormBuilder.make({ title: 'Created Space' }).pipe(
      FormBuilder.set('key', space.key.truncate()),
      FormBuilder.set('name', space.properties.name ?? '<none>'),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
  }

  // Flush and sync before completion
  yield* Effect.tryPromise(() => space.db.flush({ indexes: true }));
  yield* waitForSync(space);
});

export const create = Command.make(
  'create',
  {
    name: Options.text('name').pipe(Options.withDescription('The name of the space.'), Options.optional),
  },
  handler,
).pipe(Command.withDescription('Create a new space.'));
