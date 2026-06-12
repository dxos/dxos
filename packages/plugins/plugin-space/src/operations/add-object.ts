// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CollectionModel, getCollectionsPath, getObjectPath, getTypePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Collection, Database, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ObservabilityOperation } from '@dxos/plugin-observability';
import { ViewAnnotation, getTypeTag, getTypenameFromQuery } from '@dxos/schema';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.AddObject> = SpaceOperation.AddObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const target = input.target as any;
      const object = input.object as Obj.Unknown;
      const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
      invariant(db, 'Database not found.');

      yield* CollectionModel.add({
        object,
        target: Database.isDatabase(target) ? undefined : target,
        hidden: input.hidden,
      }).pipe(Effect.provide(Database.layer(db)));

      const typename = Obj.getTypename(object)!;
      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'space.object.add',
        properties: {
          spaceId: db.spaceId,
          objectId: object.id,
          typename: Obj.getTypename(object),
        },
      });

      const types = yield* Effect.promise(() =>
        db.query(Query.select(Filter.type(Type.Type)).from(Scope.registry())).run(),
      );
      const [runtimeSchema] = types.filter((t) => !Type.isTypeKind(t) && Type.getTypename(t) === typename);
      const echoViewPath =
        runtimeSchema !== undefined
          ? ViewAnnotation.get(Type.getSchema(runtimeSchema)).pipe(Option.getOrElse(() => []))
          : [];
      const view = echoViewPath.length > 0 ? yield* ViewAnnotation.tryLoadAtPath(object, echoViewPath) : undefined;
      const viewTargetTypename = view ? getTypenameFromQuery(view.query.ast) : undefined;
      // A view holder filed under a target type its view query can't resolve would be invisible in
      // the navigation tree. Fail loudly rather than silently dropping it under its own typename.
      invariant(
        !view || (viewTargetTypename != null && viewTargetTypename.length > 0),
        `View object ${typename} (${object.id}) has no resolvable target type — its view query must filter by a known type.`,
      );
      // Stored (database) types are keyed by entity id in the graph, so resolve the object's own
      // type tag rather than filing it under its (human) typename.
      const objectType = Obj.getType(object);
      const typeTag = objectType ? getTypeTag(objectType) : typename;
      const subject = getSubjectPathForNewObject({
        spaceId: db.spaceId,
        objectId: object.id,
        nodeId: input.targetNodeId,
        typename,
        typeTag,
        viewTargetTypename,
      });

      return {
        id: Obj.getURI(object),
        subject: [subject],
        object,
      };
    }),
  ),
);
export default handler;

const getSubjectPathForNewObject = (props: {
  spaceId: string;
  objectId: string;
  nodeId?: string;
  typename: string;
  /** Tag of the object's own type ({@link getTypeTag}) — keys the `types/<tag>` node it files under. */
  typeTag: string;
  viewTargetTypename?: string;
}): string => {
  const { nodeId, typename, typeTag, viewTargetTypename, spaceId, objectId } = props;
  if (typeof nodeId === 'string') {
    return `${nodeId}/${objectId}`;
  }
  if (typename === Type.getTypename(Collection.Collection)) {
    return getCollectionsPath(spaceId, objectId);
  }
  if (viewTargetTypename) {
    return getTypePath(spaceId, viewTargetTypename, objectId);
  }
  return getObjectPath(spaceId, typeTag, objectId);
};
