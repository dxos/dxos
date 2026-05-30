//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { Result, SearchOperation } from '../types';

const handler: Operation.WithHandler<typeof SearchOperation.RunSearch> = SearchOperation.RunSearch.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ search: searchRef }) {
      const { db } = yield* Database.Service;
      const search = yield* Database.load(searchRef);

      const collected: Ref.Ref<Result.Result>[] = [];
      for (const providerRef of search.providers) {
        // Thread the spaceId so the child operation's spawn environment can resolve Database.Service.
        const results = yield* Operation.invoke(
          SearchOperation.RunProviderSearch,
          { search: searchRef, provider: providerRef },
          { spaceId: db.spaceId },
        ).pipe(Effect.catchAll(() => Effect.succeed<Ref.Ref<Result.Result>[]>([])));
        collected.push(...results);
      }

      // Replace prior results so each run reflects the current criteria (rather than accumulating).
      Obj.update(search, (search) => {
        search.results = collected;
        search.lastRunAt = new Date().toISOString();
      });
    }),
  ),
);

export default handler;
