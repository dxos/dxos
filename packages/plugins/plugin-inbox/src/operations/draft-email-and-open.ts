//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { Attention } from '@dxos/react-ui-attention/types';
import { DraftMessage } from '@dxos/types';

import { getMailboxDraftsPath } from '../paths';
import { InboxOperation, Mailbox, SystemTags } from '../types';
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

      if (Mailbox.instanceOf(mailbox)) {
        // Tag as 'draft' so the Drafts view (a systemTag filter, like Inbox/Sent) picks it up;
        // `useSendEmail` removes the tag at send time.
        yield* SystemTags.toggleTag(mailbox, draft, 'draft').pipe(Effect.provide(Database.layer(db)));

        // Navigate to Drafts and select the new draft, mirroring the select-then-show-companion flow
        // a list click does via `useShowItem` (invoked directly here since this runs outside a component).
        const draftsPath = getMailboxDraftsPath(db.spaceId, mailbox.id);
        yield* Operation.invoke(LayoutOperation.Select, {
          contextId: draftsPath,
          subject: { mode: 'single', id: draft.id },
        });
        yield* Operation.invoke(LayoutOperation.Open, { subject: [draftsPath] });
        yield* Operation.invoke(LayoutOperation.UpdateCompanion, { subject: Attention.linkedSegment('message') });
      }
    }),
  ),
);

export default handler;
