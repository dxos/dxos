//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { Obj } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import { log } from '@dxos/log';
import { EmailStage } from '@dxos/pipeline-email';
import { Person } from '@dxos/types';

import { GoogleMail } from '../../../../apis';
import { GMAIL_SOURCE } from '../../../../constants';
import { MailSyncError } from '../../../../errors';
import { GoogleMailApi } from '../../../../services';
import { Mailbox } from '../../../../types';
import { parseFromHeader } from '../../../util';
import { type MailSyncItem, MailSyncProvider, type MailSyncSource } from '../../mail-sync';
import { decodeBody, mapToMessage } from '../mapper';
import { GMAIL_SYNC_CONFIG, fetchAttachments, fetchMessages } from './fetch';

/**
 * Gmail's {@link MailSyncProvider}: the message source, the label→tag map, and the fused decode+map.
 * Captures {@link GoogleMailApi} + {@link Resolver} so the harness never names them. Mirror of the JMAP
 * provider (`jmapMailSyncProvider`).
 */
export const gmailMailSyncProvider = (options: {
  userId: string;
  label: string;
}): Layer.Layer<MailSyncProvider, never, GoogleMailApi | Resolver> =>
  Layer.effect(
    MailSyncProvider,
    Effect.gen(function* () {
      // The API is provided into the source stream (leaving `Cursor.Service` for the harness); the full
      // context into each `process` (whose only needs are API + resolver).
      const context = yield* Effect.context<GoogleMailApi | Resolver>();
      const api = yield* GoogleMailApi;
      const { userId, label } = options;
      return {
        name: 'gmail',
        config: GMAIL_SYNC_CONFIG,
        foreignKeySource: GMAIL_SOURCE,
        prepare: ({ mailbox }) =>
          Effect.gen(function* () {
            const labelMap = yield* syncLabels(mailbox, userId).pipe(
              Effect.catchAll((error) => {
                log.catch(error);
                return Effect.succeed(new Map<string, string>());
              }),
            );

            // Fused decode + map; `undefined` drops the item (no body, or a filtered sender).
            const toMapped = (
              message: GoogleMail.Message,
            ): Effect.Effect<EmailStage.Mapped | undefined, never, GoogleMailApi | Resolver> =>
              Effect.gen(function* () {
                const decoded = decodeBody(message);
                if (!decoded) {
                  return undefined;
                }
                const fromHeader = decoded.raw.payload.headers.find(({ name }) => name === 'From');
                const from = fromHeader ? parseFromHeader(fromHeader.value) : undefined;
                // Drop filtered messages before the costly attachment fetch.
                if (Mailbox.isFiltered(mailbox, { sender: from })) {
                  return undefined;
                }
                const contact = from?.email ? yield* resolve(Person.Person, { email: from.email }) : undefined;
                const mapped = mapToMessage(decoded, contact ?? undefined);
                const tagUris = mapped.labelIds.flatMap((labelId) => {
                  const uri = labelMap.get(labelId);
                  return uri ? [uri] : [];
                });
                const attachments = yield* fetchAttachments(userId, decoded.raw.id, decoded.attachments);
                return {
                  message: mapped.message,
                  foreignId: decoded.raw.id,
                  key: Number.parseInt(decoded.raw.internalDate),
                  tagUris,
                  attachments,
                };
              });

            const source: MailSyncSource = {
              buildSource: ({ windows, filter, onEnumerated, onRetrieved }) =>
                fetchMessages({ userId, label, windows, searchFilter: filter, onEnumerated, onRetrieved }).pipe(
                  Stream.map(
                    (message): MailSyncItem => ({
                      foreignId: message.id,
                      key: Number.parseInt(message.internalDate),
                      process: toMapped(message).pipe(Effect.provide(context)),
                    }),
                  ),
                  Stream.provideService(GoogleMailApi, api),
                  Stream.mapError(MailSyncError.wrap()),
                ),
            };
            return source;
          }).pipe(Effect.provide(context), Effect.mapError(MailSyncError.wrap())),
      };
    }),
  );

/**
 * Syncs the Gmail label dictionary to `Tag` objects (one per label, carrying the Gmail label-id as
 * a foreign key). Returns a `gmailLabelId -> Tag uri` map used to index messages by tag.
 */
// TODO(wittjosiah): Migrate this label→Tag sync onto a pipeline too (source: labels; sink:
//   find-or-create Tag), rather than the imperative loop below.
const syncLabels = Effect.fn('gmail-sync.labels')(function* (mailbox: Mailbox.Mailbox, userId: string) {
  const api = yield* GoogleMailApi;
  const { labels } = yield* api.listLabels(userId);
  const labelMap = new Map<string, string>();
  const db = Obj.getDatabase(mailbox);
  if (db) {
    for (const labelItem of labels) {
      const tag = yield* Effect.promise(() =>
        Mailbox.findOrCreateGmailTag(db, { id: labelItem.id, name: labelItem.name }),
      );
      labelMap.set(labelItem.id, Mailbox.tagUri(tag));
    }
  }

  return labelMap;
});
