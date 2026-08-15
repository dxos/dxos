//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity, Obj } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';

import { SpaceObjectOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceObjectOperation.UpdateObject> = SpaceObjectOperation.UpdateObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object, properties }) {
      const { db } = yield* Database.Service;
      const resolved = yield* Database.load(object);
      Obj.update(resolved, (draft) => {
        for (const [key, value] of Object.entries(properties)) {
          // `setValue` rather than an index write: the object is only known to be `Obj.Unknown`,
          // which declares no arbitrary properties. A patch arrives in wire form, so a reference is
          // an envelope rather than a live `Ref`.
          Obj.setValue(
            draft,
            [key],
            EncodedReference.isEncodedReference(value) ? db.makeRef(EncodedReference.toURI(value)) : value,
          );
        }
      });
      return { object: Entity.toJSON(resolved) };
    }),
  ),
);

export default handler;
