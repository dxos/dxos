//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
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
import { GoogleMailApi, type GoogleMailApiError } from '../../../../services';
import { Mailbox, SystemTags } from '../../../../types';
import { parseFromHeader } from '../../../util';
import {
  type MailSyncItem,
  MailSyncProvider,
  type MailSyncSource,
  type ReconcileItem,
  reconcileToChanges,
} from '../../mail-sync';
import { decodeBody, mapToMessage } from '../mapper';
import { findOrCreateGmailTag } from '../tags';
import { GOOGLE_SYNC_CONFIG, fetchAttachments, fetchMessages } from './fetch';
import { GMAIL_SYSTEM_TAGS } from './system-tags';

/** The resolved delta for one run — either a fresh capture (no delta) or a fetched `history.list` page. */
type DeltaPlan = {
  readonly token: string | undefined;
  readonly createdIds: readonly string[] | undefined;
  readonly reconcileItems: readonly ReconcileItem[];
  readonly hasMoreDelta: boolean;
};

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
        prepare: ({ mailbox, binding, token, maxMessages }) =>
          Effect.gen(function* () {
            const labelMap = yield* syncLabels(mailbox, userId).pipe(
              Effect.catchAll((error) => {
                log.catch(error);
                return Effect.succeed(new Map<string, string>());
              }),
            );

            // Fused decode + map; `undefined` drops the item (no body, or a filtered sender). Constructs
            // the `Change` (an `insert`) directly, so no separate wrapping stage is needed downstream.
            const toMapped = (
              message: GoogleMail.Message,
            ): Effect.Effect<EmailStage.Change | undefined, never, GoogleMailApi | Resolver> =>
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
                  _tag: 'insert',
                  message: mapped.message,
                  foreignId: decoded.raw.id,
                  key: Number.parseInt(decoded.raw.internalDate),
                  tagUris,
                  attachments,
                } satisfies EmailStage.Change;
              });

            const toItem = (message: GoogleMail.Message): MailSyncItem => ({
              foreignId: message.id,
              key: Number.parseInt(message.internalDate),
              process: toMapped(message).pipe(Effect.provide(context)),
            });

            // The first-tick baseline (and stale-token fallback): the mailbox's current `historyId`
            // with no delta applied. Defined once so both call sites share the same capture.
            const captureFreshDelta = Effect.map(
              api.getProfile(userId),
              (profile): DeltaPlan => ({
                token: profile.historyId,
                createdIds: undefined,
                reconcileItems: [],
                hasMoreDelta: false,
              }),
            );

            // Resolve the delta plan. First tick captures the current `historyId` before backfill. An
            // incremental run fetches one bounded `history.list` page since the token (`maxResults` = the
            // per-run budget); `nextPageToken` drives the harness's `runAgain`, and the token advances to
            // the last processed record's id (not the mailbox's current `historyId`) so a large delta
            // drains across runs without skipping unread pages. A stale token (HTTP 404) falls back to
            // `captureFreshDelta` — `Effect.catchIf` recovers only that case, propagating anything else.
            const resolveDelta: Effect.Effect<DeltaPlan, GoogleMailApiError, never> =
              token === undefined
                ? captureFreshDelta
                : api.listHistory(userId, { startHistoryId: token, maxResults: maxMessages }).pipe(
                    Effect.map((result): DeltaPlan => {
                      const history = result.history ?? [];
                      const createdIds = history.flatMap((record) =>
                        (record.messagesAdded ?? []).map((entry) => entry.message.id),
                      );
                      const reconcileItems = collectLabelChanges(history, labelMap);
                      const hasMoreDelta = result.nextPageToken !== undefined;
                      // Advance to the last processed record while more remain; otherwise to the
                      // mailbox's current id (fully caught up).
                      const lastRecord = history[history.length - 1];
                      log('gmail sync: incremental delta', {
                        records: history.length,
                        created: createdIds.length,
                        retag: reconcileItems.length,
                        hasMoreDelta,
                      });
                      return {
                        token: hasMoreDelta && lastRecord ? lastRecord.id : result.historyId,
                        createdIds,
                        reconcileItems,
                        hasMoreDelta,
                      };
                    }),
                    Effect.catchIf(
                      (error) => error instanceof GoogleApiError && error.code === 404,
                      () => {
                        log('gmail sync: history id stale, falling back to window scan');
                        Cursor.clearToken(binding);
                        return captureFreshDelta;
                      },
                    ),
                  );
            const { token: capturedToken, createdIds, reconcileItems, hasMoreDelta } = yield* resolveDelta;

            const source: MailSyncSource = {
              buildSource: ({ windows, filter, onEnumerated, onRetrieved }) => {
                // Incremental replaces the forward window with the delta's created ids but keeps the
                // backward backfill window, so each tick still makes backfill progress. When a user filter
                // is set, the delta's account-wide created ids would bypass it — so fall back to the
                // filtered forward window scan for additions (the delta still drives reconcile).
                const forwardIds = filter ? undefined : createdIds;
                if (forwardIds) {
                  onEnumerated(forwardIds.length);
                }
                return {
                  additions: fetchMessages({
                    userId,
                    label,
                    windows,
                    searchFilter: filter,
                    onEnumerated,
                    onRetrieved,
                    forwardIds,
                  }).pipe(
                    Stream.map(toItem),
                    Stream.provideService(GoogleMailApi, api),
                    Stream.mapError(MailSyncError.wrap()),
                  ),
                  // Empty on non-incremental runs; resolved to `Change`s by the shared `reconcileToChanges`.
                  reconciles: reconcileToChanges(Stream.fromIterable(reconcileItems)),
                };
              },
              nextToken: () => capturedToken,
              reconcileForeignIds: reconcileItems.map((item) => item.foreignId),
              hasMoreDelta: () => hasMoreDelta,
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
 * {@link GMAIL_SYSTEM_TAGS}.
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
      const canonical = GMAIL_SYSTEM_TAGS[labelItem.id];
      if (canonical) {
        const tag = yield* Effect.promise(() => SystemTags.findOrCreateSystemTag(db, canonical));
        labelMap.set(labelItem.id, Mailbox.tagUri(tag));
      } else if (labelItem.type === 'system') {
        // Intentionally dropped system label (read-state, drafts, trash/spam) — no tag, no map entry.
        continue;
      } else {
        const tag = yield* Effect.promise(() => findOrCreateGmailTag(db, { id: labelItem.id, name: labelItem.name }));
        labelMap.set(labelItem.id, Mailbox.tagUri(tag));
      }
    }
  }

  return labelMap;
});
