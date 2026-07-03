//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { deepMapValues } from '@dxos/util';

import { ObjectCreate } from './definitions';

export default ObjectCreate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ typename, properties }) {
      const { db } = yield* Database.Service;
      const types = yield* Database.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()))
        .run;
      const foundSchema = types.find((t) => Type.getTypename(t) === typename);
      invariant(foundSchema, `Schema not found: ${typename}`);
      invariant(Type.isObject(foundSchema), 'Schema is not an object schema');
      const schema = foundSchema;

      const object = db.add(
        Obj.make(
          schema,
          deepMapValues(properties, (value, recurse) => {
            if (EncodedReference.isEncodedReference(value)) {
              return db.makeRef(EncodedReference.toURI(value));
            }
            return recurse(value);
          }),
        ),
      );
      return Entity.toJSON(object);
    }),
  ),
);
