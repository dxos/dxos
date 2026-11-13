// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Database, Entity, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.RestoreObjects> = SpaceOperation.RestoreObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      invariant(
        (input.objects == null) !== (input.refs == null),
        'Pass exactly one of `objects` (held) or `refs` (referenced).',
      );
      // A removed entity reads as absent by default, so a reference must ask for it explicitly.
      const entities =
        input.objects ?? (yield* Effect.forEach(input.refs ?? [], (ref) => Database.load(ref, { deleted: 'include' })));
      if (entities.length === 0) {
        return;
      }

      // Held entities keep their database binding after removal; a referenced one was loaded through the
      // invocation's database, which a remote host provides whether or not the operation declares it.
      const service = yield* Effect.serviceOption(Database.Service);
      const db = Entity.getDatabase(entities[0]) ?? Option.getOrUndefined(service)?.db;
      invariant(db, 'No database to restore the objects to.');

      const restored = entities.map((entity) => db.add(entity));

      const { parentCollection, indices } = input;
      if (parentCollection) {
        Obj.update(parentCollection, (parentCollection) => {
          indices.forEach((index, position) => {
            const entity = restored[position];
            if (index !== -1 && Obj.isObject(entity)) {
              parentCollection.objects.splice(index, 0, Ref.make(entity));
            }
          });
        });
      }

      if (input.wasActive.length > 0) {
        yield* Operation.invoke(LayoutOperation.Open, { subject: [...input.wasActive] });
      }
    }),
  ),
);
export default handler;
