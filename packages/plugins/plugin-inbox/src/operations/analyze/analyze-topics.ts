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
import { Database, Filter, Obj, Query, Relation } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Topic, resolveModel, runTopicsPipeline, tagMessage } from '@dxos/pipeline-email';
import { AnchoredTo, Message } from '@dxos/types';

import { InboxOperation, Mailbox } from '../../types';

/** Progress-monitor key for a topics run — the peer of `createSyncProgressKey` (`#sync`). */
export const createTopicsProgressKey = (mailbox: Mailbox.Mailbox) => Obj.getURI(mailbox).toString() + '#topics';

/**
 * Tags every message in a mailbox and clusters its threads into `Topic` objects with LLM summaries
 * (thin wrapper over `@dxos/pipeline-email`'s `runTopicsPipeline`). Wires the pipeline's injected
 * LLM steps to the operation's `AiService` (model per the product model policy), applies tags via
 * `Mailbox.applyTag`, persists each `Topic` with an `AnchoredTo` relation to the mailbox, and
 * publishes a live progress monitor. One-shot + resumable-lite: skips already-tagged messages and
 * already-materialized topic labels, so re-invoking the toolbar action resumes.
 */
const handler = InboxOperation.AnalyzeTopics.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, limit }) {
      const mailbox = yield* Database.load(mailboxRef);
      const db = Obj.getDatabase(mailbox);
      if (!db) {
        return { tagged: 0, topics: 0 };
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

      // Resumable-lite: skip messages already carrying tags and topics whose label already exists.
      const tagIndex = Mailbox.buildMessageTagsIndex(mailbox);
      const existingTopics = yield* Effect.promise(() => db.query(Filter.type(Topic)).run());
      const existingLabels = new Set(existingTopics.map((topic) => topic.label));

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

      // Persist each Topic and anchor it to the mailbox (Topic --AnchoredTo--> Mailbox).
      for (const topic of result.topics) {
        const added = db.add(topic);
        db.add(AnchoredTo.make({ [Relation.Source]: added, [Relation.Target]: mailbox }));
      }
      yield* Effect.promise(() => db.flush());

      // Persist whatever completed before a cancel (tags/topics are idempotent + resumable), then
      // clear the monitor — cancelled, not done.
      for (const monitor of monitors) {
        if (controller.signal.aborted) {
          monitor.note('Cancelled');
        } else {
          monitor.done();
        }
        monitor.remove();
      }

      return { tagged: result.messageTags.length, topics: result.topics.length };
    }),
  ),
  // Erase the inferred handler type so the default export is portably nameable in the emitted .d.ts.
  Operation.opaqueHandler,
);

export default handler;
