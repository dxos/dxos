// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as CollectionModel from '@dxos/app-toolkit/CollectionModel';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import { ViewAnnotation, getTypeURIFromQuery } from '@dxos/schema';
import { deepMapValues } from '@dxos/util';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.AddObject> = SpaceOperation.AddObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      invariant(
        (input.object == null) !== (input.create == null),
        'Pass exactly one of `object` (instantiated) or `create` (described).',
      );

      // A remote caller can only name the target collection by reference; resolve it through the
      // ref itself rather than `Database.Service`, which the app's call sites give no space to.
      const targetRef = Ref.isRef(input.target) ? input.target : undefined;
      const target = (targetRef ? yield* Effect.promise(() => targetRef.load()) : input.target) as any;
      // Without a target the database has to come from the ambient context — read optionally, so
      // declaring the service (which the app's spaceId-less call sites cannot resolve) is not needed.
      const ambient = yield* Effect.serviceOption(Database.Service);
      const db = target
        ? Database.isDatabase(target)
          ? target
          : Obj.getDatabase(target)
        : Option.getOrUndefined(ambient)?.db;
      invariant(db, 'Database not found.');

      let object: Obj.Unknown;
      if (input.object != null) {
        object = input.object;
      } else {
        invariant(input.create, 'Pass exactly one of `object` or `create`.');
        object = yield* instantiate(db, input.create);
      }

      yield* CollectionModel.add({
        object,
        target: Database.isDatabase(target) ? undefined : target,
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
      const viewTargetUri = view ? getTypeURIFromQuery(view.query.ast) : undefined;
      // A view holder filed under a target type its view query can't resolve would be invisible in
      // the navigation tree. Fail loudly rather than silently dropping it under its own typename.
      invariant(
        !view || viewTargetUri != null,
        `View object ${typename} (${object.id}) has no resolvable target type — its view query must filter by a known type.`,
      );
      // Graph type nodes are keyed by a slash-free slug (entity id for stored types, typename for
      // static); resolve the object's own type slug rather than filing it under its (human) typename.
      const objectType = Obj.getType(object);
      const typeSlug = objectType ? GraphPath.getTypeSlug(objectType) : typename;
      const subject = getSubjectPathForNewObject({
        spaceId: db.spaceId,
        objectId: object.id,
        nodeId: input.targetNodeId,
        object,
        typename,
        typeSlug,
        viewTargetSlug: viewTargetUri ? GraphPath.getTypeSlugFromUri(viewTargetUri) : undefined,
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
  object: Obj.Unknown;
  typename: string;
  /** Slug of the object's own type ({@link getTypeSlug}) — keys the `types/<slug>` node it files under. */
  typeSlug: string;
  /** Slug of the view holder's target type, when the object is a view holder. */
  viewTargetSlug?: string;
}): string => {
  const { nodeId, object, typeSlug, viewTargetSlug, spaceId, objectId } = props;
  if (typeof nodeId === 'string') {
    return GraphPath.getCollectionObjectPath(nodeId, objectId);
  }
  if (AppNode.isCollectionItem(object)) {
    return GraphPath.getCollectionsPath(spaceId, objectId);
  }
  if (viewTargetSlug) {
    return GraphPath.getTypePath(spaceId, viewTargetSlug, objectId);
  }
  return GraphPath.getObjectPath(spaceId, typeSlug, objectId);
};

/**
 * Instantiates a described object against the types registered for the space.
 *
 * The path for a caller that cannot hold a live object: the typename is resolved through the same
 * registry `queryObjects` reports, so a draft can only name a type the space actually knows.
 */
const instantiate = Effect.fnUntraced(function* (db: Database.Database, draft: SpaceOperation.ObjectDraft) {
  const { '@type': typename, ...properties } = draft;
  const types = yield* Effect.promise(() =>
    db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).run(),
  );
  const schema = types.find((type) => Type.getTypename(type) === typename);
  invariant(schema, `Schema not found: ${typename}`);
  invariant(Type.isObject(schema), `Schema is not an object schema: ${typename}`);
  return Obj.make(
    schema,
    deepMapValues(properties, (value, recurse) =>
      // References arrive as envelopes; a detached object cannot carry a live `Ref`.
      EncodedReference.isEncodedReference(value) ? db.makeRef(EncodedReference.toURI(value)) : recurse(value),
    ),
  );
});
