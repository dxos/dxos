//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Ref, Type } from '@dxos/echo';
import { Connection } from '@dxos/link';
import { Message } from '@dxos/types';

/**
 * The provider-agnostic send contract. Every mail provider's send operation takes this input and returns
 * this output, so the composer can route a draft to whichever provider owns its mailbox binding without
 * naming any of them (see `InboxCapabilities.MailSendOperation`). A provider may widen the input with its
 * own optional fields; the shared shape is what the caller relies on.
 */
export const Input = Schema.Struct({
  message: Type.getSchema(Message.Message),
  connection: Ref.Ref(Connection.Connection).annotate({
    description: 'Connection to source provider credentials from.',
  }),
});

export type Input = Schema.Schema.Type<typeof Input>;

/**
 * The provider's "sent" tag, returned by the send ops so the caller can tag the local draft with the
 * same tag its canonical synced copy will carry — Gmail's `SENT` label (a well-known id) or the JMAP
 * account's Sent folder (a server-assigned id resolved by folder role). The `source`/`id` form the
 * tag's foreign key; `label` is a fallback used only when the tag doesn't exist yet (pre first sync).
 */
export const SentTag = Schema.Struct({
  source: Schema.String,
  id: Schema.String,
  label: Schema.String,
});

export type SentTag = Schema.Schema.Type<typeof SentTag>;

export const Output = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
  sentTag: SentTag,
});

export type Output = Schema.Schema.Type<typeof Output>;
