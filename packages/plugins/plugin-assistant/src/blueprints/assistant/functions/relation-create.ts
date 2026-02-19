//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { DXN, Database, Entity, Relation, Type } from '@dxos/echo';
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
    source: ArtifactId.annotations({
      description: 'The ID of the source object.',
    }),
    target: ArtifactId.annotations({
      description: 'The ID of the target object.',
    }),
    data: Schema.Any.annotations({
      description: 'The data to be stored in the relation.',
    }),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { typename, source, target, data } }) {
    const { db } = yield* Database.Service;
    const schema = yield* Effect.promise(() =>
      db.schemaRegistry.query({ typename, location: ['database', 'runtime'] }).first(),
    );
    invariant(Type.isRelationSchema(schema), 'Schema is not a relation schema');

    const sourceObj = yield* Database.resolve(DXN.parse(source));
    const targetObj = yield* Database.resolve(DXN.parse(target));
    const relation = db.add(
      Relation.make(schema, {
        [Relation.Source]: sourceObj,
        [Relation.Target]: targetObj,
        ...data,
      }),
    );
    return Entity.toJSON(relation);
  }),
});
