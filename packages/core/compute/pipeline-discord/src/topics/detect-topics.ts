//
// Copyright 2026 DXOS.org
//

import { type StoredMessage } from '../stores';

/** A detected topic segment: the pure, storage-agnostic result of {@link detectTopics}. */
export type TopicSegment = {
  /** Crawl target the segment belongs to. */
  readonly targetId: string;
  /** Set when the target is a subthread (the whole thread is one topic). */
  readonly threadId?: string;
  /** Stable author ids, in order of first appearance. */
  readonly participants: readonly string[];
  /** Display labels matching {@link participants}. */
  readonly participantLabels: readonly string[];
  readonly startMessageId: string;
  readonly endMessageId: string;
  readonly messageIds: readonly string[];
  readonly startedAt?: string;
  readonly endedAt?: string;
};

export type DetectOptions = {
  /** A topic with no activity for this long is closed to new (non-reply) messages. Default 30 min. */
  readonly sessionGapMs?: number;
  /** Minimum affinity score for a message to join an open topic instead of starting one. Default 2. */
  readonly minScore?: number;
};

const DEFAULT_SESSION_GAP_MS = 30 * 60 * 1000;
const DEFAULT_MIN_SCORE = 2;
const KEYWORD_OVERLAP_CAP = 3;

/** Common chat words that carry no topical signal (compact, lowercase). */
const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'been',
  'before',
  'being',
  'between',
  'both',
  'cannot',
  'could',
  'does',
  'doing',
  'down',
  'each',
  'from',
  'have',
  'having',
  'here',
  'idea',
  'into',
  'just',
  'like',
  'looks',
  'made',
  'make',
  'makes',
  'maybe',
  'more',
  'most',
  'much',
  'need',
  'only',
  'other',
  'over',
  'please',
  'probably',
  'really',
  'right',
  'same',
  'should',
  'some',
  'something',
  'sure',
  'thanks',
  'that',
  'them',
  'then',
  'there',
  'these',
  'they',
  'thing',
  'think',
  'this',
  'those',
  'want',
  'well',
  'were',
  'what',
  'when',
  'where',
  'which',
  'will',
  'with',
  'would',
  'yeah',
  'your',
]);

/** Topical vocabulary of a message: lowercased content words (≥ 4 chars, non-stopword). */
export const salientTokens = (text: string): Set<string> => {
  const tokens = new Set<string>();
  for (const raw of text.toLowerCase().match(/[a-z0-9][a-z0-9_.-]{3,}/g) ?? []) {
    const token = raw.replace(/[.-]+$/, '');
    if (token.length >= 4 && !STOP_WORDS.has(token)) {
      tokens.add(token);
    }
  }
  return tokens;
};

/** `@Display Name` mentions (the Discord source normalizes `<@id>` markup to `@displayName`). */
const mentionsOf = (text: string): string[] => (text.match(/@([\p{L}\p{N}_.-]+)/gu) ?? []).map((hit) => hit.slice(1));

type OpenTopic = {
  targetId: string;
  participants: string[];
  participantLabels: string[];
  labelIndex: Set<string>;
  authorIndex: Set<string>;
  messageIds: string[];
  keywords: Set<string>;
  startMessageId: string;
  endMessageId: string;
  startedAt?: string;
  endedAt?: string;
  lastAt: number;
};

const label = (message: StoredMessage): string => message.authorLabel ?? message.authorId;

const openTopic = (targetId: string, message: StoredMessage, at: number): OpenTopic => ({
  targetId,
  participants: [message.authorId],
  participantLabels: [label(message)],
  labelIndex: new Set([label(message).toLowerCase()]),
  authorIndex: new Set([message.authorId]),
  messageIds: [message.id],
  keywords: salientTokens(message.text),
  startMessageId: message.id,
  endMessageId: message.id,
  startedAt: message.createdAt,
  endedAt: message.createdAt,
  lastAt: at,
});

