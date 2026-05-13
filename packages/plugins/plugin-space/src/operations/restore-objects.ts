// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Collection, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.RestoreObjects> = SpaceOperation.RestoreObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const objects = input.objects as Obj.Unknown[];
      const parentCollection = input.parentCollection as Collection.Collection;
      const indices = input.indices as number[];
      const wasActive = input.wasActive as string[];

      const db = Obj.getDatabase(objects[0]);
      invariant(db);

      const restoredObjects = objects.map((obj: Obj.Unknown) => db.add(obj));

      Obj.update(parentCollection, (parentCollection) => {
        indices.forEach((index: number, i: number) => {
          if (index !== -1) {
            parentCollection.objects.splice(index, 0, Ref.make(restoredObjects[i] as Obj.Unknown));
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
