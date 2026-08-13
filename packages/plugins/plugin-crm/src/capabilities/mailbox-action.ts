//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { CrmOperation } from '#types';

/**
 * Injects the `Process CRM` action into plugin-inbox's mailbox toolbar menu (the CRM sibling of
 * brain's `Analyze`): runs the cursored ProcessMailbox pipeline over the mailbox feed, scaffolding
 * a Profile per new contact. Safe to re-run — the durable cursor plus the identity index make every
 * invocation an idempotent catch-up.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(InboxCapabilities.MailboxAction, [
      {
        id: 'process-crm',
        label: 'Process CRM',
        icon: 'ph--address-book--regular',
        createInvocation: (mailbox) => ({
          operation: CrmOperation.ProcessMailbox,
          input: { mailbox: Ref.make(mailbox), research: true },
        }),
      },
      {
        // Space-wide rather than mailbox-scoped (the operation walks every Person/Organization
        // missing an image), but the mailbox menu is where a user is when contacts appear.
        id: 'find-images',
        label: 'Find images',
        icon: 'ph--user-circle--regular',
        createInvocation: () => ({ operation: CrmOperation.EnrichImages, input: {} }),
      },
    ]);
  }),
);
