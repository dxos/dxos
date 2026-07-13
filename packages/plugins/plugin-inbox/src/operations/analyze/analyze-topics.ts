//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Topic, deriveThreadId, resolveModel, runTopicsPipeline, tagMessage } from '@dxos/pipeline-email';
import { Message, Person } from '@dxos/types';

import { InboxOperation, Mailbox } from '../../types';
import { orderSuggestions } from './suggestions';

/** Progress-monitor key for a topics run — the peer of `createSyncProgressKey` (`#sync`). */
export const createTopicsProgressKey = (mailbox: Mailbox.Mailbox) => Obj.getURI(mailbox).toString() + '#topics';

/**
 * Tags every message in a mailbox and clusters its threads into suggested topics written to
 * `Mailbox.topicSuggestions` for the user to accept/dismiss (thin wrapper over `@dxos/pipeline-email`'s
 * `runTopicsPipeline`). Wires the pipeline's injected LLM steps to the operation's `AiService` (model
 * per the product model policy), applies tags via `Mailbox.applyTag`, and publishes a live progress
 * monitor. Suggestions are filtered/ordered by {@link orderSuggestions}: bulk-dominated clusters are
 * suppressed, person-linked clusters surface first. One-shot + resumable-lite: skips already-tagged
 * messages and labels already accepted (a `Topic`) or already suggested, so re-invoking resumes.
 */
const handler = InboxOperation.AnalyzeTopics.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, limit }) {
      const mailbox = yield* Database.load(mailboxRef);
      const db = Obj.getDatabase(mailbox);
      if (!db) {
        return { tagged: 0, suggestions: 0 };
      }
      const feed = yield* Database.load(mailbox.feed);
      const aiService = yield* AiService.AiService;

      // Exclude filtered senders (mailbox message filters) from tagging + topic clustering.
      const messages = (yield* Effect.promise(() =>
        db.query(Query.select(Filter.type(Message.Message)).from(feed)).run(),
      )).filter((message) => !Mailbox.isFiltered(mailbox, message));

      // Cooperative cancellation: the meter's cancel control invokes `onCancel`, which aborts the
      // controller; `runTopicsPipeline` checks the signal between messages and stops.
      const controller = new AbortController();

      // Live monitor (optional — `getAll` yields nothing in headless/test runs, so this no-ops there).
      const monitors = (yield* Capability.getAll(AppCapabilities.ProgressRegistry)).map((registry) =>
        registry.register(createTopicsProgressKey(mailbox), {
          label: `${mailbox.name ?? 'Mailbox'} — topics`,
          onCancel: () => controller.abort(),
        }),
      );

      // Resumable-lite: skip already-tagged messages, and dedup suggestions against labels already
      // accepted (a `Topic`) or already suggested.
      const tagIndex = Mailbox.buildMessageTagsIndex(mailbox);
      const existingTopics = yield* Effect.promise(() => db.query(Filter.type(Topic)).run());
      const existingLabels = new Set([
        ...existingTopics.map((topic) => topic.label),
        ...(mailbox.topicSuggestions ?? []).map((suggestion) => suggestion.label),
      ]);

      // Collect every known Person email — a suggestion is surfaced first when a participant matches.
      const people = yield* Effect.promise(() => db.query(Filter.type(Person.Person)).run());
      const personEmails = new Set(
        people.flatMap((person) => (person.emails ?? []).map((entry) => entry.value.toLowerCase())),
      );

      // Wire the pipeline's injected LLM steps to the operation's AiService.
      const tag = (message: Message.Message) =>
        EffectEx.runPromise(tagMessage(message).pipe(Effect.provideService(AiService.AiService, aiService)));
      const summarize = (prompt: string) =>
        EffectEx.runPromise(
          LanguageModel.generateText({ prompt }).pipe(
            Effect.provide(AiService.model(resolveModel('summarize-topic')).pipe(Layer.orDie)),
            Effect.provideService(AiService.AiService, aiService),
            Effect.timeout('30 seconds'),
            Effect.map((response) => response.text),
            Effect.orElse(() => Effect.succeed('')),
          ),
        );

      const result = yield* Effect.promise(() =>
        runTopicsPipeline(
          {
            messages,
            // Mailbox has no owner-email field; thread-state inference is unused by clustering, so ''.
            ownerEmail: '',
            now: new Date().toISOString(),
            limit,
            skipMessage: (id) => (tagIndex[id]?.length ?? 0) > 0,
            skipTopic: (label) => existingLabels.has(label),
            signal: controller.signal,
            onProgress: (phase, current, total) => {
              for (const monitor of monitors) {
                if (phase === 'tag') {
                  monitor.total(total);
                  monitor.set(current);
                } else {
                  monitor.note(`summarizing topics ${current}/${total}`);
                }
              }
            },
          },
          { tag, summarize },
        ),
      );

      // Apply tags to the mailbox tag index (keyed by the message's stable id).
      const messageById = new Map(
        messages.map((message) => [String(message.properties?.messageId ?? message.id), message] as const),
      );
      for (const entry of result.messageTags) {
        const message = messageById.get(entry.messageId);
        if (!message) {
          continue;
        }
        for (const label of entry.tags) {
          yield* Effect.promise(() => Mailbox.applyTag(mailbox, { label }, message, db));
        }
      }

      // A thread is bulk when a strict majority of its messages tagged this run carry the `bulk` tag.
      // (Only this run's tags carry labels; the persisted index stores tag URIs, so a resumed run's
      // already-tagged messages contribute no bulk signal — conservatively not-bulk.)
      const tagsByMessageId = new Map(result.messageTags.map((entry) => [entry.messageId, entry.tags]));
      const threadCounts = new Map<string, { bulk: number; total: number }>();
      for (const message of messages) {
        const tags = tagsByMessageId.get(String(message.properties?.messageId ?? message.id));
        if (!tags) {
          continue;
        }
        const threadId = deriveThreadId(message);
        const counts = threadCounts.get(threadId) ?? { bulk: 0, total: 0 };
        counts.total += 1;
        if (tags.includes('bulk')) {
          counts.bulk += 1;
        }
        threadCounts.set(threadId, counts);
      }
      const bulkThreadIds = new Set(
        [...threadCounts].filter(([, counts]) => counts.bulk * 2 > counts.total).map(([threadId]) => threadId),
      );

      // Filter (drop bulk) + order (person-linked first) the drafts, then append them to the mailbox's
      // suggestions for the user to accept/dismiss (no `Topic` is materialized here).
      const suggestions = orderSuggestions({
        drafts: result.topicDrafts,
        bulkThreadIds,
        personEmails,
        existingLabels,
      }).map((draft) => ({
        label: draft.label,
        summary: draft.summary,
        threadIds: [...draft.threadIds],
        participants: [...draft.participants],
        keywords: [...draft.keywords],
        questions: [...draft.questions],
        tasks: [...draft.tasks],
      }));
      if (suggestions.length > 0) {
        Obj.update(mailbox, (mailbox) => {
          (mailbox.topicSuggestions ??= []).push(...suggestions);
        });
      }
      yield* Effect.promise(() => db.flush());

      // Persist whatever completed before a cancel (tags/suggestions are idempotent + resumable), then
      // clear the monitor — cancelled, not done.
      for (const monitor of monitors) {
        if (controller.signal.aborted) {
          monitor.note('Cancelled');
        } else {
          monitor.done();
        }
        monitor.remove();
      }

      return { tagged: result.messageTags.length, suggestions: suggestions.length };
    }),
  ),
  // Erase the inferred handler type so the default export is portably nameable in the emitted .d.ts.
  Operation.opaqueHandler,
);

export default handler;
