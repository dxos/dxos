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
          // `setValue` rather than an index write: the object is only known to be `Obj.Unknown`,
          // which declares no arbitrary properties. A patch arrives in wire form, so a reference is
          // an envelope rather than a live `Ref` — mapped at any depth, since a ref-array property
          // arrives as an array of envelopes and plain envelopes fail schema validation.
          Obj.setValue(
            resolved,
            [key],
            deepMapValues(value, (value, recurse) =>
              EncodedReference.isEncodedReference(value) ? db.makeRef(EncodedReference.toURI(value)) : recurse(value),
            ),
          );
        }
      });
      return { object: resolved };
    }),
  ),
);

export default handler;
