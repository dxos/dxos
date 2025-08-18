//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Effect } from 'effect';

import { Filter } from '@dxos/client/echo';

import { getSpace } from '../../../util';
import { Common } from '../../options';

const spaceId = Common.spaceId;
const typename = Common.typename;

export const handler = Effect.fn(function* ({ spaceId, typename }: { spaceId: string; typename: string }) {
  const space = yield* getSpace(spaceId);
  yield* Effect.tryPromise(() => space.waitUntilReady());
  const filter = typename?.length ? Filter.typename(typename) : Filter.nothing();
  // TODO(wittjosiah): Use DatabaseService?
  const { objects } = yield* Effect.tryPromise(() => space.db.query(filter).run());
  yield* Effect.log(JSON.stringify(objects, null, 2));
});

export const query = Command.make(
  'query',
  {
    spaceId,
    typename,
  },
  handler,
).pipe(Command.withDescription('Query a space for objects.'));
