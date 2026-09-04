//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { CrmOperation } from '#types';

/**
 * Contributes the cursored CRM pipeline as a feed processor instead of a rival toolbar button.
 *
 * It scaffolds a Profile per new contact, which overlaps plugin-inbox's own `contacts` pass in
 * purpose — as a separate menu item the two competed, and a user had no way to know that running one
 * made the other cheaper. As a processor declared `after: ['contacts']` it consumes what that pass
 * wrote, so the deterministic contact extraction runs first and this adds the CRM-specific research on
 * top. Safe to re-run: the durable cursor plus the identity index make every invocation an idempotent
 * catch-up.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(InboxCapabilities.MailboxProcessor, {
      id: 'crm',
      // Research is an LLM pass, so it sits in the cheap-model tier rather than the deterministic one.
      tier: 'classify',
      after: ['contacts'],
      createInvocations: (mailbox) => [
        {
          operation: CrmOperation.ProcessMailbox,
          input: { mailbox: Ref.make(mailbox), research: true },
        },
      ],
    });
  }),
);
