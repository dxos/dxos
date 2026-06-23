// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities } from '@dxos/app-framework';
import { AppAnnotation, AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Annotation, Collection, Entity, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

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

      const parentCollection =
        input.target ??
        Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)?.target;
      invariant(parentCollection, 'No parent collection found for space — cannot remove objects.');

      // Track only entities that are actually removed — parented objects are skipped because
      // they must be removed via their parent so ownership and collection membership stay consistent.
      const removedEntities: Entity.Unknown[] = [];
      const indices: number[] = [];
      const wasActive: string[] = [];

      for (const entity of entities) {
        if (Obj.getParent(entity as Obj.Unknown)) {
          continue;
        }

        const activeGraphId = layout.active.find((graphId) => graphId.endsWith(entity.id));
        if (activeGraphId) {
          wasActive.push(activeGraphId);
        }

        if (Obj.instanceOf(Collection.Collection, parentCollection)) {
          const index = parentCollection.objects.findIndex((ref) => ref.target === entity);
          indices.push(index);
          if (index !== -1) {
            Obj.update(parentCollection, (parentCollection) => {
              parentCollection.objects.splice(index, 1);
            });
          }
        } else {
          // Type entities (persisted schemas) live outside collections.
          indices.push(-1);
        }

        const db = Entity.getDatabase(entity);
        db?.remove(entity);
        removedEntities.push(entity);
      }

      if (wasActive.length > 0) {
        yield* Operation.invoke(LayoutOperation.Close, { subject: wasActive });
      }

      return {
        objects: removedEntities,
        parentCollection,
        indices,
        wasActive,
      };
    }),
  ),
);
export default handler;
