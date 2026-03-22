// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { getCollectionsPath, getObjectPath, getTypePath } from '@dxos/app-toolkit';
import { Database, Obj, View } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';
import { Collection } from '@dxos/echo';
import { CollectionModel, ViewAnnotation, getTypenameFromQuery } from '@dxos/schema';

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

      const [schema] = db.schemaRegistry.query({ typename, location: ['runtime'] }).runSync();
      const isViewSchema = schema !== undefined && ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false));
      const view = isViewSchema
        ? yield* Effect.promise(() => (object as Obj.Any).view.load() as Promise<View.View>)
        : undefined;
      const viewTargetTypename = view ? getTypenameFromQuery(view.query.ast) : undefined;
      const subject = getSubjectPathForNewObject({
        spaceId: db.spaceId,
        objectId: object.id,
        nodeId: input.targetNodeId,
        typename,
        viewTargetTypename,
      });

      return {
        id: Obj.getDXN(object).toString(),
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
  viewTargetTypename?: string;
}): string => {
  const { nodeId, typename, viewTargetTypename, spaceId, objectId } = props;
  if (typeof nodeId === 'string') {
    return `${nodeId}/${objectId}`;
  }
  if (typename === Collection.Collection.typename) {
    return getCollectionsPath(spaceId, objectId);
  }
  if (viewTargetTypename) {
    return getTypePath(spaceId, viewTargetTypename, objectId);
  }
  return getObjectPath(spaceId, typename, objectId);
};