const join = (topic: OpenTopic, message: StoredMessage, at: number): void => {
  if (!topic.authorIndex.has(message.authorId)) {
    topic.authorIndex.add(message.authorId);
    topic.participants.push(message.authorId);
    topic.participantLabels.push(label(message));
    topic.labelIndex.add(label(message).toLowerCase());
  }
  topic.messageIds.push(message.id);
  for (const token of salientTokens(message.text)) {
    topic.keywords.add(token);
  }
  topic.endMessageId = message.id;
  topic.endedAt = message.createdAt ?? topic.endedAt;
  topic.lastAt = Math.max(topic.lastAt, at);
};

/**
 * Affinity of a message for an open topic: @mentions of topic participants are the strongest
 * conversational signal (asker ↔ answerer), shared vocabulary carries subject continuity, and an
 * author already in the topic gets a small continuation bias.
 */
const score = (topic: OpenTopic, message: StoredMessage): number => {
  let total = 0;
  for (const mention of mentionsOf(message.text)) {
    if (topic.labelIndex.has(mention.toLowerCase())) {
      total += 2;
    }
  }
  let overlap = 0;
  for (const token of salientTokens(message.text)) {
    if (topic.keywords.has(token)) {
      overlap++;
    }
  }
  total += Math.min(overlap, KEYWORD_OVERLAP_CAP);
  if (topic.authorIndex.has(message.authorId)) {
    total += 1;
  }
  return total;
};

const toSegment = (topic: OpenTopic, threadId?: string): TopicSegment => ({
  targetId: topic.targetId,
  ...(threadId ? { threadId } : {}),
  participants: topic.participants,
  participantLabels: topic.participantLabels,
  startMessageId: topic.startMessageId,
  endMessageId: topic.endMessageId,
  messageIds: topic.messageIds,
  ...(topic.startedAt ? { startedAt: topic.startedAt } : {}),
  ...(topic.endedAt ? { endedAt: topic.endedAt } : {}),
});

/**
 * Segment one target's chronological messages into topics. A subthread target is a single topic
 * spanning the whole conversation. On a main channel several topics can be open concurrently
 * (interleaved conversations): a message joins by reply link first (which can revive a closed
 * topic), then by affinity against topics still inside the session gap — a newcomer who replies
 * to / mentions / lexically continues an open topic joins it, anything else starts a new topic.
 * Pure and deterministic: no LLM, evaluable against hand-labeled fixtures.
 */
export const detectTopics = (
  target: { readonly id: string; readonly threadId?: string },
  messages: readonly StoredMessage[],
  options: DetectOptions = {},
): TopicSegment[] => {
  if (messages.length === 0) {
    return [];
  }

  // A subthread IS a topic: Discord already scoped the conversation.
  if (target.threadId) {
    const topic = openTopic(target.id, messages[0], 0);
    for (const message of messages.slice(1)) {
      join(topic, message, 0);
    }
    return [toSegment(topic, target.threadId)];
  }

  const sessionGapMs = options.sessionGapMs ?? DEFAULT_SESSION_GAP_MS;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

  const topics: OpenTopic[] = [];
  const byMessageId = new Map<string, OpenTopic>();
  let lastSeen = 0;

  for (const message of messages) {
    const parsed = message.createdAt ? Date.parse(message.createdAt) : Number.NaN;
    // A missing/bad timestamp inherits the previous message's time (no artificial gap).
    const at = Number.isFinite(parsed) ? parsed : lastSeen;
    lastSeen = at;

    // 1. Reply link: joins its parent's topic even when that topic has gone quiet.
    const parentTopic = message.parentId ? byMessageId.get(message.parentId) : undefined;
    if (parentTopic) {
      join(parentTopic, message, at);
      byMessageId.set(message.id, parentTopic);
      continue;
    }

    // 2. Best-affinity open topic (inside the session gap), else a new topic.
    let best: OpenTopic | undefined;
    let bestScore = 0;
    for (const topic of topics) {
      if (at - topic.lastAt > sessionGapMs) {
        continue;
      }
      const affinity = score(topic, message);
      if (affinity > bestScore) {
        best = topic;
        bestScore = affinity;
      }
    }
    if (best && bestScore >= minScore) {
      join(best, message, at);
      byMessageId.set(message.id, best);
    } else {
      const topic = openTopic(target.id, message, at);
      topics.push(topic);
      byMessageId.set(message.id, topic);
    }
  }

  return topics.map((topic) => toSegment(topic));
};
