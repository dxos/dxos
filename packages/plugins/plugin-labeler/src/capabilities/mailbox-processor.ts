//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';

import { LabelerOperation } from '#types';

/**
 * The labelling pass in the mailbox cascade.
 *
 * After `contacts`, because a sender with a Person record is the user's own correspondent and the
 * questions read better once that is known; the pass is otherwise independent — it asks about each
 * message on its own and writes only tags.
 */
export const MailboxProcessor = Capability.makeModule(
  'MailboxProcessor',
  { provides: [InboxCapabilities.MailboxProcessor], activatesOn: InboxEvents.Start },
  Effect.fnUntraced(function* () {
    return Capability.contribute(InboxCapabilities.MailboxProcessor, {
      id: 'label',
      tier: 'classify',
      after: ['contacts'],
      createInvocations: (mailbox, { batchLimit }) => [
        {
          operation: LabelerOperation.LabelMailbox,
          input: { mailbox: Ref.make(mailbox), batchLimit },
        },
      ],
    });
  }),
);
