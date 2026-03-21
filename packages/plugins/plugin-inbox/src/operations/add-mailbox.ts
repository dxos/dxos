//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { getSpacePath } from '@dxos/app-toolkit';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';
import { CollectionModel } from '@dxos/schema';

import { AddMailbox } from './definitions';

export default AddMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const target = input.target as any;
      const object = input.object as Obj.Unknown;
      const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
      invariant(db, 'Database not found.');

      yield* CollectionModel.add({
        object,
        target: Database.isDatabase(target) ? undefined : target,
        hidden: true,
      }).pipe(Effect.provide(Database.layer(db)));

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'space.object.add',
        properties: {
          spaceId: db.spaceId,
          objectId: object.id,
          typename: Obj.getTypename(object),
        },
      });

      return {
        id: Obj.getDXN(object).toString(),
        subject: [`${getSpacePath(db.spaceId)}/mailboxes/${object.id}/all-mail`],
        object,
      };
    }),
  ),
);
