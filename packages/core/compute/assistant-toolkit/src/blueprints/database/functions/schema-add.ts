//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Type } from '@dxos/echo';

import { SchemaAdd } from './definitions';

export default SchemaAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, typename, jsonSchema }) {
      const { db } = yield* Database.Service;
      const schema = db.add(Type.makeObjectFromJsonSchema({ typename, version: '0.1.0', jsonSchema }));
      if (name) {
        Type.update(schema, (draft) => {
          draft.name = name;
        });
      }
    }),
  ),
);
