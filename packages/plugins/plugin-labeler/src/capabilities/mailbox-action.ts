//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';

import { LabelerOperation } from '#types';

export const MailboxAction = Capability.makeModule(
  'MailboxAction',
  { provides: [InboxCapabilities.MailboxAction], activatesOn: InboxEvents.Start },
  Effect.fnUntraced(function* () {
    return Capability.contribute(InboxCapabilities.MailboxAction, {
      id: 'label',
      label: 'Label messages',
      icon: 'ph--tag--regular',
      createInvocation: (mailbox) => ({
        operation: LabelerOperation.LabelMailbox,
        input: { mailbox: Ref.make(mailbox) },
      }),
    });
  }),
);
