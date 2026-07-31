//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { DraftMessage } from '@dxos/types';

import { getFeedObjectPath, getMailboxPath } from '../paths';
import { InboxOperation, Mailbox, SystemTags } from '../types';
import { createDraftMessage } from '../util';

const handler: Operation.WithHandler<typeof InboxOperation.DraftEmailAndOpen> = InboxOperation.DraftEmailAndOpen.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, mode = 'compose', message, subject, body, mailbox, contextId }) {
      // A draft is identified by the `properties.mailbox` its mailbox supplies (see `DraftMessage`), so
      // without one there is nothing to scope, tag, or render it — bail before persisting an orphan.
      if (!Mailbox.instanceOf(mailbox)) {
        return;
      }

      const props = createDraftMessage({ mode, message, subject, body, mailbox });
      const draft = DraftMessage.make(props);
      yield* Operation.invoke(SpaceOperation.AddObject, {
        object: draft,
        target: db,
      });

      // Tag as 'draft' so the Drafts view (a systemTag filter, like Inbox/Sent) picks it up;
      // `useSendEmail` removes the tag at send time.
      yield* SystemTags.toggleTag(mailbox, draft, 'draft').pipe(Effect.provide(Database.layer(db)));

      // A reply/forward draft shares its parent's `threadId`, so the conversation the caller is already
      // looking at renders it inline (see `ConversationStack`) — navigating anywhere would lose that view.
      if (mode !== 'compose') {
        return;
      }

      // A fresh draft joins no thread, so open it as its own plank beside the mailbox view it was
      // composed from — the add-navigation a message click uses (see `MailboxArticle`). Drafts hang off
      // every mailbox view node (see the `mailboxMessages` connector), so the path resolves for any view.
      const pivotId = contextId ?? getMailboxPath(db.spaceId, mailbox.id);
      yield* Operation.invoke(LayoutOperation.Select, {
        contextId: pivotId,
        subject: { mode: 'single', id: draft.id },
      });
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [getFeedObjectPath(pivotId, draft.id)],
        pivotId,
        disposition: 'add',
        navigation: 'immediate',
      });
    }),
  ),
);

export default handler;
