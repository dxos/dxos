// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Collection, Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { isNonNullable } from '@dxos/util';

import { getNestedObjects } from '../util';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.RemoveObjects> = SpaceOperation.RemoveObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const capabilityManager = yield* Capability.Service;
      const resolve = (typename: string) =>
        capabilityManager.getAll(AppCapabilities.Metadata).find(({ id }: { id: string }) => id === typename)
          ?.metadata ?? {};

      const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
      const objects = input.objects as Obj.Unknown[];

      const space = getSpace(objects[0]);
      invariant(space && objects.every((obj) => Obj.isObject(obj) && getSpace(obj) === space));

      const parentCollection: Collection.Collection =
        input.target ?? space.properties[Collection.Collection.typename]?.target;

      const nestedObjectsList = yield* Effect.promise(() =>
        Promise.all(objects.map((obj) => getNestedObjects(obj, resolve))),
      );

      const indices = objects.map((obj) =>
        Obj.instanceOf(Collection.Collection, parentCollection)
          ? parentCollection.objects.findIndex((ref) => ref.target === obj)
          : -1,
      );

      const wasActive = objects
        .flatMap((obj, i) => [obj, ...nestedObjectsList[i]])
        .filter(Obj.isObject)
        .map((object) => layout.active.find((graphId) => graphId.endsWith(object.id)))
        .filter(isNonNullable);

      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const nestedObjects = nestedObjectsList[i];

        const index = parentCollection.objects.findIndex((ref) => ref.target === obj);
        if (index !== -1) {
          Obj.change(parentCollection, (c) => {
            c.objects.splice(index, 1);
          });
        }

        for (const nestedObject of nestedObjects) {
          if (Obj.isObject(nestedObject)) {
            Obj.getDatabase(nestedObject)?.remove(nestedObject);
          } else if (Relation.isRelation(nestedObject)) {
            const db = Obj.getDatabase(Relation.getSource(nestedObject));
            db?.remove(nestedObject);
          }
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
        nestedObjectsList,
        wasActive,
      };
    }),
  ),
);
export default handler;
