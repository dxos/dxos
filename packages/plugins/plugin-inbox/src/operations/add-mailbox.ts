//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CollectionModel } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { getMailboxAllMailPath } from '../paths';
import { InboxOperation } from '../types';

const handler: Operation.WithHandler<typeof InboxOperation.AddMailbox> = InboxOperation.AddMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const target = input.target as any;
      const object = input.object as Obj.Unknown;
      const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
      invariant(db, 'Database not found.');

      yield* CollectionModel.add({
        object,
        target: Database.isDatabase(target) ? undefined : target,
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
        id: Obj.getURI(object),
        subject: [getMailboxAllMailPath(db.spaceId, object.id)],
        object,
      };
    }),
  ),
);

export default handler;
