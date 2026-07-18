//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback } from 'react';

import { type Capabilities } from '@dxos/app-framework';
import { Operation, ServiceResolver } from '@dxos/compute';
import { Database, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { Connection } from '@dxos/plugin-connector';
import { useQuery } from '@dxos/react-client/echo';
import { Tagging } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { type EditMessageProps } from '#components';
import { meta } from '#meta';
import { InboxOperation, Mailbox, SystemTags } from '#types';

import { JMAP_MAIL_CONNECTOR_ID } from '../constants';
import { findBindingForTarget } from '../util';

/**
 * The send callback for the composer: routes the draft to its mailbox's provider, records the provider
 * message id (the reconcile match key), and flags the draft sent via a tag so it locks read-only
 * reactively. Success/failure of the send itself is surfaced by the invocation's `notify` option (the
 * built-in toast mechanism); post-send bookkeeping failures are logged, not toasted.
 */
export const useSendEmail = (
  runtime: Capabilities.ProcessManagerRuntime | undefined,
  message: Message.Message,
): NonNullable<EditMessageProps['onSend']> => {
  const db = Obj.getDatabase(message);
  const spaceId = db?.spaceId;

  // Resolve the live mailbox from the draft's `properties.mailbox` uri (send routing + sent-tagging).
  const mailboxUri = typeof message.properties?.mailbox === 'string' ? message.properties.mailbox : undefined;
  const mailboxEid = mailboxUri ? EID.tryParse(mailboxUri) : undefined;
  const mailboxId = mailboxEid ? EID.getEntityId(mailboxEid) : undefined;
  const mailboxResult = useQuery(db, mailboxId ? Filter.id(mailboxId) : Filter.nothing())[0];
  const mailbox = Mailbox.instanceOf(mailboxResult) ? mailboxResult : undefined;

  return useCallback<NonNullable<EditMessageProps['onSend']>>(
    async (draft) => {
      if (!runtime) {
        throw new TypeError('Process runtime not available.');
      }
      if (!spaceId) {
        throw new TypeError('Space not available.');
      }
      if (!db || !mailbox) {
        throw new TypeError('Draft is not scoped to a mailbox.');
      }

      // Route the send to the mailbox's provider: find its sync binding (Connection → Mailbox) and
      // dispatch to the matching send op with the connection that sources credentials. A fresh draft
      // has no provider foreign key, so the connection's `connectorId` is the discriminator. The
      // invocation's `notify` option surfaces send success/failure as toasts.
      const sent = await runtime.runPromise(
        Effect.gen(function* () {
          const binding = yield* findBindingForTarget(mailbox);
          if (!binding) {
            return undefined;
          }
          // Finds the Connection whose access token is the binding's `spec.source` — fuzzy if an
          // access token is ever shared across connections.
          const [connectionObj] = yield* Database.query(
            Filter.type(Connection.Connection, { accessToken: binding.spec.source }),
          ).run.pipe(Effect.provide(Database.layer(db)));
          if (!connectionObj) {
            return undefined;
          }
          const connection = Ref.make(connectionObj);
          const { connectorId } = connectionObj;
          // `spaceId` scopes the spawned send process so its space-affinity credentials service
          // (CredentialsService) materializes.
          const invokeOptions = {
            spaceId,
            notify: {
              success: ['send-email-success.title', { ns: meta.profile.key }],
              error: ['send-email-error.title', { ns: meta.profile.key }],
            },
          } satisfies Operation.InvokeOptions;
          return connectorId === JMAP_MAIL_CONNECTOR_ID
            ? yield* Operation.invoke(InboxOperation.JmapSend, { message: draft, connection }, invokeOptions)
            : yield* Operation.invoke(InboxOperation.GmailSend, { message: draft, connection }, invokeOptions);
        }).pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service))),
      );
      if (!sent) {
        throw new TypeError('Mailbox is not connected to an email account.');
      }

      // Tag the draft with the canonical `sent` system tag (resolved by the send op — the same tag the
      // message's synced copy will carry, since sync maps Gmail's SENT label / the JMAP Sent folder onto
      // it), so the draft locks read-only, reads consistently with sent messages, and reconciles against
      // that copy. Best effort: a failure here leaves the message sent but the draft untagged, so log
      // rather than throw.
      try {
        const key = { source: sent.sentTag.source, id: sent.sentTag.id };
        // Query first so the existing tag keeps its label/hue — `findOrCreate` would rewrite the label,
        // and the next sync would rewrite it back. Create one only before the first sync has surfaced it.
        const [existing] = await db.query(Filter.foreignKeys(Tag.Tag, [key])).run();
        const tag = existing ?? (await Tag.findOrCreate(db, { key, label: sent.sentTag.label }));
        const sentTagUri = Obj.getURI(tag).toString();
        // Set the properties before applying the tag: the tag write drives the read-only re-render, so
        // `sentMessageId`/`sentTagUri` must already be readable when it fires.
        Obj.update(draft, (draft) => {
          const properties = (draft.properties ??= {});
          properties.sentMessageId = sent.id;
          properties.sentTagUri = sentTagUri;
        });
        const index = mailbox.tags.target ?? (await mailbox.tags.load());
        Tagging.set(draft, sentTagUri, { index });
        // No longer a draft: untag now so Drafts stops showing it, without waiting for sync's later
        // `db.remove` of the object itself.
        const draftTag = await SystemTags.findOrCreateSystemTag(db, 'draft');
        Tagging.unset(draft, Obj.getURI(draftTag).toString(), { index });
      } catch (err) {
        log.catch(err);
      }
    },
    [runtime, spaceId, db, mailbox],
  );
};
