//
// Copyright 2025 DXOS.org
//

import { format, subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver, resolve } from '@dxos/extractor';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { SyncBinding } from '@dxos/plugin-connector';
import { ContentBlock, Cursor, Person } from '@dxos/types';

import { GoogleMail } from '../../../../apis';
import { GMAIL_SOURCE } from '../../../../constants';
import { meta } from '../../../../meta';
import { GoogleMailApi, type GoogleMailApiError } from '../../../../services';
import { EmailCommit } from '../../../../sync';
import { Mailbox } from '../../../../types';
import { onArrivalExtractors, readBindingOptions } from '../../../../util';
import { parseFromHeader } from '../../../util';
import { type DecodedMessage, decodeBody, mapToMessage } from '../mapper';
import { STREAMING_CONFIG, fetchAttachments, fetchMessages } from './fetch';

/**
 * Progress-registry key for a mailbox's Gmail sync monitor — the mailbox URI with a `#sync` suffix so
 * distinct monitor types (e.g. `#topics`) can coexist for the same mailbox. Peer of
 * `createTopicsProgressKey`; `MailboxArticle` subscribes to it to show the sync meter.
 */
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) => Obj.getURI(mailbox).toString() + '#sync';

export type SyncGmailProps = {
  binding: Ref.Ref<SyncBinding.SyncBinding>;
  userId?: string;
  /**
   * Default to all mail (every folder incl. Sent) so full conversations sync; a specific label
   * restricts to that folder. See `fetchMessages` for how `'all'` maps to the query.
   */
  label?: string;
  /** Lower (oldest) bound of the range to sync — unix ms or yyyy-MM-dd. Defaults to 30 days ago. */
  after?: string | number;
  /** Upper (newest) bound of the range — unix ms or yyyy-MM-dd. Defaults to today. Backfill passes the oldest-synced date here to cap a backward walk. */
  before?: string | number;
  /**
   * Override the walk direction. Default is inferred from the cursor: no cursor → `backward` (initial
   * sync, newest-first from today); a cursor → `forward` (incremental, from the cursor). Pass
   * `backward` explicitly (with `before` = oldest-synced) to backfill older gaps.
   */
  direction?: Cursor.Direction;
};

/**
 * Runs the Gmail sync pipeline for a binding against the {@link GoogleMailApi} service (plus the
 * ambient operation services). It *requires* the service rather than providing HTTP/credentials
 * itself, so a test can drive the whole sync against a mock Gmail API + a real ECHO db — the
 * operation handler below wraps it with the Live layer. The return type is written out (not inferred)
 * so the module's emitted `.d.ts` can name it without the compiler expanding unnameable cross-package
 * types (TS2883); the deployed operation stays portable via `Operation.opaqueHandler`.
 */
export const syncGmail = ({
  binding: bindingRef,
  userId = 'me',
  label = 'all',
  after = format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  before,
  direction,
}: SyncGmailProps): Effect.Effect<
  { newMessages: number },
  GoogleMailApiError | EntityNotFoundError,
  GoogleMailApi | Database.Service | Resolver | Capability.Service | Operation.Service
