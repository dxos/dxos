//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';

import { InboxCapabilities, InboxOperation } from '#types';

/** plugin-inbox's own mailbox toolbar actions: triage labels, prioritises and extracts tasks from the whole inbox. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(InboxCapabilities.MailboxAction, {
      id: 'label',
      label: 'Triage inbox',
      icon: 'ph--magic-wand--regular',
      createInvocation: (mailbox) => ({
        operation: InboxOperation.TriageMailbox,
        input: { mailbox: Ref.make(mailbox) },
      }),
    });
  }),
);
