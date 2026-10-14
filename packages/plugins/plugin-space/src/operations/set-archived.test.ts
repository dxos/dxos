//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { isArchived } from '@dxos/schema';

import { SpaceOperation } from '#types';

import SetArchivedHandler from './set-archived.ts';
import { TestArchivable, TestObject, makeTestLayer } from './testing.ts';

const TestLayer = makeTestLayer(SetArchivedHandler);

describe('SpaceOperation.SetArchived', () => {
  it.effect(
    'archives and unarchives an archivable object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const object = yield* Database.add(Obj.make(TestArchivable, { name: 'old' }));
        yield* Database.flush();

        yield* Operation.invoke(SpaceOperation.SetArchived, { objects: [object], archived: true });
        expect(isArchived(object)).toBe(true);

        yield* Operation.invoke(SpaceOperation.SetArchived, { objects: [object], archived: false });
        expect(isArchived(object)).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reports only the objects whose state changed, so undo leaves the rest alone',
    Effect.fnUntraced(
      function* ({ expect }) {
        const archived = yield* Database.add(Obj.make(TestArchivable, { name: 'archived' }));
        const active = yield* Database.add(Obj.make(TestArchivable, { name: 'active' }));
        yield* Database.flush();
        yield* Operation.invoke(SpaceOperation.SetArchived, { objects: [archived], archived: true });

        const { objects } = yield* Operation.invoke(SpaceOperation.SetArchived, {
          objects: [archived, active],
          archived: true,
        });
        expect(objects.map((object) => object.id)).toEqual([active.id]);

        // The undo mapping inverts with the reported objects only.
        yield* Operation.invoke(SpaceOperation.SetArchived, { objects, archived: false });
        expect(isArchived(archived)).toBe(true);
        expect(isArchived(active)).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'rejects a type that is not archivable and leaves the batch untouched',
    Effect.fnUntraced(
      function* ({ expect }) {
        const archivable = yield* Database.add(Obj.make(TestArchivable, { name: 'archivable' }));
        const plain = yield* Database.add(Obj.make(TestObject, { name: 'plain' }));
        yield* Database.flush();

        const exit = yield* Operation.invoke(SpaceOperation.SetArchived, {
          objects: [archivable, plain],
          archived: true,
        }).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
        expect(isArchived(archivable)).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
