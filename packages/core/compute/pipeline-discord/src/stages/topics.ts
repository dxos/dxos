//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { type StateError, type StateStore, type Type, tapStage } from '@dxos/crawler';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Stage } from '@dxos/pipeline';
import { trim } from '@dxos/util';

import { DISCORD_SOURCE } from '../constants';
import { StoreError } from '../errors';
import { MessageStore, type StoredMessage } from '../stores';
import { type DetectOptions, type TopicSegment, detectTopics, salientTokens } from '../topics/detect-topics';
import { Topic } from '../types';

const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

// TODO(burdon): Reconcile with Topic.
export type TopicsOptions = {
  /** ECHO database to upsert {@link Topic.Topic} objects into; detection-only when absent. */
  readonly db?: Database.Database;
  readonly detect?: DetectOptions;
};

const TopicShape = Schema.Struct({
  name: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
});

const topicPrompt = (segment: TopicSegment, messages: readonly StoredMessage[]): string => {
  const lines = messages.map((message) => `- [${message.authorLabel ?? message.authorId}] ${message.text}`);
  return trim`
    Name and summarize the topic of this chat conversation. Respond with a short "name"
    (3-6 words) and a 1-2 sentence "summary" of what was discussed and any conclusion.

    Participants: ${segment.participantLabels.join(', ')}

    Messages:
    ${lines.join('\n')}
  `;
};

/** Deterministic stand-in when the model yields nothing: the segment's dominant vocabulary. */
const fallbackName = (messages: readonly StoredMessage[]): string => {
  const counts = new Map<string, number>();
  for (const message of messages) {
    for (const token of salientTokens(message.text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([token]) => token);
  return top.length > 0 ? top.join(' ') : 'conversation';
};

/**
 * Name + summarize a detected segment with the LLM; a failed or empty generation degrades to a
 * deterministic keyword name and a participants line, so the pipeline works offline.
 */
export const summarizeSegment = (
  segment: TopicSegment,
  messages: readonly StoredMessage[],
): Effect.Effect<{ name: string; summary: string }, never, AiService.AiService> =>
  LanguageModel.generateObject({ schema: TopicShape, prompt: topicPrompt(segment, messages) }).pipe(
    Effect.provide(AiService.model(DEFAULT_MODEL).pipe(Layer.orDie)),
    Effect.map(({ value }) => value),
    Effect.catchAll(() => Effect.succeed({} as { name?: string; summary?: string })),
    Effect.map(({ name, summary }) => ({
      name: name?.trim() || fallbackName(messages),
      summary:
        summary?.trim() || `${segment.participantLabels.join(', ')} exchanged ${segment.messageIds.length} message(s).`,
    })),
  );

/** Find-or-create the ECHO Topic for a segment, keyed by (target, start message). */
const persistTopic = (
  db: Database.Database,
  segment: TopicSegment,
  name: string,
  summary: string,
): Effect.Effect<void, StoreError> =>
  Effect.gen(function* () {
    const key = { source: DISCORD_SOURCE, id: `${segment.targetId}#${segment.startMessageId}` };
    const existing = yield* Database.query(Query.select(Filter.foreignKeys(Topic.Topic, [key]))).run;
    if (existing.length > 0) {
      Obj.update(existing[0], (topic) => {
        topic.name = name;
        topic.summary = summary;
        topic.participants = [...segment.participants];
        topic.participantLabels = [...segment.participantLabels];
        topic.endMessageId = segment.endMessageId;
        topic.endedAt = segment.endedAt;
        topic.messageCount = segment.messageIds.length;
      });
      return;
    }
    yield* Database.add(
      Topic.make({
        [Obj.Meta]: { keys: [key] },
        name,
        summary,
        threadId: segment.targetId,
        participants: [...segment.participants],
        participantLabels: [...segment.participantLabels],
        startMessageId: segment.startMessageId,
        endMessageId: segment.endMessageId,
        ...(segment.startedAt ? { startedAt: segment.startedAt } : {}),
        ...(segment.endedAt ? { endedAt: segment.endedAt } : {}),
        messageCount: segment.messageIds.length,
      }),
    );
  }).pipe(
    Effect.provide(Database.layer(db)),
    Effect.mapError((cause) => new StoreError({ message: 'Failed to persist topic', cause })),
  );

/**
 * Detect, summarize, and (when a database is provided) persist the topics of one drained target.
 * Returns the detected segments so callers can inspect them without ECHO.
 */
export const buildTopicsForTarget = (
  target: { readonly id: string; readonly threadId?: string },
  options: TopicsOptions = {},
): Effect.Effect<TopicSegment[], StoreError, MessageStore | AiService.AiService> =>
  Effect.gen(function* () {
    const store = yield* MessageStore;
    const messages = yield* store.listByTarget(target.id);
    const byId = new Map(messages.map((message) => [message.id, message]));
    const segments = detectTopics(target, messages, options.detect);
    for (const segment of segments) {
      const segmentMessages = segment.messageIds.flatMap((id) => {
        const message = byId.get(id);
        return message ? [message] : [];
      });
      const { name, summary } = yield* summarizeSegment(segment, segmentMessages);
      log.info('topic', {
        target: segment.targetId,
        name,
        participants: segment.participantLabels,
        start: segment.startMessageId,
        end: segment.endMessageId,
        messages: segment.messageIds.length,
      });
      if (options.db) {
        yield* persistTopic(options.db, segment, name, summary);
      }
    }
    return segments;
  });

/**
 * Pipeline stage: when a channel or thread finishes draining, group its stored messages into
 * topics and summarize each — a subthread is one topic; a main thread is segmented by reply
 * links, @mentions between participants, shared vocabulary, and session time gaps. Idempotent
 * across live crawls and {@link replayStream} passes (ECHO topics upsert by foreign key).
 */
export const topicsStage = (
  options: TopicsOptions = {},
): Stage.Stage<Type.Event, Type.Event, StateError, MessageStore | AiService.AiService | StateStore> =>
  tapStage('topics', ['ThreadEnd', 'ChannelEnd'], (event) =>
    buildTopicsForTarget(event.target, options).pipe(Effect.asVoid),
  );
