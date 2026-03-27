//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity, Obj, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { deepMapValues } from '@dxos/util';

import { ObjectCreate } from './definitions';

export default ObjectCreate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ typename, data }) {
      const { db } = yield* Database.Service;
      const schema = yield* Effect.promise(() =>
        db.schemaRegistry.query({ typename, location: ['database', 'runtime'] }).first(),
      );
      invariant(Type.isObjectSchema(schema), 'Schema is not an object schema');

      const object = db.add(
        Obj.make(
          schema,
          deepMapValues(data, (value, recurse) => {
            if (EncodedReference.isEncodedReference(value)) {
              return db.makeRef(EncodedReference.toDXN(value));
            }
            return recurse(value);
          }),
        ),
      );
      return Entity.toJSON(object);
    }),
  ),
);
