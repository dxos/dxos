//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Entity, Relation, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/relation-create',
  name: 'Create relation',
  description: trim`
    Creates a new relation and adds it to the current space.
    Get the schema from the schema-list tool and ensure that the data matches the corresponding schema.
  `,
  inputSchema: Schema.Struct({
    typename: Schema.String,
    source: Type.Ref(Type.Obj),
    target: Type.Ref(Type.Obj),
    properties: Schema.Any.annotations({
      description: 'The data to be stored in the relation.',
    }),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { typename, source, target, properties } }) {
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
});
