//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useCallback, useMemo } from 'react';

import { AiService } from '@dxos/ai';
import { useOperationInvoker, useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { ServiceResolver } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { type AssistantOptions, assistant } from '@dxos/react-ui-editor';
import { type Message } from '@dxos/types';

import { type EditMessageProps } from '#components';
import { meta } from '#meta';
import { InboxOperation, Mailbox, Sent } from '#types';

import { JMAP_MAIL_CONNECTOR_ID } from '../constants';
import { email } from '../extensions';
import { findBindingForTarget, stripQuotedMessage } from '../util';

/**
 * Composer wiring (AI draft-assist + email-aware editor extensions, and send) shared by the
 * full-screen composer ({@link EditMessageArticle}) and the inline thread-reply composer.
 */
export const useEmailComposer = (message: Message.Message): Pick<EditMessageProps, 'extensions' | 'onSend'> => {
  const db = Obj.getDatabase(message);
  const runtime = useProcessManagerRuntime();
  const { invokePromise } = useOperationInvoker();
  const spaceId = db?.spaceId;

  // Resolve the live mailbox from the draft's `properties.mailbox` uri (send routing + sent-tagging).
  const mailboxUri = typeof message.properties?.mailbox === 'string' ? message.properties.mailbox : undefined;
  const mailboxEid = mailboxUri ? EID.tryParse(mailboxUri) : undefined;
  const mailboxId = mailboxEid ? EID.getEntityId(mailboxEid) : undefined;
  const mailboxResult = useQuery(db, mailboxId ? Filter.id(mailboxId) : Filter.nothing())[0];
  const mailbox = Mailbox.instanceOf(mailboxResult) ? mailboxResult : undefined;

  const extensions = useMemo(() => {
    if (!spaceId) {
      return [];
    }

    const generate: AssistantOptions['generate'] = ({ instructions, content }) =>
      runtime.runPromise(
        Effect.gen(function* () {
          const prompt = [instructions, stripQuotedMessage(content)].join('\n\n');
          const response = yield* LanguageModel.generateText({ prompt });
          return response.text;
        }).pipe(
          Effect.provide(
            AiService.model('com.anthropic.model.claude-haiku-4-5.default').pipe(
              Layer.orDie,
              Layer.provide(ServiceResolver.provide({ space: spaceId }, AiService.AiService)),
            ),
          ),
        ),
      );

    return [assistant({ generate }), email()];
  }, [runtime, spaceId]);

  const handleSend = useCallback<NonNullable<EditMessageProps['onSend']>>(
    async (draft) => {
      if (!spaceId) {
        throw new TypeError('Space not available.');
      }
      if (!db || !mailbox) {
        throw new TypeError('Draft is not scoped to a mailbox.');
      }

      try {
        // Route the send to the mailbox's provider: find its sync binding (Connection → Mailbox) and
        // dispatch to the matching send op with the connection that sources credentials. A fresh draft
        // has no provider foreign key, so the connection's `connectorId` is the discriminator.
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
            return connectorId === JMAP_MAIL_CONNECTOR_ID
              ? yield* Operation.invoke(InboxOperation.JmapSend, { message: draft, connection }, { spaceId })
              : yield* Operation.invoke(InboxOperation.GmailSend, { message: draft, connection }, { spaceId });
          }).pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service))),
        );
        if (!sent) {
          throw new TypeError('Mailbox is not connected to an email account.');
        }

        // Record the provider message id — the reconcile match key the sync stage uses to drop this
        // draft once its canonical copy lands in the feed — and flag it sent via a tag so the composer
        // locks read-only reactively (a tag membership atom re-fires; a property mutation would not).
        Obj.update(draft, (draft) => {
          (draft.properties ??= {}).sentMessageId = sent.id;
        });
        await Sent.markSent(mailbox, draft, db);

        void invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/send-email-success`,
          icon: 'ph--paper-plane-tilt--regular',
          duration: 3_000,
          title: ['send-email-success.title', { ns: meta.profile.key }],
          closeLabel: ['close.label', { ns: meta.profile.key }],
        });
      } catch (err) {
        log.catch(err);
        void invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/send-email-error`,
          icon: 'ph--warning--regular',
          duration: 5_000,
          title: ['send-email-error.title', { ns: meta.profile.key }],
          description: err instanceof Error ? err.message : undefined,
          closeLabel: ['close.label', { ns: meta.profile.key }],
        });
      }
    },
    [runtime, spaceId, invokePromise, db, mailbox],
  );

  return { extensions, onSend: handleSend };
};
