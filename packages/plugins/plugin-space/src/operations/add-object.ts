// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import {
  CollectionModel,
  getCollectionsPath,
  getObjectPath,
  getTypePath,
  getTypeSlug,
  getTypeSlugFromUri,
} from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Collection, Database, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ObservabilityOperation } from '@dxos/plugin-observability';
import { ViewAnnotation, getTypeURIFromQuery } from '@dxos/schema';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.AddObject> = SpaceOperation.AddObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const target = input.target as any;
      const object = input.object as Obj.Unknown;
      const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
      invariant(db, 'Database not found.');
      // #region agent log
      fetch('http://127.0.0.1:7573/ingest/be433d03-95c9-4e1b-8101-7c98f0669cc0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'cf2e73' },
        body: JSON.stringify({
          sessionId: 'cf2e73',
          location: 'add-object.ts:handler',
          message: 'AddObject start',
          data: {
            objectId: object.id,
            typename: Obj.getTypename(object),
            hidden: input.hidden,
          },
          timestamp: Date.now(),
          hypothesisId: 'H,I',
        }),
      }).catch(() => {});
      // #endregion

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
      const typeSlug = objectType ? getTypeSlug(objectType) : typename;
      const subject = getSubjectPathForNewObject({
        spaceId: db.spaceId,
        objectId: object.id,
        nodeId: input.targetNodeId,
        typename,
        typeSlug,
        viewTargetSlug: viewTargetUri ? getTypeSlugFromUri(viewTargetUri) : undefined,
      });

      const result = {
        id: Obj.getURI(object),
        subject: [subject],
        object,
      };
      // #region agent log
      fetch('http://127.0.0.1:7573/ingest/be433d03-95c9-4e1b-8101-7c98f0669cc0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'cf2e73' },
        body: JSON.stringify({
          sessionId: 'cf2e73',
          location: 'add-object.ts:handler',
          message: 'AddObject success',
          data: {
            objectId: object.id,
            typename: Obj.getTypename(object),
            subject,
          },
          timestamp: Date.now(),
          hypothesisId: 'H,I',
        }),
      }).catch(() => {});
      // #endregion
      return result;
    }),
  ),
);
export default handler;

const getSubjectPathForNewObject = (props: {
  spaceId: string;
  objectId: string;
  nodeId?: string;
  typename: string;
  /** Slug of the object's own type ({@link getTypeSlug}) — keys the `types/<slug>` node it files under. */
  typeSlug: string;
  /** Slug of the view holder's target type, when the object is a view holder. */
  viewTargetSlug?: string;
}): string => {
  const { nodeId, typename, typeSlug, viewTargetSlug, spaceId, objectId } = props;
  if (typeof nodeId === 'string') {
    return `${nodeId}/${objectId}`;
  }
  if (typename === Type.getTypename(Collection.Collection)) {
    return getCollectionsPath(spaceId, objectId);
  }
  if (viewTargetSlug) {
    return getTypePath(spaceId, viewTargetSlug, objectId);
  }
  return getObjectPath(spaceId, typeSlug, objectId);
};
