//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { LabelerOperation } from '#types';

/** The mailbox toolbar entry that runs the labeller over the whole inbox. */
export default Capability.makeModule(
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
