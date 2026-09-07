//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { deepMapValues } from '@dxos/util';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.UpdateObject> = SpaceOperation.UpdateObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object, properties }) {
      const { db } = yield* Database.Service;
      const resolved = yield* Database.load(object);
      Obj.update(resolved, (resolved) => {
        for (const [key, value] of Object.entries(properties)) {
          Obj.setValue(resolved, [key], wireValueToRefs(db, value));
        }
      });
      return { object: resolved };
    }),
  ),
);

/** A patch arrives in wire form: ref envelopes at any depth become live refs. */
const wireValueToRefs = (db: Database.Database, value: unknown): unknown =>
  deepMapValues(value, (value, recurse) =>
    EncodedReference.isEncodedReference(value) ? db.makeRef(EncodedReference.toURI(value)) : recurse(value),
  );

export default handler;
