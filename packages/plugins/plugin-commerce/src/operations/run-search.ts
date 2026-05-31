//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { SearchOperation } from '../types';

const handler: Operation.WithHandler<typeof SearchOperation.RunSearch> = SearchOperation.RunSearch.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ search: searchRef }) {
      const { db } = yield* Database.Service;
      const search = yield* Database.load(searchRef);

      for (const providerRef of search.providers) {
        // Thread the spaceId so the child operation's spawn environment can resolve Database.Service.
        // Each provider run appends newly-seen results to the search's feed (accumulating).
        yield* Operation.invoke(
          SearchOperation.RunProviderSearch,
          { search: searchRef, provider: providerRef },
          { spaceId: db.spaceId },
        ).pipe(Effect.catchAll(() => Effect.succeed(0)));
      }

      Obj.update(search, (search) => {
        search.lastRunAt = new Date().toISOString();
      });
    }),
  ),
);

export default handler;
