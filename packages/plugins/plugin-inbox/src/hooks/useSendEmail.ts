//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback } from 'react';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';
import * as Binding from '@dxos/plugin-connector/Binding';
import { Tagging } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { type EditMessageProps } from '#components';
import { meta } from '#meta';
import { InboxCapabilities, Mailbox, SystemTags } from '#types';

/**
 * The send callback for the composer: routes the draft to its mailbox's provider, records the provider
 * message id (the reconcile match key), and flags the draft sent via a tag so it locks read-only
 * reactively. Success/failure of the send itself is surfaced by the invocation's `notify` option (the
 * built-in toast mechanism); post-send bookkeeping failures are logged, not toasted.
 *
 * `sendOperations` is resolved by the container (this hook is called from `components/`, which must not
 * call capability hooks) — one entry per installed mail provider, keyed by its connector id.
 */
export const useSendEmail = (
  runtime: Capabilities.ProcessManagerRuntime | undefined,
  message: Message.Message,
  sendOperations: readonly InboxCapabilities.MailSendOperation[] = [],
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
          const binding = yield* Binding.queryCursor(mailbox);
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
          // The provider plugin that owns this connector contributes its send operation, so nothing
          // here names Gmail or JMAP.
          const sendOperation = sendOperations.find((entry) => entry.connectorId === connectorId);
          if (!sendOperation) {
            log.warn('no send operation registered for connector', { connectorId });
            return undefined;
          }
          // `spaceId` scopes the spawned send process so its space-affinity credentials service
          // (CredentialsService) materializes.
          const invokeOptions = {
            spaceId,
            notify: {
              success: ['send-email-success.title', { ns: meta.profile.key }],
              error: ['send-email-error.title', { ns: meta.profile.key }],
            },
          } satisfies Operation.InvokeOptions;
          return yield* Operation.invoke(sendOperation.getOperation(), { message: draft, connection }, invokeOptions);
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
    [runtime, spaceId, db, mailbox, sendOperations],
  );
};
