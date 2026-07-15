//
// Copyright 2025 DXOS.org
//

import { format } from 'date-fns';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver, resolve } from '@dxos/extractor';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { ContentBlock, Person } from '@dxos/types';

import { GoogleMail } from '../../../../apis';
import { GMAIL_SOURCE } from '../../../../constants';
import { meta } from '../../../../meta';
import { GoogleMailApi, type GoogleMailApiError } from '../../../../services';
import { Mailbox } from '../../../../types';
import { onArrivalExtractors, readBindingOptions } from '../../../../util';
import { parseFromHeader } from '../../../util';
import { type DecodedMessage, decodeBody, mapToMessage } from '../mapper';
import { GMAIL_SYNC_CONFIG, fetchAttachments, fetchMessages } from './fetch';

/**
 * Progress-registry key for a mailbox's Gmail sync monitor — the mailbox URI plus `#sync` so distinct
 * monitor types (e.g. `#topics`) can coexist for one mailbox. `MailboxArticle` subscribes to show the
 * sync meter.
 */
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) => Obj.getURI(mailbox).toString() + '#sync';

export type SyncGmailProps = {
  binding: Ref.Ref<Cursor.Cursor>;
  userId?: string;
  /**
   * Defaults to all mail (every folder incl. Sent) so full conversations sync; a label restricts to
   * that folder. See `fetchMessageIds` for how `'all'` maps to the query.
   */
  label?: string;
  /**
   * Candidate messages this run considers before requesting `Operation.runAgain()`. Test-only
   * override — production uses the default.
   */
  maxMessages?: number;
  /** Reference "now" for window/horizon resolution. Test-only (pins the clock); defaults to `new Date()`. */
  now?: Date;
};

/**
 * Runs the Gmail sync pipeline for a binding against the {@link GoogleMailApi} service. Every run is
 * bidirectional — syncs new mail above the cursor's `max` (ascending) and backfills from `min` down to
 * the horizon (descending) — so an interrupted or capped run resumes both halves from where it left
 * off; the cursor is the only durable state (`Cursor.resolveWindows`). Requires the service rather than
 * providing it, so a test can drive the sync against a mock API + real ECHO db. The return type is
 * written out (not inferred) so the emitted `.d.ts` can name it without expanding unnameable
 * cross-package types (TS2883).
 */
export const syncGmail = ({
  binding: bindingRef,
  userId = 'me',
  label = 'all',
  maxMessages = GMAIL_SYNC_CONFIG.maxItemsPerRun,
  now = new Date(),
}: SyncGmailProps): Effect.Effect<
  { newMessages: number },
  GoogleMailApiError | EntityNotFoundError,
  GoogleMailApi | Database.Service | Resolver | Capability.Service | Operation.Service
