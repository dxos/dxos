//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Relation, Scope, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.AddRelation> = SpaceOperation.AddRelation.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      invariant(
        (input.schema == null) !== (input.typename == null),
        'Pass exactly one of `schema` (instantiated) or `typename` (named).',
      );

      const source = yield* resolveEnd(input.source);
      const target = yield* resolveEnd(input.target);
      // Without an explicit database the source object names it, and only the ambient context is
      // left for a caller that passed references alone.
      const ambient = yield* Effect.serviceOption(Database.Service);
      const db = input.db ?? Obj.getDatabase(source) ?? Option.getOrUndefined(ambient)?.db;
      invariant(db, 'Database not found.');

      const schema = input.schema ?? (yield* resolveRelationType(db, input.typename));
      const relation = db.add(
        Relation.make(schema, {
          [Relation.Source]: source,
          [Relation.Target]: target,
          ...input.fields,
        }),
      );

      return { relation };
    }),
  ),
);

export default handler;

// Resolved through the ref itself rather than `Database.Service`: the app's call sites invoke with
// no spaceId, so a declared service would die before the handler runs.
const resolveEnd = Effect.fnUntraced(function* (end: Obj.Unknown | Ref.Ref<Obj.Unknown>) {
  return Ref.isRef(end) ? ((yield* Effect.promise(() => end.load())) as Obj.Unknown) : end;
});

/** Resolves a relation typename against the types registered for the space. */
const resolveRelationType = Effect.fnUntraced(function* (db: Database.Database, typename: string | undefined) {
  invariant(typename, 'Pass a `typename` when no `schema` is given.');
  const types = yield* Effect.promise(() =>
    db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).run(),
  );
  const schema = types.find((type) => Type.getTypename(type) === typename);
  invariant(schema, `Schema not found: ${typename}`);
  invariant(Type.isRelation(schema), `Not a relation schema: ${typename}`);
  return schema;
});
