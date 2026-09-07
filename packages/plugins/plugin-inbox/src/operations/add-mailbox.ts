//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as CollectionModel from '@dxos/app-toolkit/CollectionModel';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';

import { InboxOperation } from '#types';

import { getMailboxPath } from '../paths';

const handler: Operation.WithHandler<typeof InboxOperation.AddMailbox> = InboxOperation.AddMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { target, object } = input;
      // The database is the runtime's, resolved from the invocation's space id, so the collection
      // write runs against it without a service override.
      const { db } = yield* Database.Service;
      invariant(db, 'Database not found.');
      // The space id names the database, so the target has to live in it; one from another space —
      // or a detached one — would take the reference somewhere the mailbox is not.
      if (target && Obj.getDatabase(target)?.spaceId !== db.spaceId) {
        return yield* Effect.fail(new Error(`Target collection does not belong to space ${db.spaceId}.`));
      }

      yield* CollectionModel.add({ object, target });

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
