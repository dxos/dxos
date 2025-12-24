//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig, Common, printList, spaceLayer } from '@dxos/cli-util';
import { Database, Filter } from '@dxos/echo';

import { printObject } from '../util';

export const handler = ({ typename }: { typename: Option.Option<string> }) =>
  Effect.gen(function* () {
    const { json } = yield* CommandConfig;
    const filter = Option.match(typename, {
      onNone: () => Filter.everything(),
      onSome: (typename) => Filter.typename(typename),
    });
    const objects = yield* Database.Service.runQuery(filter);

    if (json) {
      yield* Console.log(JSON.stringify(objects, null, 2));
    } else {
      // TODO(wittjosiah): Interactive table of results.
      const formatted = objects.map(printObject);
      yield* Console.log(printList(formatted));
    }
  });

export const query = Command.make(
  'query',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    typename: Options.text('typename').pipe(Options.optional, Options.withDescription('The typename to query.')),
  },
  handler,
).pipe(
  Command.withDescription('Query objects.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
