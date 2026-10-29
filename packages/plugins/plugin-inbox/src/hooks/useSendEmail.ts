//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback } from 'react';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Message } from '@dxos/types';

import { type EditMessageProps } from '#components';
import { type InboxCapabilities, Mailbox } from '#types';

import { InboxNamespace } from '../namespace.ts';
import { markSent, resolveMailRoute } from '../util/index.ts';

/**
 * The send callback for the composer: routes the draft to its mailbox's provider, records the provider
 * message id (the reconcile match key), and flags the draft sent via a tag so it locks read-only
 * reactively (see `resolveMailRoute` and `markSent`). Success/failure of the send itself is surfaced by the invocation's `notify` option (the
 * built-in toast mechanism); post-send bookkeeping failures are logged, not toasted.
 *
 * `sendOperations` is resolved by the container (this hook is called from `components/`, which must not
 * call capability hooks) - one entry per installed mail provider, keyed by its connector id.
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

      // Route the send to the mailbox's provider (its sync binding's connector, or a provider that claims
      // the unbound mailbox) and dispatch to that send op with the connection that sources credentials.
      // The invocation's `notify` option surfaces send success/failure as toasts.
      const sent = await runtime.runPromise(
        Effect.gen(function* () {
          const route = yield* resolveMailRoute(mailbox, sendOperations);
          if (!route) {
            log.warn('no send route for mailbox', { mailbox: Obj.getURI(mailbox).toString() });
            return undefined;
          }
          // `spaceId` scopes the spawned send process so its space-affinity credentials service
          // (CredentialsService) materializes.
          const invokeOptions = {
            spaceId,
            notify: {
              success: ['send-email-success.title', { ns: InboxNamespace.key }],
              error: ['send-email-error.title', { ns: InboxNamespace.key }],
            },
          } satisfies Operation.InvokeOptions;
          const result = yield* Operation.invoke(
            route.sendOperation.getOperation(),
            { message: draft, connection: route.connection },
            invokeOptions,
          );
          // Best effort: a failure here leaves the message sent but the draft untagged, so log rather
          // than throw.
          yield* markSent(mailbox, draft, result).pipe(
            Effect.catchCause((cause) => Effect.sync(() => log.catch(cause))),
          );
          return result;
        }).pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service))),
      );
      if (!sent) {
        throw new TypeError('Mailbox is not connected to an email account.');
      }
    },
    [runtime, spaceId, db, mailbox, sendOperations],
  );
};
