//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';

import { getMailboxMessagePath } from '../paths';
import { DraftMessage, InboxOperation } from '../types';
import { createDraftMessage } from '../util';

const handler: Operation.WithHandler<typeof InboxOperation.DraftEmailAndOpen> = InboxOperation.DraftEmailAndOpen.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, mode, message, subject, body, mailbox }) {
      const props = createDraftMessage({ mode, message, subject, body, mailbox });
      const draft = DraftMessage.make(props);
      yield* Operation.invoke(SpaceOperation.AddObject, {
        object: draft,
        target: db,
      });

      // Same linked path as feed messages; feed-object resolver resolves drafts from the DB.
      const mailboxId = mailbox ? (Obj.isObject(mailbox) ? mailbox.id : undefined) : undefined;
      const draftPath = mailboxId ? getMailboxMessagePath(db.spaceId, mailboxId, draft.id) : undefined;
      if (draftPath) {
        yield* Operation.invoke(LayoutOperation.Open, { subject: [draftPath] });
      }
    }),
  ),
);

export default handler;
