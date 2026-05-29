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
      const search = yield* Database.load(searchRef);
      Obj.update(search, (search) => {
        search.status = 'running';
      });

      const collected: Ref.Ref<Result.Result>[] = [];
      for (const providerRef of search.providers) {
        const results = yield* Operation.invoke(SearchOperation.RunProviderSearch, {
          search: searchRef,
          provider: providerRef,
        }).pipe(Effect.catchAll(() => Effect.succeed<Ref.Ref<Result.Result>[]>([])));
        collected.push(...results);
      }

      Obj.update(search, (search) => {
        search.results = [...search.results, ...collected];
        search.status = 'idle';
        search.lastRunAt = new Date().toISOString();
      });
    }),
  ),
);

export default handler;
