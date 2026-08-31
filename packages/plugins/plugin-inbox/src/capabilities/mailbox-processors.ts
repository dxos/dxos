//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';

import { InboxCapabilities, InboxOperation } from '#types';

/**
 * plugin-inbox's own feed processors, contributed through the same capability any other plugin uses.
 *
 * Going through the seam rather than privileging the built-ins is the point: the cascade then has
 * exactly one source of processors, so there is no second code path for "the ones we ship" to drift
 * from. It also means a deployment without this module contributes nothing and scans nothing, which
 * is the honest behaviour.
 *
 * The `after` edges encode the cascade's real contract — classification consults the Person objects
 * the contacts pass creates, so a known sender is tagged personal and never billed to the model. The
 * cost tiers are a filter and a report label; the edges are what actually orders the run.
 *
 * The `analyze` pass is deliberately NOT here: it needs a `FactStore` only plugin-brain provides, so
 * brain contributes the processor and the layer together and a deployment without brain simply has no
 * analyze pass to run.
 */
export const inboxMailboxProcessors: readonly InboxCapabilities.MailboxProcessor[] = [
  {
    id: 'contacts',
    tier: 'deterministic',
    createInvocations: (mailbox, { me }) =>
      // Correspondence is derived relative to the user's own addresses; without them
      // `deriveCorrespondents` returns nothing, so an empty run would report a misleading zero.
      me.length === 0
        ? { skip: 'no identity addresses supplied' }
        : [
            {
              operation: InboxOperation.ExtractCorrespondents,
              input: { mailbox: Ref.make(mailbox), me: [...me] },
            },
          ],
  },
  {
    id: 'subscriptions',
    tier: 'deterministic',
    createInvocations: (mailbox) => [
      {
        operation: InboxOperation.ExtractSubscriptions,
        input: { mailbox: Ref.make(mailbox) },
      },
    ],
  },
  {
    id: 'classify',
    tier: 'classify',
    after: ['contacts'],
    createInvocations: (mailbox, { batchLimit, model, strict }) => [
      {
        operation: InboxOperation.ClassifyMailbox,
        input: { mailbox: Ref.make(mailbox), batchLimit, model, strict },
      },
    ],
  },
  {
    id: 'summarize',
    tier: 'summarize',
    after: ['contacts', 'classify'],
    createInvocations: (mailbox, { model }) => [
      {
        operation: InboxOperation.SummarizeMailbox,
        input: { mailbox: Ref.make(mailbox), model },
      },
    ],
  },
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(InboxCapabilities.MailboxProcessor, inboxMailboxProcessors);
  }),
);
