// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Collection, Entity, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { isNonNullable } from '@dxos/util';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.RemoveObjects> = SpaceOperation.RemoveObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
      const entities = input.objects;

      const space = getSpace(entities[0] as Obj.Unknown);
      invariant(
        space && entities.every((entity) => Entity.isEntity(entity) && getSpace(entity as Obj.Unknown) === space),
      );

      const parentCollection: Collection.Collection =
        input.target ?? space.properties[Type.getTypename(Collection.Collection)]?.target;

      // Type entities (persisted schemas) live outside collections — `findIndex` will
      // return -1 for them and the splice/active-tracking branches are skipped.
      const indices = entities.map((entity) =>
        Obj.instanceOf(Collection.Collection, parentCollection)
          ? parentCollection.objects.findIndex((ref) => ref.target === entity)
          : -1,
      );

      const wasActive = entities
        .map((entity) => layout.active.find((graphId) => graphId.endsWith(entity.id)))
        .filter(isNonNullable);

      for (const entity of entities) {
        const index = parentCollection.objects.findIndex((ref) => ref.target === entity);
        if (index !== -1) {
          Obj.update(parentCollection, (parentCollection) => {
            parentCollection.objects.splice(index, 1);
          });
        }

        const db = Entity.getDatabase(entity);
        db?.remove(entity);
      }

      if (wasActive.length > 0) {
        yield* Operation.invoke(LayoutOperation.Close, { subject: wasActive });
      }

      return {
        objects: entities,
        parentCollection,
        indices,
        wasActive,
      };
    }),
  ),
);
export default handler;
