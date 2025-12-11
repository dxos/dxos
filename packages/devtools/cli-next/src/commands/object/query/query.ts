//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { Database, Filter } from '@dxos/echo';

import { spaceLayer } from '../../../util';
import { Common } from '../../options';

export const handler = ({ typename }: { typename: string }) =>
  Effect.gen(function* () {
    const filter = typename?.length ? Filter.typename(typename) : Filter.nothing();
    const objects = yield* Database.Service.runQuery(filter);
    yield* Console.log(JSON.stringify(objects, null, 2));
  });

export const query = Command.make(
  'query',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    typename: Options.text('typename').pipe(Options.withDescription('The typename to query.')),
  },
  handler,
).pipe(
  Command.withDescription('Query objects.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
