// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { BaseError, messageOf } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { deepMapValues } from '@dxos/util';

import { SpaceOperation } from '#types';

import { SpaceOperationError } from './errors.ts';

/** The caller's draft did not match the named schema, or the schema was not found. */
export class InvalidDraftError extends BaseError.extend('InvalidDraftError', 'Invalid draft.') {}

const handler: Operation.WithHandler<typeof SpaceOperation.AddObject> = SpaceOperation.AddObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      // A remote caller can only name the target collection by reference, so resolve it here;
      // in-process callers pass the live collection.
      const targetInput = input.target;
      const target = Ref.isRef(targetInput) ? yield* Effect.promise(() => targetInput.load()) : targetInput;
      // The database is the runtime's, resolved from the invocation's space id — never an input,
      // so there is no second database to reconcile against and no service to override.
      const { db } = yield* Database.Service;
      invariant(db, 'Database not found.');
      // The space id names the database, so the target has to live in it.
      if (target && Obj.getDatabase(target)?.spaceId !== db.spaceId) {
        return yield* Effect.fail(
          new SpaceOperationError({ message: `Target collection does not belong to space ${db.spaceId}.` }),
        );
      }

      // The union's two branches: a live entity passes through, a description is instantiated.
      const object = Obj.isObject(input.object) ? input.object : yield* instantiate(db, input.object);

      // An instantiated draft is detached, and the branch of `ContainerModel.add` that files into
      // a collection only pushes a ref — so without this the object is never persisted and that
      // ref dangles. A live entity arrives already in a database.
      if (!Obj.getDatabase(object)) {
        yield* Database.add(object);
      }
      yield* ContainerModel.add({ object, target });

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
  if (!schema) {
    return yield* Effect.fail(new InvalidDraftError({ message: `Schema not found: ${typename}` }));
  }
  if (!Type.isObject(schema)) {
    return yield* Effect.fail(new InvalidDraftError({ message: `Schema is not an object schema: ${typename}` }));
  }
  // A draft is caller input, so a validation throw is a failure with the message the caller needs,
  // not a defect that reaches a remote host as an opaque server error.
  return yield* Effect.try({
    try: () =>
      Obj.make(
        schema,
        deepMapValues(properties, (value, recurse) =>
          // References arrive as envelopes; a detached object cannot carry a live `Ref`.
          EncodedReference.isEncodedReference(value) ? db.makeRef(EncodedReference.toURI(value)) : recurse(value),
        ),
      ),
    catch: (error) =>
      new InvalidDraftError({ message: `Invalid draft for ${typename}: ${messageOf(error)}`, cause: error }),
  });
});
