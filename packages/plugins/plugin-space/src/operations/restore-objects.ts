// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Collection, type Entity, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.RestoreObjects> = SpaceOperation.RestoreObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const entities = input.objects;
      const parentCollection = input.parentCollection as Collection.Collection;
      const indices = input.indices as number[];
      const wasActive = input.wasActive as string[];

      const db = Obj.getDatabase(entities[0] as Obj.Unknown);
      invariant(db);

      const restored = entities.map((entity: Entity.Unknown) => db.add(entity));

      Obj.update(parentCollection, (parentCollection) => {
        indices.forEach((index: number, i: number) => {
          if (index !== -1) {
            // Persisted Type entities are not held by collections, so their indices are -1 above
            // and never reach this branch — the cast is safe for the remaining Obj entries.
            parentCollection.objects.splice(index, 0, Ref.make(restored[i] as Obj.Unknown));
          }
        });
      });

      if (wasActive.length > 0) {
        yield* Operation.invoke(LayoutOperation.Open, { subject: wasActive });
      }
    }),
  ),
);
export default handler;
