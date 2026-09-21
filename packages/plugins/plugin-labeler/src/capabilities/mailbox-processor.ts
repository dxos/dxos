//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';

import { LabelerOperation } from '#types';

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
