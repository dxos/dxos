//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { Filter } from '@dxos/client/echo';

import { getSpace } from '../../../util';
import { Common } from '../../options';

export const handler = Effect.fn(function* ({ spaceId, typename }: { spaceId: string; typename: string }) {
  const space = yield* getSpace(spaceId);
  yield* Effect.tryPromise(() => space.waitUntilReady());
  const filter = typename?.length ? Filter.typename(typename) : Filter.nothing();
  // TODO(wittjosiah): Use DatabaseService?
  const objects = yield* Effect.tryPromise(() => space.db.query(filter).run());
  yield* Console.log(JSON.stringify(objects, null, 2));
});

export const query = Command.make(
  'query',
  {
    spaceId: Common.spaceId,
    typename: Options.text('typename').pipe(Options.withDescription('The typename to query.')),
  },
  handler,
).pipe(Command.withDescription('Query objects.'));
