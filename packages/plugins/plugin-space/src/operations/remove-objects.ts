// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { getSpace } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Collection, Entity, Filter, Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { isNonNullable } from '@dxos/util';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.RemoveObjects> = SpaceOperation.RemoveObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      // Optional: a headless host (edge operation-service, `dx mcp serve`) has a capability manager
      // but contributes no layout, and removal must still unlink and delete there.
      const layout = yield* Capabilities.getAtomValueOption(AppCapabilities.Layout);
      invariant(
        (input.objects == null) !== (input.refs == null),
        'Pass exactly one of `objects` (held) or `refs` (referenced).',
      );
      // Loaded through the refs themselves rather than `Database.Service`: the app's call sites
      // invoke without a spaceId, so a declared service would fail to resolve for them.
      const entities =
        input.objects ?? (yield* Effect.forEach(input.refs ?? [], (ref) => Effect.promise(() => ref.load())));

      const space = getSpace(entities[0] as Obj.Unknown);
      invariant(
        space && entities.every((entity) => Entity.isEntity(entity) && getSpace(entity as Obj.Unknown) === space),
      );

      const parentCollection =
        input.target ??
        Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)?.target;
      invariant(parentCollection, 'No parent collection found for space — cannot remove objects.');

      // Type entities (persisted schemas) live outside collections — `findIndex` will
      // return -1 for them and the splice/active-tracking branches are skipped.
      const indices = entities.map((entity) =>
        Obj.instanceOf(Collection.Collection, parentCollection)
          ? parentCollection.objects.findIndex((ref) => ref.target === entity)
          : -1,
      );

      // `db.remove` cascades to objects owned via the ECHO parent edge, so those can have planks open
      // too — a project's chats are the live case. Collected before the removal, while the parent
      // edges still resolve; a plank left pointing at a removed object cannot be closed by the user.
      const descendantIds = yield* collectOwnedDescendantIds(entities);
      const wasActive = Option.match(layout, {
        onNone: () => [],
        onSome: (layout) =>
          [...entities.map((entity) => entity.id), ...descendantIds]
            .map((id) => layout.active.find((graphId) => graphId.endsWith(id)))
            .filter(isNonNullable),
      });

      for (const entity of entities) {
        if (Obj.instanceOf(Collection.Collection, parentCollection)) {
          const index = parentCollection.objects.findIndex((ref) => ref.target === entity);
          if (index !== -1) {
            Obj.update(parentCollection, (parentCollection) => {
              parentCollection.objects.splice(index, 1);
            });
          }
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

/**
 * Ids of every object owned (transitively, by the ECHO parent edge) by one of `entities` — i.e. what
 * `db.remove` will cascade to. Must run before the removal, while the parent edges still resolve.
 * Ownership nests arbitrarily deep, so the walk runs to exhaustion rather than to a depth cap; the
 * visited set (seeded with the roots, so a parent edge looping back cannot re-enqueue one) is what
 * bounds it on cyclic data.
 */
const collectOwnedDescendantIds = Effect.fnUntraced(function* (entities: readonly unknown[]) {
  const roots: Obj.Unknown[] = entities.filter(Obj.isObject);
  const visited = new Set(roots.map((object) => object.id));
  const descendants = new Set<string>();
  let frontier = roots;
  while (frontier.length > 0) {
    const next: Obj.Unknown[] = [];
    for (const object of frontier) {
      const db = Obj.getDatabase(object);
      if (!db) {
        continue;
      }

      const children = yield* Effect.promise(() => db.query(Query.select(Filter.id(object.id)).children()).run());
      for (const child of children) {
        if (Obj.isObject(child) && !visited.has(child.id)) {
          visited.add(child.id);
          descendants.add(child.id);
          next.push(child);
        }
      }
    }
    frontier = next;
  }

  return [...descendants];
});
