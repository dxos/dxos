//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as Binding from '@dxos/plugin-connector/Binding';
import { Tagging } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { type InboxCapabilities, type Mailbox, type MailSend, SystemTags } from '#types';

/** Where a mailbox's outbound mail goes: the provider's send operation and the connection it sends with. */
export type MailRoute = {
  readonly sendOperation: InboxCapabilities.MailSendOperation;
  readonly connection: Ref.Ref<Connection.Connection>;
};

/**
 * Routes a mailbox's mail to its provider: the connection behind its sync binding (Connection →
 * Mailbox), matched to the send operation contributed for that connector; failing that, the first
 * provider that claims the unbound mailbox itself. Undefined when nothing can send for it.
 */
export const resolveMailRoute = (
  mailbox: Mailbox.Mailbox,
  sendOperations: readonly InboxCapabilities.MailSendOperation[],
): Effect.Effect<MailRoute | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const binding = yield* Binding.queryCursor(mailbox);
    if (binding) {
      // The Connection whose access token is the binding's `spec.source` — fuzzy if an access token is
      // ever shared across connections.
      const [connection] = yield* Database.query(
        Filter.type(Connection.Connection, { accessToken: binding.spec.source }),
      ).run;
      const sendOperation = connection && sendOperations.find((entry) => entry.connectorId === connection.connectorId);
      return connection && sendOperation ? { sendOperation, connection: Ref.make(connection) } : undefined;
    }

    for (const sendOperation of sendOperations) {
      const connection = sendOperation.resolveConnection ? yield* sendOperation.resolveConnection(mailbox) : undefined;
      if (connection) {
        return { sendOperation, connection };
      }
    }
    return undefined;
  });

/**
 * Flags a draft sent: records the provider id (the reconcile match key) and moves it from the `draft`
 * tag to the provider's sent tag — the same tag its synced copy will carry — so it locks read-only.
 */
export const markSent = (mailbox: Mailbox.Mailbox, draft: Message.Message, sent: MailSend.Output) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const key = { source: sent.sentTag.source, id: sent.sentTag.id };
    // Queried first so an existing tag keeps its label/hue: `findOrCreate` would rewrite the label, and
    // the next sync would rewrite it back. Created only before the first sync has surfaced it.
    const [existing] = yield* Database.query(Filter.foreignKeys(Tag.Tag, [key])).run;
    const tag = existing ?? (yield* Effect.promise(() => Tag.findOrCreate(db, { key, label: sent.sentTag.label })));
    const sentTagUri = Obj.getURI(tag).toString();
    // The properties come before the tag: the tag write drives the read-only re-render, so
    // `sentMessageId`/`sentTagUri` must already be readable when it fires.
    Obj.update(draft, (draft) => {
      const properties = (draft.properties ??= {});
      properties.sentMessageId = sent.id;
      properties.sentTagUri = sentTagUri;
    });
    const index = yield* Database.load(mailbox.tags);
    Tagging.set(draft, sentTagUri, { index });
    const draftTag = yield* Effect.promise(() => SystemTags.findOrCreateSystemTag(db, 'draft'));
    Tagging.unset(draft, Obj.getURI(draftTag).toString(), { index });
  });
