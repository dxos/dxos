//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';
import { linkedSegment } from '@dxos/react-ui-attention/types';
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
        // Tag with the canonical 'draft' system tag so the Drafts view (a plain systemTag filter, like
        // Inbox/Sent) picks it up; `useSendEmail` removes this tag at send time. A brand-new draft
        // never already carries a tag, so `toggleTag` (the same mechanism 'starred' uses) always
        // applies it here.
        yield* Effect.promise(() => SystemTags.toggleTag(mailbox, draft, db, 'draft'));

        // Navigate to the Drafts view and select the new draft there, so its companion (the message
        // editor) shows it — mirrors the select-then-show-companion flow a click in any mailbox list
        // already does (`useShowItem`), just invoked directly since this runs outside a component.
        const draftsPath = getMailboxDraftsPath(db.spaceId, mailbox.id);
        yield* Operation.invoke(LayoutOperation.Select, {
          contextId: draftsPath,
          subject: { mode: 'single', id: draft.id },
        });
        yield* Operation.invoke(LayoutOperation.Open, { subject: [draftsPath] });
        yield* Operation.invoke(LayoutOperation.UpdateCompanion, { subject: linkedSegment('message') });
      }
    }),
  ),
);

export default handler;
