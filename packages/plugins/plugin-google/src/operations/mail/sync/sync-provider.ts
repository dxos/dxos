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
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import {
  MailSyncError,
  type MailSyncItem,
  MailSyncProvider,
  type MailSyncSource,
  type ReconcileItem,
  type TagPushOp,
  type TagPushResult,
  batchPushOps,
  parseFromHeader,
  reconcileToChanges,
} from '@dxos/plugin-inbox/sync';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';
import { Person } from '@dxos/types';

import { GoogleMail } from '#apis';
import { GoogleMailApi, type GoogleMailApiError, type GoogleMailApiService } from '#services';

import { GMAIL_SOURCE } from '../../../constants';
import { GoogleApiError } from '../../../errors';
import { decodeBody, mapToMessage } from '../mapper';
import { findOrCreateGmailTag } from '../tags';
import { GOOGLE_SYNC_CONFIG, fetchAttachments, fetchMessages } from './fetch';
import { GMAIL_SYSTEM_TAGS, GMAIL_UNPUSHABLE_LABELS } from './system-tags';

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
        pushTags: (ops) => pushGmailTags(api, userId, ops),
        prepare: ({ mailbox, binding, token, maxMessages }) =>
          Effect.gen(function* () {
            const labelMap = yield* syncLabels(mailbox, userId).pipe(
              Effect.catch((error) => {
                log.catch(error);
                return Effect.succeed(new Map<string, string>());
              }),
            );

            // Mail from someone the space already knows is worth surfacing, so it lands under the
            // `important` folder on arrival. Resolved once per sync rather than per message, and
            // reusing Gmail's own `important` tag rather than inventing a parallel one — so a message
            // Gmail already flagged and one flagged here are the same thing to every reader.
            const db = Obj.getDatabase(mailbox);
            const knownSenderTagUri = db
              ? Mailbox.tagUri(yield* Effect.promise(() => SystemTags.findOrCreateSystemTag(db, 'important')))
              : undefined;

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
                // Gmail's own labels for this message, kept separate from anything added locally
                // below: tag sync uses the split to decide what pushes back (see `Insert.remoteTagUris`).
                const remoteTagUris = mapped.labelIds.flatMap((labelId) => {
                  const uri = labelMap.get(labelId);
                  return uri ? [uri] : [];
                });
                const tagUris = [...remoteTagUris];
                // `contact` is the Person the space already holds for this sender (resolved above to
                // link `message.sender.contact`), so no extra lookup is needed to know they are known.
                if (contact && knownSenderTagUri && !tagUris.includes(knownSenderTagUri)) {
                  tagUris.push(knownSenderTagUri);
                }
                const attachments = yield* fetchAttachments(userId, decoded.raw.id, decoded.attachments);
                return {
                  _tag: 'insert',
                  message: mapped.message,
                  foreignId: decoded.raw.id,
                  key: Number.parseInt(decoded.raw.internalDate),
                  tagUris,
                  remoteTagUris,
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
            const captureFreshDelta = Effect.map(api.getProfile(userId), (profile): DeltaPlan => ({
              token: profile.historyId,
              createdIds: undefined,
              reconcileItems: [],
              hasMoreDelta: false,
            }));

            // Resolve the delta plan. First tick captures the current `historyId` before backfill. An
            // incremental run fetches one bounded `history.list` page since the token (`maxResults` = the
            // per-run budget); `nextPageToken` drives `runAgain`, and the token advances to the last
            // processed record's id (not the current `historyId`) so a large delta drains across runs
            // without skipping unread pages. A stale token (HTTP 404) falls back to `captureFreshDelta`;
            // `Effect.catchIf` recovers only that case.
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
              // The label map inverted: tag uri → Gmail label id. Its keys are the eligible set for
              // tag reconciliation, so a user tag (which has no label) is never pushed — and neither
              // is a label Gmail derives rather than accepts (see `GMAIL_UNPUSHABLE_LABELS`), which
              // would otherwise 400 on every send.
              tagBindings: new Map(
                [...labelMap]
                  .filter(([labelId]) => !GMAIL_UNPUSHABLE_LABELS.has(labelId))
                  .map(([labelId, uri]) => [uri, labelId]),
              ),
            };
            return source;
          }).pipe(Effect.provide(context), Effect.mapError(MailSyncError.wrap())),
      };
    }),
  );

/**
 * HTTP statuses no retry can resolve: the message is gone, the label no longer exists, or the token
 * lacks `gmail.modify`. Ops that hit these are reported `settled` — refusing to advance past them
 * would block the reconciliation base forever, re-deriving the same doomed op on every run.
 */
const isPermanent = (error: unknown): boolean =>
  error instanceof GoogleApiError &&
  error.code !== undefined &&
  error.code >= 400 &&
  error.code < 500 &&
  error.code !== 429;

/**
 * Applies local tag changes at Gmail, grouped so messages sharing the same label movement go in one
 * `batchModify` (up to 1000 ids per call, and the API reports nothing per message).
 *
 * A batch is all-or-nothing, so its ops share an outcome: applied or permanently rejected → `settled`;
 * anything retryable (429, 5xx, transport) → `pending`, which holds the base back and re-derives the
 * same diff next run. Never fails the run — the harness decides what the outcome means.
 */
const pushGmailTags = (
  api: GoogleMailApiService,
  userId: string,
  ops: readonly TagPushOp[],
): Effect.Effect<TagPushResult, MailSyncError, never> =>
  Effect.gen(function* () {
    const byForeignId = new Map(ops.map((op) => [op.foreignId, op]));
    const settled: TagPushOp[] = [];
    const pending: TagPushOp[] = [];
    for (const batch of batchPushOps(ops)) {
      const batchOps = batch.foreignIds.flatMap((id: string) => {
        const op = byForeignId.get(id);
        return op ? [op] : [];
      });
      const outcome = yield* api
        .batchModifyMessages(userId, batch.foreignIds, {
          addLabelIds: batch.addLabelIds,
          removeLabelIds: batch.removeLabelIds,
        })
        .pipe(
          Effect.map(() => 'settled' as const),
          Effect.catch((error) => {
            const permanent = isPermanent(error);
            log.warn('gmail sync: tag push batch failed', {
              add: batch.addLabelIds,
              remove: batch.removeLabelIds,
              messages: batch.foreignIds.length,
              permanent,
              error,
            });
            return Effect.succeed(permanent ? ('settled' as const) : ('pending' as const));
          }),
        );
      (outcome === 'settled' ? settled : pending).push(...batchOps);
    }
    return { settled, pending };
  });

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
