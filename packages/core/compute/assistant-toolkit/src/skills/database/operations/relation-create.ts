//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity, Filter, Query, Relation, Scope, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { RelationCreate } from './definitions';

export default RelationCreate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ typename, source, target, properties }) {
      const { db } = yield* Database.Service;
      const types = yield* Database.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()))
        .run;
      const foundSchema = types.find((t) => Type.getTypename(t) === typename);
      invariant(foundSchema, `Schema not found: ${typename}`);
      invariant(Type.isRelation(foundSchema), 'Schema is not a relation schema');
      const schema = foundSchema;

      const sourceObj = yield* Database.load(source);
      const targetObj = yield* Database.load(target);
      const relation = db.add(
        Relation.make(schema, {
          [Relation.Source]: sourceObj,
          [Relation.Target]: targetObj,
          ...properties,
        }),
      );
      return Entity.toJSON(relation);
    }),
  ),
);
