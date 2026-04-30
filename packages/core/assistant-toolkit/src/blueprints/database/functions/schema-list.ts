//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Routine, Blueprint } from '@dxos/blueprints';
import { Database, Feed, JsonSchema, Type, View } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { SchemaList } from './definitions';

// TODO(dmaretskyi): This is a balance between not filling the agent's context with too many types and not excluding important types.
const EXCLUDED_TYPES = [Type.PersistentType, View.View, Routine.Routine, Blueprint.Blueprint, Feed.Feed];
const excludedTypenames = EXCLUDED_TYPES.map((type) => Type.getTypename(type));

export default SchemaList.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const { db } = yield* Database.Service;
      const schema = yield* Effect.promise(() => db.schemaRegistry.query({ location: ['database', 'runtime'] }).run());
      return schema
        .filter((schema) => !excludedTypenames.includes(Type.getTypename(schema)))
        .map((schema) => {
          const meta = Type.getMeta(schema);
          return {
            typename: Type.getTypename(schema),
            jsonSchema: JsonSchema.toJsonSchema(schema),
            kind: meta?.sourceSchema ? 'relation' : 'record',
          };
        });
    }),
  ),
);
