//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type Message } from '@dxos/types';

import { DraftMessage } from '../types';
import { getMailboxDraftsPath } from '../paths';
import { buildDraftMessageProps } from '../util';

import { DraftEmailAndOpen } from './definitions';

const handler: Operation.WithHandler<typeof DraftEmailAndOpen> = DraftEmailAndOpen.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, mode, replyToMessage, subject, body, mailbox }) {
      const props = buildDraftMessageProps({
        mode,
        replyToMessage: replyToMessage as Message.Message | undefined,
        subject,
        body,
        mailbox,
      });
      const draft = DraftMessage.make(props);
      yield* Operation.invoke(SpaceOperation.AddObject, {
        object: draft,
        target: db,
        hidden: true,
      });

      // Navigate to the draft under the mailbox drafts section so the graph can resolve it.
      const mailboxId = mailbox ? (Obj.isObject(mailbox) ? mailbox.id : undefined) : undefined;
      const draftPath = mailboxId ? `${getMailboxDraftsPath(db.spaceId, mailboxId)}/${draft.id}` : undefined;
      if (draftPath) {
        yield* Operation.invoke(LayoutOperation.Open, { subject: [draftPath] });
      }
    }),
  ),
);

export default handler;
