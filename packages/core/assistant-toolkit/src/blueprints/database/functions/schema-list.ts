//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, JsonSchema, Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { SchemaList } from './definitions';

export default SchemaList.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const { db } = yield* Database.Service;
      const schema = yield* Effect.promise(() => db.schemaRegistry.query({ location: ['database', 'runtime'] }).run());
      return schema.map((schema) => {
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
