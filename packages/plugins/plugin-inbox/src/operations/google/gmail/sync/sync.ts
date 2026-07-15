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
 * Progress-registry key for a mailbox's Gmail sync monitor — the mailbox URI with a `#sync` suffix so
 * distinct monitor types (e.g. `#topics`) can coexist for the same mailbox. Peer of
 * `createTopicsProgressKey`; `MailboxArticle` subscribes to it to show the sync meter.
 */
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) => Obj.getURI(mailbox).toString() + '#sync';

export type SyncGmailProps = {
  binding: Ref.Ref<Cursor.Cursor>;
  userId?: string;
  /**
   * Default to all mail (every folder incl. Sent) so full conversations sync; a specific label
   * restricts to that folder. See `fetchMessageIds` for how `'all'` maps to the query.
   */
  label?: string;
  /**
   * Caps how many candidate messages this run considers before requesting `Operation.runAgain()` to
   * pick up where it left off. Test-only override — production always uses the default.
   */
  maxMessages?: number;
  /** Reference "now" for window/horizon resolution. Test-only (pins the clock); defaults to `new Date()`. */
  now?: Date;
};

/**
 * Runs the Gmail sync pipeline for a binding against the {@link GoogleMailApi} service (plus the
 * ambient operation services). Every run is bidirectional: it syncs new mail since the cursor's `high`
 * watermark (ascending) and continues backfilling from `low` down to the sync horizon (descending), so
 * an interrupted or capped run always resumes both halves from exactly where it left off — the cursor
 * is the only durable state (see `@dxos/link`'s `Cursor.resolveWindows`). It *requires* the service
 * rather than providing HTTP/credentials itself, so a test can drive the whole sync against a mock
 * Gmail API + a real ECHO db — the operation handler below wraps it with the Live layer. The return
 * type is written out (not inferred) so the module's emitted `.d.ts` can name it without the compiler
 * expanding unnameable cross-package types (TS2883); the deployed operation stays portable via
 * `Operation.opaqueHandler`.
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
    const highKey = Cursor.parseKey(binding.high);
    const lowKey = Cursor.parseKey(binding.low);
    const windows = Cursor.resolveWindows({ highKey, lowKey, now, horizon });

    const formatWindow = (window: Cursor.Window | undefined) =>
      window && { start: format(window.start, 'yyyy-MM-dd'), end: format(window.end, 'yyyy-MM-dd') };
    log.info('syncing...', {
      mailbox: Obj.getURI(mailbox),
      userId,
      highKey,
      lowKey,
      forward: formatWindow(windows.forward),
      backward: formatWindow(windows.backward),
    });

    const feed = yield* Database.load(mailbox.feed);

    // Resolve the child tag index so provider-label tags can be applied synchronously during commit.
    const tagIndex = yield* Database.load(mailbox.tags);

    // Pool already-sent drafts once for this run; `EmailStage.reconcileDrafts` matches each incoming
    // message against it so the canonical copy's arrival removes its now-redundant draft in the commit.
    const draftPool = yield* EmailStage.queryDraftPool(mailbox);
    const labelMap = yield* syncLabels(mailbox, userId).pipe(
      Effect.catchAll((error) => {
        log.catch(error);
        return Effect.succeed(new Map<string, string>());
      }),
    );

    // Resolve the sender contact, build the ECHO message, and resolve label ids to tag URIs via the
    // (Gmail-specific) label map captured here.
    const mapToMessageStage: Stage.Stage<DecodedMessage, EmailStage.Mapped, never, Resolver | GoogleMailApi> =
      Stage.map('map-to-message', (decoded: DecodedMessage) =>
        Effect.gen(function* () {
          const fromHeader = decoded.raw.payload.headers.find(({ name }) => name === 'From');
          const from = fromHeader ? parseFromHeader(fromHeader.value) : undefined;
          // Drop messages excluded by the mailbox's filters before the costly attachment fetch;
          // returning undefined removes the item from the pipeline (see `decodeBodyStage`).
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

    // Coarse sync telemetry (message/thread/sender counts + body-part coverage) written to the
    // transient stats store, keyed by mailbox, so a surface (plugin-debug) can display it live. The
    // store is optional — `getAll` yields nothing without a host plugin, so this is a no-op in
    // production; only body-part coverage (which parts each message carried) is Gmail-specific.
    // Write only this plugin's compartment (indexed by plugin key); other plugins own their own slots.
    const statsCompartments = (yield* Capability.getAll(AppCapabilities.StatsPanel)).map((store) =>
      store.compartment(meta.profile.key),
    );

    // Cooperative cancellation: the meter's cancel control aborts the controller; the `cancelStage`
    // below then drops all further messages so the stream drains and the run stops without error.
    const controller = new AbortController();

    // Live progress monitor. Keyed by the mailbox URI so MailboxArticle and the R0 popover can
    // subscribe to this run. The registry is a singleton contributed by an always-loaded host
    // (`plugin-progress`); tests contribute one via `inboxSyncTestServices`. Absence is a wiring
    // bug, not a typed failure — `orDie` keeps the operation's error channel provider-scoped.
    const progressRegistry = yield* Capability.get(AppCapabilities.ProgressRegistry).pipe(Effect.orDie);
    const progressMonitor = progressRegistry.register(createSyncProgressKey(mailbox), {
      label: mailbox.name ?? 'Mailbox',
      onCancel: () => {
        controller.abort();
      },
    });

    // Accumulate the exact retrieval total as each date chunk's id list is enumerated (known before any
    // full-message fetch), revising the meter's total so it renders a determinate bar even without a
    // time estimate. Chunks enumerate serially and always before their ids reach the fetch stage, so
    // `total` leads `current`.
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

    let processed = 0;
    let attachmentCount = 0;
    let finishedAt: string | undefined;
    let finishedMs: number | undefined;
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
        processed,
        newMessages: stats.newMessages,
        threads: threads.size,
        senders: senders.size,
        coverage,
        attachments: attachmentCount,
      };

      statsCompartments.forEach((compartment) => compartment.set(snapshot));
    };

    // Pass-through stage: accumulates telemetry as each mapped message flows by, publishing a fresh
    // snapshot so a subscribed surface ticks up live during the sync.
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
    // `fetchMessages` covers both halves (new mail forward + backfill backward) as one unbounded stream;
    // the per-run cap is applied *after* dedup so it counts only genuinely-new messages — the windows
    // re-enumerate each boundary day's already-synced messages (newest-first), so capping before dedup
    // would let a dense boundary day consume the whole budget and stall the cursor. `scanned` (new
    // messages this run) then tells us whether the cap truncated the run (→ re-run) or both windows were
    // exhausted (→ complete the backfill). `Stream.take` halts fetch once the quota is met.
    let scanned = 0;
    yield* fetchMessages({
      userId,
      label,
      windows,
      searchFilter: targetOptions.filter,
      onEnumerated: addToTotal,
      // Advance at retrieval (one per fetched message) so `current` reaches `total`; dedup/decode drops
      // happen downstream of the source, so counting there would leave the bar short of 100%.
      onRetrieved: () => progressMonitor.advance(1),
    }).pipe(
      Cursor.dedupStage<GoogleMail.Message>(
        'dedup',
        (message) => message.id,
        (message) => Number.parseInt(message.internalDate),
      ),
      Stream.take(maxMessages),
      Stream.tap(() => Effect.sync(() => (scanned += 1))),
      decodeBodyStage,
      // HTML→markdown (turndown) intentionally disabled: it was a measurable share of sync CPU and is
      // deferred pending benchmark-driven re-evaluation. Bodies stay raw HTML for now.
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
          highKey,
          lowKey,
          trackRange: true,
          stats,
        }),
      ),
      Pipeline.abortWith(controller.signal),
      Effect.tapError((error) =>
        Effect.sync(() => {
          // Log the raw error for debugging; the meter shows only a short reason (the full exception —
          // provider errors, auth tokens — must not reach the UI).
          log.warn('gmail sync failed', { error });
          progressMonitor.fail('Sync failed');
        }),
      ),
    );

    // Flush indexes once, at the end of the run, so cross-run dedup / contact resolution observe this
    // run's writes (per-page commits no longer flush — see `Cursor.commit`).
    yield* Database.flush({ indexes: true });

    // Final publish so the committed `newMessages` count (advanced per page by the commit sink) is
    // reflected after the last item's mid-stream snapshot, and the run's end time / total duration
    // are recorded.
    finishedMs = Date.now();
    finishedAt = new Date(finishedMs).toISOString();
    publishStats();

    if (controller.signal.aborted) {
      progressMonitor.note('Cancelled');
      progressMonitor.remove();
    } else {
      progressMonitor.done();
      progressMonitor.remove();

      if (scanned < maxMessages) {
        // Both halves exhausted naturally (not just capped) — the backward half reached the horizon.
        Cursor.completeBackfill(binding, horizon.getTime());
      } else {
        // Capped: there is more to sync. Requesting a re-run — rather than looping in-process — keeps
        // this invocation's duration bounded and lets the durable runtime schedule the continuation
        // (the trigger dispatcher re-queues it; `sync-connection` re-invokes it in-app). Progress is
        // already committed and flushed above, so the next run picks up from the advanced cursor.
        yield* Operation.runAgain().pipe(Effect.orDie);
      }
    }

    log('sync complete', { newMessages: stats.newMessages, cancelled: controller.signal.aborted, scanned });
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
