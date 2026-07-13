//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Stage } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { type Mailbox } from '../types';
import { runOnArrivalExtractors } from '../util/mailbox-sync';

/**
 * The app-framework-coupled email-processing stage. The generic stages (attachments, contact
 * extraction, draft pooling/reconciliation, commit) live in `@dxos/pipeline-email`'s `EmailStage`
 * namespace, on top of the generic sync machinery in `@dxos/types`' `SyncBinding`.
 */

/**
 * Optional stage that runs the mailbox's configured on-arrival extractors (AI and others) for each
 * item's message, passing the item through unchanged. Self-gating: a no-op when the mailbox has no
 * extractors enabled. Sender→contact extraction is handled unconditionally by
 * `@dxos/pipeline-email`'s `EmailStage.extractContacts`; this stage covers the remaining,
 * config-gated extractors.
 *
 * TODO(wittjosiah): Factor these extractors out into their own downstream pipeline.
 */
export const onArrivalExtractors =
  (mailbox: Mailbox.Mailbox) =>
  <In extends { readonly message: Message.Message }, E, R>(
    self: Stream.Stream<In, E, R>,
  ): Stream.Stream<In, E, R | Capability.Service | Operation.Service> =>
    Stage.map('on-arrival-extractors', (item: In) =>
      runOnArrivalExtractors(mailbox, [item.message]).pipe(Effect.as(item)),
    )(self);
