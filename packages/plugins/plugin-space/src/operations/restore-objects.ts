// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Collection, Obj, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';

export default SpaceOperation.RestoreObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const objects = input.objects as Obj.Unknown[];
      const parentCollection = input.parentCollection as Collection.Collection;
      const indices = input.indices as number[];
      const nestedObjectsList = input.nestedObjectsList as Obj.Unknown[][];
      const wasActive = input.wasActive as string[];

      const space = getSpace(objects[0]);
      invariant(space);

      const restoredObjects = objects.map((obj: Obj.Unknown) => space.db.add(obj));

      nestedObjectsList.flat().forEach((obj: Obj.Unknown) => {
        if (Obj.isObject(obj)) {
          space.db.add(obj);
        } else if (Relation.isRelation(obj)) {
          space.db.add(obj);
        }
      });

      Obj.change(parentCollection, (c) => {
        indices.forEach((index: number, i: number) => {
          if (index !== -1) {
            c.objects.splice(index, 0, Ref.make(restoredObjects[i] as Obj.Unknown));
          }
        });
      });

      if (wasActive.length > 0) {
        yield* Operation.invoke(LayoutOperation.Open, { subject: wasActive });
      }
    }),
  ),
);
