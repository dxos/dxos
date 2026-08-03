//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { InboxCapabilities } from '@dxos/plugin-inbox/types';

import { CrmOperation } from '../types';

/**
 * Injects the `Process CRM` action into plugin-inbox's mailbox toolbar menu (the CRM sibling of
 * brain's `Analyze`): runs the cursored ProcessMailbox pipeline over the mailbox feed, scaffolding
 * a Profile per new contact. Safe to re-run — the durable cursor plus the identity index make every
 * invocation an idempotent catch-up.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(InboxCapabilities.MailboxAction, {
      id: 'process-crm',
      label: 'Process CRM',
      icon: 'ph--address-book--regular',
      createInvocation: (mailbox) => ({
        operation: CrmOperation.ProcessMailbox,
        input: { mailbox: Ref.make(mailbox), research: true },
      }),
    });
  }),
);
