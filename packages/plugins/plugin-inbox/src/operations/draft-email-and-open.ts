//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { DraftMessage } from '@dxos/types';

import { getFeedObjectPath, getMailboxPath } from '../paths';
import { InboxOperation, Mailbox, SystemTags } from '../types';
import { createDraftMessage } from '../util';

const handler: Operation.WithHandler<typeof InboxOperation.DraftEmailAndOpen> = InboxOperation.DraftEmailAndOpen.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, mode = 'compose', message, subject, body, mailbox, pivotId }) {
      const props = createDraftMessage({ mode, message, subject, body, mailbox });
      const draft = DraftMessage.make(props);
      yield* Operation.invoke(SpaceOperation.AddObject, {
        object: draft,
        target: db,
      });

      if (!Mailbox.instanceOf(mailbox)) {
        return;
      }

      // Tag as 'draft' so the Drafts view (a systemTag filter, like Inbox/Sent) picks it up;
      // `useSendEmail` removes the tag at send time.
      yield* SystemTags.toggleTag(mailbox, draft, 'draft').pipe(Effect.provide(Database.layer(db)));

      // A reply/forward draft shares its parent's `threadId`, so the conversation the caller is already
      // looking at renders it inline (see `ConversationStack`) — navigating anywhere would lose that view.
      if (mode !== 'compose') {
        return;
      }

      // A fresh draft joins no thread, so open it as its own plank beside the view it was composed from —
      // the add-navigation a message click uses (see `MailboxArticle`). Drafts hang off every mailbox view
      // node (see the `mailboxMessages` connector), so the path resolves whichever view is the pivot.
      const pivot = pivotId ?? getMailboxPath(db.spaceId, mailbox.id);
      yield* Operation.invoke(LayoutOperation.Select, {
        contextId: pivot,
        subject: { mode: 'single', id: draft.id },
      });
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [getFeedObjectPath(pivot, draft.id)],
        pivotId: pivot,
        disposition: 'add',
        navigation: 'immediate',
      });
    }),
  ),
);

export default handler;
