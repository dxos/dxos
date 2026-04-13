//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { SchemaAdd } from './definitions';

export default SchemaAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, typename, jsonSchema }) {
      const { db } = yield* Database.Service;
      yield* Effect.promise(() =>
        db.schemaRegistry.register([
          {
            typename,
            version: '0.1.0',
            jsonSchema,
            name,
          },
        ]),
      );
    }),
  ),
);
