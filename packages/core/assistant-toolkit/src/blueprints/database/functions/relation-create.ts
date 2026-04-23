//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity, Relation, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { RelationCreate } from './definitions';

export default RelationCreate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ typename, source, target, properties }) {
      const { db } = yield* Database.Service;
      const schema = yield* Effect.promise(() =>
        db.schemaRegistry.query({ typename, location: ['database', 'runtime'] }).first(),
      );
      invariant(Type.isRelationSchema(schema), 'Schema is not a relation schema');

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