> =>
  Effect.gen(function* () {
    const binding = yield* Database.load(bindingRef);
    // The integration mechanism only ever creates external-sync cursors for Gmail.
    if (!Cursor.isExternal(binding)) {
      return { newMessages: 0 };
    }
    const mailbox = yield* Database.load(binding.spec.target);
    if (!Mailbox.instanceOf(mailbox)) {
      return { newMessages: 0 };
    }
    const db = Obj.getDatabase(mailbox);
    if (!db) {
      return { newMessages: 0 };
    }

    const targetOptions = readBindingOptions(binding);
    const horizon = Cursor.resolveHorizon({ now, syncBackDays: targetOptions.syncBackDays });
    const maxKey = Cursor.parseKey(binding.max);
    const minKey = Cursor.parseKey(binding.min);
    const windows = Cursor.resolveWindows({ maxKey, minKey, now, horizon });

    const formatWindow = (window: Cursor.Window | undefined) =>
      window && { start: format(window.start, 'yyyy-MM-dd'), end: format(window.end, 'yyyy-MM-dd') };
    log.info('syncing...', {
      mailbox: Obj.getURI(mailbox),
      userId,
      maxKey,
      minKey,
      forward: formatWindow(windows.forward),
      backward: formatWindow(windows.backward),
    });

    const feed = yield* Database.load(mailbox.feed);

    // Resolve the child tag index so provider-label tags can be applied synchronously during commit.
    const tagIndex = yield* Database.load(mailbox.tags);

    // Pool already-sent drafts once; `EmailStage.reconcileDrafts` matches incoming messages so a
    // canonical copy's arrival removes its now-redundant draft during commit.
    const draftPool = yield* EmailStage.queryDraftPool(mailbox);
    const labelMap = yield* syncLabels(mailbox, userId).pipe(
      Effect.catchAll((error) => {
        log.catch(error);
        return Effect.succeed(new Map<string, string>());
      }),
    );

    // Resolve the sender contact, build the ECHO message, and map label ids to tag URIs via the
    // Gmail-specific label map.
    const mapToMessageStage: Stage.Stage<DecodedMessage, EmailStage.Mapped, never, Resolver | GoogleMailApi> =
      Stage.map('map-to-message', (decoded: DecodedMessage) =>
        Effect.gen(function* () {
          const fromHeader = decoded.raw.payload.headers.find(({ name }) => name === 'From');
          const from = fromHeader ? parseFromHeader(fromHeader.value) : undefined;
          // Drop filtered messages before the costly attachment fetch; undefined removes the item.
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
        }),
      );

    // fetch → dedup → decode → map → extract-contacts → (optional) on-arrival extractors →
    // record-threads → commit each page. The Cursor layer advances the binding cursor per page.
    const stats: Cursor.Stats = { newMessages: 0 };

    // Coarse sync telemetry written to the transient stats store (keyed by mailbox) for a live debug
    // surface. Optional — `getAll` yields nothing without a host plugin, so a no-op in production.
    // Write only this plugin's compartment; other plugins own their own slots.
    const statsCompartments = (yield* Capability.getAll(AppCapabilities.StatsPanel)).map((store) =>
      store.compartment(meta.profile.key),
    );

    // Cooperative cancellation: the meter's cancel control aborts the controller, which drains the
    // stream so the run stops without error.
    const controller = new AbortController();

    // Live progress monitor, keyed by the mailbox URI so surfaces can subscribe. The registry is a
    // singleton from an always-loaded host; absence is a wiring bug, not a typed failure — `orDie`
    // keeps the error channel provider-scoped.
    const progressRegistry = yield* Capability.get(AppCapabilities.ProgressRegistry).pipe(Effect.orDie);
    const progressMonitor = progressRegistry.register(createSyncProgressKey(mailbox), {
      label: mailbox.name ?? 'Mailbox',
      onCancel: () => {
        controller.abort();
      },
    });

    // Accumulate the retrieval total as each chunk's ids are enumerated (before any full fetch), so the
    // meter renders a determinate bar. Chunks enumerate before their ids reach fetch, so `total` leads
    // `current`.
    let totalToRetrieve = 0;
    const addToTotal = (count: number) => {
      totalToRetrieve += count;
      progressMonitor.total(totalToRetrieve);
    };

    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    const threads = new Set<string>();
    const senders = new Set<string>();
    const coverage = { plain: 0, synthesizedMarkdown: 0, htmlOnly: 0, none: 0 };

    // Per-run funnel counts, each stage narrower than the last: `taken` (post-dedup candidates — the
    // cap gauge) → `processed` (post-decode/map) → `stats.newMessages` (committed). `extent` is the
    // observed key range, folded into the cursor at run end so a run that commits nothing still advances.
    let taken = 0;
    let processed = 0;
    let attachmentCount = 0;
    let finishedAt: string | undefined;
    let finishedMs: number | undefined;
    const extent: Cursor.Extent = { maxKey: 0, minKey: 0 };
    const publishStats = () => {
      if (statsCompartments.length === 0) {
        return;
      }

      const snapshot = {
        startedAt,
        ...(finishedAt ? { finishedAt } : {}),
        durationMs: (finishedMs ?? Date.now()) - startMs,
        range: {
          syncBackDays: targetOptions.syncBackDays,
          forward: formatWindow(windows.forward),
          backward: formatWindow(windows.backward),
        },
        taken,
        processed,
        newMessages: stats.newMessages,
        threads: threads.size,
        senders: senders.size,
        coverage,
        attachments: attachmentCount,
      };

      statsCompartments.forEach((compartment) => compartment.set(snapshot));
    };

    // Pass-through stage: accumulates telemetry per mapped message, publishing a snapshot so a
    // subscribed surface ticks up live.
    const collectStats = Stage.map('collect-stats', (mapped: EmailStage.Mapped) =>
      Effect.sync(() => {
        processed += 1;
        if (mapped.message.threadId) {
          threads.add(mapped.message.threadId);
        }
        if (mapped.message.sender?.email) {
          senders.add(mapped.message.sender.email);
        }
        const textBlocks = mapped.message.blocks.filter((block): block is ContentBlock.Text => block._tag === 'text');
        const has = (mimeType: string) => textBlocks.some((block) => block.mimeType === mimeType);
        if (has('text/plain')) {
          coverage.plain += 1;
        } else if (has('text/markdown')) {
          coverage.synthesizedMarkdown += 1;
        } else if (has('text/html')) {
          coverage.htmlOnly += 1;
        } else {
          coverage.none += 1;
        }
        attachmentCount += mapped.attachments?.length ?? 0;
        publishStats();
        return mapped;
      }),
    );

    //
    // Start pipeline
    //
    // `fetchMessages` covers both halves as one unbounded stream; the per-run cap is applied after dedup
    // so it counts only genuinely-new messages — capping before would let a dense boundary day's
    // re-enumerated messages consume the budget and stall the cursor. `taken` then tells us whether the
    // cap truncated the run (→ re-run) or both windows were exhausted (→ complete backfill).
    yield* fetchMessages({
      userId,
      label,
      windows,
      searchFilter: targetOptions.filter,
      onEnumerated: addToTotal,
      // Advance at retrieval so `current` reaches `total`; counting after downstream dedup/decode drops
      // would leave the bar short of 100%.
      onRetrieved: () => progressMonitor.advance(1),
    }).pipe(
      Cursor.dedupStage<GoogleMail.Message>(
        'dedup',
        (message) => message.id,
        (message) => Number.parseInt(message.internalDate),
      ),
      Stream.take(maxMessages),
      Stream.tap(() => Effect.sync(() => (taken += 1))),
      decodeBodyStage,
      // HTML→markdown (turndown) disabled: measurable sync CPU, deferred pending benchmarking. Bodies
      // stay raw HTML for now.
      // TODO(wittjosiah): Re-enable (or replace with a cheaper HTML→text) once the benchmark
      //   (docs/superpowers/specs/2026-07-04-mail-sync-performance-exploration.md) quantifies it.
      // EmailStage.htmlToMarkdown,
      mapToMessageStage,
      EmailStage.processAttachments(),
      onArrivalExtractors(mailbox),
      EmailStage.extractContacts(),
      EmailStage.reconcileDrafts(draftPool),
      collectStats,
      EmailStage.toCommitUnit({ tagIndex }),
      Stream.grouped(GMAIL_SYNC_CONFIG.commitPageSize),
      Pipeline.run({ sink: Cursor.commit }),
      Effect.provide(
        Cursor.layer({
          cursor: binding,
          feed,
          foreignKeySource: GMAIL_SOURCE,
          maxKey,
          minKey,
          trackRange: true,
          stats,
          extent,
        }),
      ),
      Pipeline.abortWith(
        controller.signal,
        // TODO(wittjosiah): Could this note+remove pairing be upstreamed into abortWith itself?
        Effect.sync(() => {
          log('gmail sync cancelled', { mailbox: Obj.getURI(mailbox) });
          progressMonitor.note('Cancelled');
          progressMonitor.remove();
        }),
      ),
      Effect.tapError((error) =>
        Effect.sync(() => {
          // Log the raw error; the meter shows only a short reason (the full exception — provider
          // errors, auth tokens — must not reach the UI).
          log.warn('gmail sync failed', { error });
          progressMonitor.fail('Sync failed');
        }),
      ),
    );

    // Flush indexes once at end of run so cross-run dedup / contact resolution observe this run's writes
    // (per-page commits no longer flush — see `Cursor.commit`).
    yield* Database.flush({ indexes: true });

    // Final publish so the committed `newMessages` count and the run's end time / duration are recorded
    // after the last mid-stream snapshot.
    finishedMs = Date.now();
    finishedAt = new Date(finishedMs).toISOString();
    publishStats();

    // On cancel, `Pipeline.abortWith`'s onAbort already noted 'Cancelled' and removed the monitor, so
    // only the completed path has post-run work.
    if (!controller.signal.aborted) {
      progressMonitor.done();
      progressMonitor.remove();

      // Fold the run's observed key extent so the window advances even if every scanned message was
      // dedup-dropped (e.g. a crash orphaned feed appends) — prevents an identical re-scan / infinite re-run.
      Cursor.extendRange(binding, extent);

      const capped = taken >= maxMessages;
      log('gmail sync run finished', {
        mailbox: Obj.getURI(mailbox),
        taken,
        maxMessages,
        capped,
        newMessages: stats.newMessages,
        action: capped ? 'runAgain' : 'completeBackfill',
      });
      if (!capped) {
        // Both halves exhausted naturally (not just capped) — the backward half reached the horizon.
        Cursor.completeBackfill(binding, horizon.getTime());
      } else {
        // Capped: more to sync. A re-run (rather than an in-process loop) keeps this invocation bounded
        // and lets the durable runtime schedule the continuation. Progress is already committed, so the
        // next run resumes from the advanced cursor.
        yield* Operation.runAgain().pipe(Effect.orDie);
      }
    }

    log('sync complete', { newMessages: stats.newMessages, cancelled: controller.signal.aborted, taken });
    return {
      newMessages: stats.newMessages,
    };
  }).pipe(Effect.withSpan('gmail-sync'));

/** Gmail-specific decode stage: base64-decode the body; drop messages with no body. */
const decodeBodyStage: Stage.Stage<GoogleMail.Message, DecodedMessage, never, never> = Stage.map(
  'decode-body',
  (message: GoogleMail.Message) => Effect.sync(() => decodeBody(message) ?? undefined),
);

/**
 * Syncs the Gmail label dictionary to `Tag` objects (one per label, keyed by the Gmail label-id).
 * Returns a `gmailLabelId -> Tag uri` map used to index messages by tag.
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
