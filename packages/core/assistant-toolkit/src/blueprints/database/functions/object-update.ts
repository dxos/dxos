//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { Operation } from '@dxos/operation';

import { ObjectUpdate } from './definitions';

export default ObjectUpdate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj, properties }) {
      const { db } = yield* Database.Service;
      const object = yield* Database.load(obj);
      Entity.change(object as Entity.Any, (obj) => {
        for (const [key, value] of Object.entries(properties)) {
          if (EncodedReference.isEncodedReference(value)) {
            obj[key] = db.makeRef(EncodedReference.toDXN(value));
          } else {
            obj[key] = value;
          }
        }
      });
      return Entity.toJSON(object);
    }),
  ),
);
