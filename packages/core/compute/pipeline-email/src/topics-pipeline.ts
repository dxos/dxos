//
// Copyright 2026 DXOS.org
//

import { type Message } from '@dxos/types';

import {
  type Summarizer,
  type TopicDraft,
  type TopicOptions,
  clusterThreads,
  materializeTopics,
  summarizeTopics,
} from './corpus';
import { buildThreads } from './internal/threads';
import { type TagResult } from './stages/tag';
import { type Topic } from './types';

// The topics pipeline (productized from the research harness): tag each message, then cluster its
// threads into `Topic` objects with LLM summaries. Pure orchestration — the LLM-bearing steps (`tag`,
// `summarize`) are INJECTED so this is unit-testable with stubs; the plugin-inbox operation wires them
// to the AI service and applies the results (tags via `Mailbox.applyTag`, topics + `AnchoredTo`
// relations into the space). One-shot + resumable-lite: `limit` bounds a run, `skipMessage` /
// `skipTopic` let a re-run resume past what a previous invocation already tagged / materialized.

/** Per-message tag output — applied to the mailbox tag index by the caller. */
export type MessageTags = {
  readonly messageId: string;
  readonly tags: readonly string[];
  readonly spam: boolean;
};

export type TopicsPipelineInput = {
  readonly messages: readonly Message.Message[];
  /** Mailbox owner email — steers thread-state inference in `buildThreads`. */
  readonly ownerEmail: string;
  /** Wall-clock ISO timestamp for `buildThreads` idle/state inference (injected — no `Date.now()` here). */
  readonly now: string;
  /** Cap messages tagged this run (resumable-lite); undefined → all. */
  readonly limit?: number;
  /** Skip a message already tagged by a previous run (resume). */
  readonly skipMessage?: (messageId: string) => boolean;
  /** Skip a topic already materialized by a previous run (dedupe on re-run). */
  readonly skipTopic?: (label: string) => boolean;
  readonly topicOptions?: TopicOptions;
  /** Progress hook: phase `'tag'` (per message) or `'topic'` (per summarized topic). */
  readonly onProgress?: (phase: 'tag' | 'topic', current: number, total: number) => void;
};

/** Effectful dependencies, injected so the orchestration stays pure and testable. */
export type TopicsPipelineDeps = {
  readonly tag: (message: Message.Message) => Promise<TagResult>;
  readonly summarize: Summarizer;
};

export type TopicsPipelineResult = {
  readonly messageTags: readonly MessageTags[];
  /** Newly materialized topics (excludes any skipped by `skipTopic`). */
  readonly topics: readonly Topic[];
};

const messageIdOf = (message: Message.Message): string => String(message.properties?.messageId ?? message.id);

/**
 * Runs the topics pipeline: tag (bounded/resumable) → `buildThreads` → `clusterThreads` →
 * `summarizeTopics` → `materializeTopics`. Returns per-message tags and the newly materialized topics
 * for the caller to persist. Tagging failures degrade per message (the injected `tag` should not
 * reject); clustering is deterministic.
 */
export const runTopicsPipeline = async (
  input: TopicsPipelineInput,
  deps: TopicsPipelineDeps,
): Promise<TopicsPipelineResult> => {
  const { messages, ownerEmail, now, limit, skipMessage, skipTopic, topicOptions, onProgress } = input;

  // Phase 1 — tag each not-yet-tagged message, bounded by `limit`.
  const pending = messages.filter((message) => !skipMessage?.(messageIdOf(message)));
  const toTag = limit !== undefined ? pending.slice(0, limit) : pending;
  const messageTags: MessageTags[] = [];
  for (let index = 0; index < toTag.length; index++) {
    const message = toTag[index];
    const result = await deps.tag(message);
    messageTags.push({ messageId: messageIdOf(message), tags: result.tags, spam: result.spam });
    onProgress?.('tag', index + 1, toTag.length);
  }

  // Phase 2 — cluster threads into topic drafts (deterministic), summarize the new ones, materialize.
  const threads = buildThreads(messages, { ownerEmail, now });
  const drafts = clusterThreads(threads, topicOptions);
  const fresh = drafts.filter((draft: TopicDraft) => !skipTopic?.(draft.label));
  const summarized = await summarizeTopics(fresh, deps.summarize);
  summarized.forEach((_, index) => onProgress?.('topic', index + 1, summarized.length));
  const topics = materializeTopics(summarized);

  return { messageTags, topics };
};