> =>
  Effect.gen(function* () {
    const binding = yield* Database.load(bindingRef);
    const mailbox = Relation.getTarget(binding);
    // The integration mechanism only ever binds Mailboxes for Gmail.
    if (!Mailbox.instanceOf(mailbox)) {
      return { newMessages: 0 };
    }
    const db = Obj.getDatabase(mailbox);
    if (!db) {
      return { newMessages: 0 };
    }

    const targetOptions = readBindingOptions(binding);
    const cursor = yield* Database.load(binding.cursor);
    const cursorKey = Cursor.parseKey(cursor.value);

    // Range + direction (shared resolver, so JMAP and future providers behave identically): no cursor →
    // backward initial from today to the horizon; cursor → forward incremental; `direction: backward` +
    // `before` = oldest-synced → backfill older gaps (never advances the monotonic cursor).
    const {
      direction: resolvedDirection,
      start: rangeStart,
      end: upperBound,
    } = Cursor.resolveWindow({
      cursorKey,
      now: new Date(),
      after,
      before,
      direction,
      syncBackDays: targetOptions.syncBackDays,
    });
    const rangeEnd = upperBound;
    const start = rangeStart;
    log.info('syncing...', {
      mailbox: Obj.getURI(mailbox),
      userId,
      cursorKey,
      direction: resolvedDirection,
      start: format(start, 'yyyy-MM-dd'),
      end: format(rangeEnd, 'yyyy-MM-dd'),
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
    // record-threads → commit each page. The SyncBinding layer advances the binding cursor per page.
    const stats: SyncBinding.Stats = { newMessages: 0 };

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

    // TODO(burdon): Should be only one?
    // Live progress monitor (optional — no host in headless/test runs, so `getAll` yields nothing).
    // Keyed by the mailbox URI so MailboxArticle and the R0 popover can subscribe to this run.
    const progressMonitors = (yield* Capability.getAll(AppCapabilities.ProgressRegistry)).map((registry) =>
      registry.register(createSyncProgressKey(mailbox), {
        label: mailbox.name ?? 'Mailbox',
        onCancel: () => {
          controller.abort();
        },
      }),
    );

    const updateProgress = (by: number) => progressMonitors.forEach((monitor) => monitor.advance(by));

    // Accumulate the exact retrieval total as each date chunk's id list is enumerated (known before any
    // full-message fetch), revising the meter's total so it renders a determinate bar even without a
    // time estimate. Chunks enumerate serially and always before their ids reach the fetch stage, so
    // `total` leads `current`.
    let totalToRetrieve = 0;
    const addToTotal = (count: number) => {
      totalToRetrieve += count;
      progressMonitors.forEach((monitor) => monitor.total(totalToRetrieve));
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
          direction: resolvedDirection,
          start: format(start, 'yyyy-MM-dd'),
          end: format(rangeEnd, 'yyyy-MM-dd'),
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
    yield* fetchMessages({
      userId,
      label,
      direction: resolvedDirection,
      start,
      end: rangeEnd,
      searchFilter: targetOptions.filter,
      onEnumerated: addToTotal,
      // Advance at retrieval (one per fetched message) so `current` reaches `total`; dedup/decode drops
      // happen downstream of the source, so counting there would leave the bar short of 100%.
      onRetrieved: () => updateProgress(1),
    }).pipe(
      SyncBinding.dedupStage<GoogleMail.Message>(
        'dedup',
        (message) => message.id,
        (message) => Number.parseInt(message.internalDate),
        { direction: resolvedDirection },
      ),
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
      EmailCommit.toCommitUnit(),
      Stream.grouped(STREAMING_CONFIG.pageSize),
      Pipeline.run({ sink: SyncBinding.commit }),
      Effect.provide(
        SyncBinding.layer({
          binding,
          feed,
          tagIndex,
          foreignKeySource: GMAIL_SOURCE,
          cursorKey,
          stats,
        }),
      ),
      Pipeline.abortWith(controller.signal),
      Effect.tapError((error) =>
        Effect.sync(() => {
          // Log the raw error for debugging; the meter shows only a short reason (the full exception —
          // provider errors, auth tokens — must not reach the UI).
          log.warn('gmail sync failed', { error });
          progressMonitors.forEach((monitor) => monitor.fail('Sync failed'));
        }),
      ),
    );

    // Flush indexes once, at the end of the run, so cross-run dedup / contact resolution observe this
    // run's writes (per-page commits no longer flush — see `SyncBinding.commit`).
    yield* Database.flush({ indexes: true });

    // Final publish so the committed `newMessages` count (advanced per page by the commit sink) is
    // reflected after the last item's mid-stream snapshot, and the run's end time / total duration
    // are recorded.
    finishedMs = Date.now();
    finishedAt = new Date(finishedMs).toISOString();
    publishStats();

    progressMonitors.forEach((monitor) => {
      if (controller.signal.aborted) {
        monitor.note('Cancelled');
      } else {
        monitor.done();
      }
      monitor.remove();
    });

    log('sync complete', { newMessages: stats.newMessages, cancelled: controller.signal.aborted });
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
