//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';

import { Bookmark, BookmarkOperation } from '#types';

const handler: Operation.WithHandler<typeof BookmarkOperation.AddFromSnapshot> = BookmarkOperation.AddFromSnapshot.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ snapshot, target }) {
      const bookmark = Bookmark.fromSnapshot(snapshot);
      const { id } = yield* Operation.invoke(SpaceOperation.AddObject, { object: bookmark, target });
      return { id };
    }),
  ),
);

export default handler;
