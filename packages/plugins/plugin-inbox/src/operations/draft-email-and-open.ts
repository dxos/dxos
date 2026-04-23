//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { getMailboxMessagePath } from '../paths';
import { DraftMessage } from '../types';
import { createDraftMessage } from '../util';
import { DraftEmailAndOpen } from './definitions';

const handler: Operation.WithHandler<typeof DraftEmailAndOpen> = DraftEmailAndOpen.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, mode, message, subject, body, mailbox }) {
      const props = createDraftMessage({ mode, message, subject, body, mailbox });
      const draft = DraftMessage.make(props);
      yield* Operation.invoke(SpaceOperation.AddObject, {
        object: draft,
        target: db,
        hidden: true,
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
