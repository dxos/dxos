//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { Effect, Option } from 'effect';

import { Filter, SpaceId } from '@dxos/client/echo';

import { ClientService } from '../../services';

const rawSpaceId = Options.text('spaceId').pipe(Options.withDescription('The space ID to query'));
const typename = Options.text('typename').pipe(Options.withDescription('The typename to query'));

export const query = Command.make('query', { rawSpaceId, typename }, ({ rawSpaceId, typename }) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    const spaceId = yield* SpaceId.isValid(rawSpaceId) ? Option.some(rawSpaceId) : Option.none();
    const space = yield* Option.fromNullable(client.spaces.get(spaceId));
    yield* Effect.tryPromise(() => space.waitUntilReady());
    const filter = typename?.length ? Filter.typename(typename) : Filter.nothing();
    // TODO(wittjosiah): Use DatabaseService?
    const { objects } = yield* Effect.tryPromise(() => space.db.query(filter).run());
    yield* Effect.log(JSON.stringify(objects, null, 2));
  }).pipe(Effect.catchTag('NoSuchElementException', () => Effect.logError('Space not found'))),
);
