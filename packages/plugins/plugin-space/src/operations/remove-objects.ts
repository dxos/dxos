// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Collection, Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { isNonNullable } from '@dxos/util';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.RemoveObjects> = SpaceOperation.RemoveObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
      const objects = input.objects as Obj.Unknown[];

      const space = getSpace(objects[0]);
      invariant(space && objects.every((obj) => Obj.isObject(obj) && getSpace(obj) === space));

      const parentCollection: Collection.Collection =
        input.target ?? space.properties[Collection.Collection.typename]?.target;

      const indices = objects.map((obj) =>
        Obj.instanceOf(Collection.Collection, parentCollection)
          ? parentCollection.objects.findIndex((ref) => ref.target === obj)
          : -1,
      );

      const wasActive = objects
        .filter(Obj.isObject)
        .map((object) => layout.active.find((graphId) => graphId.endsWith(object.id)))
        .filter(isNonNullable);

      for (const obj of objects) {
        const index = parentCollection.objects.findIndex((ref) => ref.target === obj);
        if (index !== -1) {
          Obj.update(parentCollection, (parentCollection) => {
            parentCollection.objects.splice(index, 1);
          });
        }

        const db = Obj.getDatabase(obj);
        db?.remove(obj);
      }

      if (wasActive.length > 0) {
        yield* Operation.invoke(LayoutOperation.Close, { subject: wasActive });
      }

      return {
        objects,
        parentCollection,
        indices,
        nestedObjectsList: objects.map(() => []),
        wasActive,
      };
    }),
  ),
);
export default handler;
