//
// Copyright 2026 DXOS.org
//

import { Operation } from '@dxos/compute';
import { type ObjectExtractor } from '@dxos/extractor';
import { contactExtractor, extractContact } from '@dxos/extractor-lib';

import { InboxOperation } from '../../types';

export const TEMPLATE_ID = 'org.dxos.plugin.inbox.extractor.contact';

/**
 * Operation handler — wraps the shared `extract` so the extractor is also a first-class
 * registered operation. Does NOT write to the database; the dispatcher persists.
 */
const handler: Operation.WithHandler<typeof InboxOperation.ExtractContactFromMessage> =
  InboxOperation.ExtractContactFromMessage.pipe(Operation.withHandler(extractContact));

export default handler;

/**
 * Creates a Person from a message's sender, linking to an existing Organization when a
 * matching domain is found. Reuses the shared `contactExtractor`, adding the plugin `id` and the
 * `operation` binding so it is also invocable as a first-class, history-traceable operation.
 * Does NOT attach an `ExtractedFrom` relation back to the message: `Message.sender` already
 * references the actor, so a provenance edge would duplicate that linkage.
 */
export const ContactMessageExtractor: ObjectExtractor = {
  ...contactExtractor,
  id: TEMPLATE_ID,
  operation: InboxOperation.ExtractContactFromMessage,
};
