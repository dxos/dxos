//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig, Common, printList, spaceLayer } from '@dxos/cli-util';
import { Database, Filter } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { printObject } from '../util.ts';

export const handler = ({ typename }: { typename: Option.Option<string> }) =>
  Effect.gen(function* () {
    const { json } = yield* CommandConfig;
    const filter = Option.match(typename, {
      onNone: () => Filter.everything(),
      onSome: (typename) => Filter.type(DXN.make(typename)),
    });
    const objects = yield* Database.query(filter).run;

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
    typename: Options.string('typename').pipe(Options.optional, Options.withDescription('The typename to query.')),
  },
  handler,
).pipe(
  Command.withDescription('Query objects.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
