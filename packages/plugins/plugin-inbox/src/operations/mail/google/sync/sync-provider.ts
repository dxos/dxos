//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { Obj } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { EmailStage } from '@dxos/pipeline-email';
import { Person } from '@dxos/types';

import { GoogleMail } from '../../../../apis';
import { GMAIL_SOURCE } from '../../../../constants';
import { GoogleApiError, MailSyncError } from '../../../../errors';
import { GoogleMailApi } from '../../../../services';
import { Mailbox, SystemTags } from '../../../../types';
import { parseFromHeader } from '../../../util';
import {
  type MailSyncItem,
  MailSyncProvider,
  type MailSyncSource,
  type ReconcileItem,
  additionsToChanges,
  reconcileToChanges,
} from '../../mail-sync';
import { decodeBody, mapToMessage } from '../mapper';
import { GOOGLE_SYNC_CONFIG, fetchAttachments, fetchMessages } from './fetch';

/**
 * Gmail's {@link MailSyncProvider}: the message source, the label→tag map, and the fused decode+map.
 * Captures {@link GoogleMailApi} + {@link Resolver} so the harness never names them. Mirror of the JMAP
 * provider (`jmapMailSyncProvider`).
 */
export const googleMailSyncProvider = (options: {
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
        config: GOOGLE_SYNC_CONFIG,
        foreignKeySource: GMAIL_SOURCE,
        prepare: ({ mailbox, binding, token }) =>
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

            const toItem = (message: GoogleMail.Message): MailSyncItem => ({
              foreignId: message.id,
              key: Number.parseInt(message.internalDate),
              process: toMapped(message).pipe(Effect.provide(context)),
            });

            // Resolve the delta plan. First tick captures the current `historyId` before backfill; an
            // incremental run fetches `history.list` since the token; a stale token (HTTP 404) clears +
            // recaptures and falls back to the window scan.
            let capturedToken: string | undefined = token;
            let createdIds: readonly string[] | undefined;
            let reconcileItems: readonly ReconcileItem[] = [];
            if (token === undefined) {
              capturedToken = (yield* api.getProfile(userId)).historyId;
            } else {
              // Drain every `history.list` page before adopting the new `historyId`: Gmail returns the
              // mailbox's *current* record as `historyId` on every page, so stopping at page one would
              // advance the token past the unread pages and silently drop their changes.
              const result = yield* Effect.either(
                Effect.gen(function* () {
                  const records: GoogleMail.HistoryRecord[] = [];
                  let pageToken: string | undefined;
                  let historyId = token;
                  do {
                    const page = yield* api.listHistory(userId, { startHistoryId: token, pageToken });
                    records.push(...(page.history ?? []));
                    historyId = page.historyId;
                    pageToken = page.nextPageToken;
                  } while (pageToken !== undefined);
                  return { history: records, historyId };
                }),
              );
              if (Either.isRight(result)) {
                const history = result.right.history;
                capturedToken = result.right.historyId;
                createdIds = history.flatMap((record) => (record.messagesAdded ?? []).map((entry) => entry.message.id));
                reconcileItems = collectLabelChanges(history, labelMap);
                log('gmail sync: incremental delta', {
                  records: history.length,
                  created: createdIds.length,
                  retag: reconcileItems.length,
                });
              } else if (result.left instanceof GoogleApiError && result.left.code === 404) {
                log('gmail sync: history id stale, falling back to window scan');
                Cursor.clearToken(binding);
                capturedToken = (yield* api.getProfile(userId)).historyId;
              } else {
                return yield* Effect.fail(result.left);
              }
            }

            const source: MailSyncSource = {
              buildSource: ({ windows, filter, maxMessages, onEnumerated, onRetrieved, onTaken }) => {
                // Incremental replaces the forward window with the delta's created ids but keeps the
                // backward backfill window, so each tick still makes backfill progress.
                if (createdIds) {
                  onEnumerated(createdIds.length);
                }
                const additions = additionsToChanges(
                  fetchMessages({
                    userId,
                    label,
                    windows,
                    searchFilter: filter,
                    onEnumerated,
                    onRetrieved,
                    forwardIds: createdIds,
                  }).pipe(
                    Stream.map(toItem),
                    Stream.provideService(GoogleMailApi, api),
                    Stream.mapError(MailSyncError.wrap()),
                  ),
                  { maxMessages, onTaken },
                );
                // Merge the label-change reconcile branch into the single stream (empty on non-incremental runs).
                return Stream.merge(additions, reconcileToChanges(Stream.fromIterable(reconcileItems)));
              },
              nextToken: () => capturedToken,
            };
            return source;
          }).pipe(Effect.provide(context), Effect.mapError(MailSyncError.wrap())),
      };
    }),
  );

