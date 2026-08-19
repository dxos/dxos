// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as CollectionModel from '@dxos/app-toolkit/CollectionModel';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
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
      // The declared service is the fallback; a target that names a database wins, since the caller
      // said where to file.
      const { db: ambientDb } = yield* Database.Service;
      const db = (target ? (Database.isDatabase(target) ? target : Obj.getDatabase(target)) : undefined) ?? ambientDb;
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

      return {
        id: Obj.getURI(object),
        object,
      };
    }),
  ),
);
export default handler;

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
