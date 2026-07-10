//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback } from 'react';

import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { Operation, ServiceResolver } from '@dxos/compute';
import { Database, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { type EditMessageProps } from '#components';
import { meta } from '#meta';
import { InboxOperation, Mailbox, Sent } from '#types';

import { JMAP_MAIL_CONNECTOR_ID } from '../constants';
import { findBindingForTarget } from '../util';

/**
 * The send callback for the composer: routes the draft to its mailbox's provider, records the provider
 * message id (the reconcile match key), and flags the draft sent via a tag so it locks read-only
 * reactively. Success/failure of the send itself is surfaced by the invocation's `notify` option (the
 * built-in toast mechanism); post-send bookkeeping failures are logged, not toasted.
 */
export const useSendEmail = (message: Message.Message): NonNullable<EditMessageProps['onSend']> => {
  const db = Obj.getDatabase(message);
  const runtime = useProcessManagerRuntime();
  const spaceId = db?.spaceId;

  // Resolve the live mailbox from the draft's `properties.mailbox` uri (send routing + sent-tagging).
  const mailboxUri = typeof message.properties?.mailbox === 'string' ? message.properties.mailbox : undefined;
  const mailboxEid = mailboxUri ? EID.tryParse(mailboxUri) : undefined;
  const mailboxId = mailboxEid ? EID.getEntityId(mailboxEid) : undefined;
  const mailboxResult = useQuery(db, mailboxId ? Filter.id(mailboxId) : Filter.nothing())[0];
  const mailbox = Mailbox.instanceOf(mailboxResult) ? mailboxResult : undefined;

  return useCallback<NonNullable<EditMessageProps['onSend']>>(
    async (draft) => {
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
          const connection = Ref.make(Relation.getSource(binding));
          const { connectorId } = yield* Database.load(connection);
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

      // Record the provider message id — the reconcile match key the sync stage uses to drop this draft
      // once its canonical copy lands in the feed — and flag it sent via a tag so the composer locks
      // read-only reactively (a tag membership atom re-fires; a property mutation would not). Best
      // effort: a failure here leaves the message sent but the draft un-tagged, so log rather than throw.
      try {
        Obj.update(draft, (draft) => {
          (draft.properties ??= {}).sentMessageId = sent.id;
        });
        await Sent.markSent(mailbox, draft, db);
      } catch (err) {
        log.catch(err);
      }
    },
    [runtime, spaceId, db, mailbox],
  );
};