/**
 * Folds a `history.list` response's per-message `labelsAdded`/`labelsRemoved` into one merged retag
 * {@link ReconcileItem} per message (mapping Gmail label ids → Tag uris via `labelMap`). Merging per
 * message id is required because the commit indexes retags by foreign id — separate add/remove items for
 * the same message would otherwise clobber each other. Labels absent from `labelMap` (e.g. never synced)
 * are dropped.
 */
const collectLabelChanges = (
  history: readonly GoogleMail.HistoryRecord[],
  labelMap: ReadonlyMap<string, string>,
): readonly ReconcileItem[] => {
  const byMessage = new Map<string, { add: Set<string>; remove: Set<string> }>();
  const entryFor = (id: string) => {
    let entry = byMessage.get(id);
    if (!entry) {
      entry = { add: new Set(), remove: new Set() };
      byMessage.set(id, entry);
    }
    return entry;
  };
  const toTagIds = (labelIds: readonly string[]) =>
    labelIds.flatMap((labelId) => {
      const uri = labelMap.get(labelId);
      return uri ? [uri] : [];
    });
  for (const record of history) {
    for (const added of record.labelsAdded ?? []) {
      const entry = entryFor(added.message.id);
      for (const tagId of toTagIds(added.labelIds)) {
        entry.add.add(tagId);
        entry.remove.delete(tagId);
      }
    }
    for (const removed of record.labelsRemoved ?? []) {
      const entry = entryFor(removed.message.id);
      for (const tagId of toTagIds(removed.labelIds)) {
        entry.remove.add(tagId);
        entry.add.delete(tagId);
      }
    }
  }
  return [...byMessage.entries()]
    .filter(([, entry]) => entry.add.size > 0 || entry.remove.size > 0)
    .map(([foreignId, entry]) => ({
      _tag: 'retag',
      foreignId,
      addTagIds: [...entry.add],
      removeTagIds: [...entry.remove],
    }));
};

/**
 * Syncs the Gmail label dictionary to `Tag` objects. Returns a `gmailLabelId -> Tag uri` map used to
 * index messages by tag. A known system label (`STARRED`, `INBOX`, `CATEGORY_*`, …) maps onto the
 * shared canonical {@link SystemTags.SystemTag}; a custom user label gets a Gmail-scoped provider tag;
 * an unmapped system label (read-state, drafts, trash/spam) is intentionally dropped — see
 * {@link SystemTags.GMAIL_SYSTEM_TAGS}.
 */
// TODO(wittjosiah): Migrate this label→Tag sync onto a pipeline too (source: labels; sink:
//   find-or-create Tag), rather than the imperative loop below.
const syncLabels = Effect.fn('google-sync.labels')(function* (mailbox: Mailbox.Mailbox, userId: string) {
  const api = yield* GoogleMailApi;
  const { labels } = yield* api.listLabels(userId);
  const labelMap = new Map<string, string>();
  const db = Obj.getDatabase(mailbox);
  if (db) {
    for (const labelItem of labels) {
      const canonical = SystemTags.GMAIL_SYSTEM_TAGS[labelItem.id];
      if (canonical) {
        const tag = yield* Effect.promise(() => SystemTags.findOrCreateSystemTag(db, canonical));
        labelMap.set(labelItem.id, Mailbox.tagUri(tag));
      } else if (labelItem.type === 'system') {
        // Intentionally dropped system label (read-state, drafts, trash/spam) — no tag, no map entry.
        continue;
      } else {
        const tag = yield* Effect.promise(() =>
          Mailbox.findOrCreateGmailTag(db, { id: labelItem.id, name: labelItem.name }),
        );
        labelMap.set(labelItem.id, Mailbox.tagUri(tag));
      }
    }
  }

  return labelMap;
});
