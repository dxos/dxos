//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { InboxOperation } from '#types';

import { getMailboxPath } from '../paths.ts';
import { InboxOperationError } from './errors.ts';

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
        return yield* Effect.fail(
          new InboxOperationError({ message: `Target collection does not belong to space ${db.spaceId}.` }),
        );
      }

      // Filed by plugin-space, which owns where a new mailbox goes; on EDGE this plugin runs without its rule. The
      // target crosses as a reference, the form that survives a hop to plugin-space's bundle.
      const added = yield* Operation.invoke(
        SpaceOperation.AddObject,
        { object, target: target && Ref.make(target) },
        { spaceId: db.spaceId },
      );

      return {
        id: added.id,
        subject: [getMailboxPath(db.spaceId, added.object.id)],
        object: added.object,
      };
    }),
  ),
);

export default handler;
