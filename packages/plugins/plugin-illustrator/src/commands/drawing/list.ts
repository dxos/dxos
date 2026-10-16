//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';
import * as Options from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, Common, FormBuilder, printList, spaceLayer } from '@dxos/cli-util';
import { Database, Filter } from '@dxos/echo';

import { Drawing } from '#types';

export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const drawings = yield* Database.query(Filter.type(Drawing.Drawing)).run;

  if (json) {
    yield* Console.log(
      JSON.stringify(
        drawings.map(({ id, name }) => ({ id, name })),
        null,
        2,
      ),
    );
  } else {
    yield* Console.log(
      printList(
        drawings.map((drawing) =>
          FormBuilder.make({ title: drawing.name ?? 'Untitled' }).pipe(
            FormBuilder.set('id', drawing.id),
            FormBuilder.build,
          ),
        ),
      ),
    );
  }
});

export const list = Command.make('list', { spaceId: Common.spaceId.pipe(Options.optional) }, handler).pipe(
  Command.withDescription('List the drawings in a space.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
