//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Operation, Topic } from '@dxos/compute';
import { Database, Filter, Obj, Query, Relation } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { buildThreads, clusterThreads, deriveThreadId, resolveModel, summarizeTopics } from '@dxos/pipeline-email';
import { AnchoredTo, Message } from '@dxos/types';

import { InboxOperation } from '../../types';

/**
 * Creates a single `Topic` seeded from one message's thread: gathers the sibling messages sharing the
 * message's derived thread id, clusters them into one topic draft (label/keywords/participants),
 * adds an LLM summary, and persists the `Topic` with an `AnchoredTo` relation to the mailbox.
 * v1 is single-thread — cross-thread "find related" and fact extraction are follow-ups.
 */
const handler = InboxOperation.CreateTopicFromMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, message }) {
      const mailbox = yield* Database.load(mailboxRef);
      const db = Obj.getDatabase(mailbox);
      if (!db) {
        return { topicId: '' };
      }

      const feed = yield* Database.load(mailbox.feed);
      const aiService = yield* AiService.AiService;

      // Gather the message's thread (sibling messages sharing its derived thread id).
      const threadId = deriveThreadId(message);
      const messages = (yield* Effect.tryPromise(() =>
        db.query(Query.select(Filter.type(Message.Message)).from(feed)).run(),
      )).filter((candidate) => deriveThreadId(candidate) === threadId);

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

      // Cluster the one thread into a single draft, then summarize it.
      const threads = buildThreads(messages.length > 0 ? messages : [message], {
        ownerEmail: '',
        now: new Date().toISOString(),
      });
      const drafts = clusterThreads(threads);
      const [draft] = yield* Effect.promise(() => summarizeTopics(drafts, summarize));
      if (!draft) {
        return { topicId: '' };
      }

      const topic = db.add(
        Obj.make(Topic.Topic, {
          name: draft.name,
          // summary: draft.summary,
          // threadIds: [...draft.threadIds],
          // participants: [...draft.participants],
          // keywords: [...draft.keywords],
          // questions: [...draft.questions],
          // tasks: [...draft.tasks],
        }),
      );
      db.add(AnchoredTo.make({ [Relation.Source]: topic, [Relation.Target]: mailbox }));
      yield* Effect.tryPromise(() => db.flush());

      return { topicId: topic.id };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
