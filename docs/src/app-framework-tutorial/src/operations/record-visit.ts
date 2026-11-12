//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';

import { RecordVisit } from '../types/BookmarkOperation.ts';

// #region handler
const handler: Operation.WithHandler<typeof RecordVisit> = RecordVisit.pipe(
  Operation.withHandler(({ bookmark }) =>
    Effect.gen(function* () {
      Obj.update(bookmark, (bookmark) => {
        bookmark.visits = (bookmark.visits ?? 0) + 1;
      });
      return { visits: bookmark.visits };
    }),
  ),
);

export default handler;
// #endregion
