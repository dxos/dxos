//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as CollectionModel from '@dxos/app-toolkit/CollectionModel';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { autoBindSingleConnection } from '@dxos/plugin-connector/binding';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';

import { InboxOperation } from '#types';

import { getMailboxPath } from '../paths';

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

      // A mailbox is inert until a provider binds it, so when exactly one account is already
      // authorized for this type there is nothing for the user to choose — bind it here rather than
      // leaving a Connect menu whose single entry is the only possible answer.
      yield* autoBindSingleConnection({ target: object }).pipe(Effect.provide(Database.layer(db)));

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
        subject: [getMailboxPath(db.spaceId, object.id)],
        object,
      };
    }),
  ),
);

export default handler;
