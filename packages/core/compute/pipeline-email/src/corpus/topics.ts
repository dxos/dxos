//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

import { type Thread, Topic } from '../types';
import { DEFAULT_EMAIL_PROMPTS, type EmailPrompts, type Summarizer, mergePrompts } from './prompts';

// Subject tokens that carry no topical signal; excluded from signatures and keywords.
const DEFAULT_STOPWORDS: readonly string[] = [
  'the',
  'and',
  'for',
  'with',
  'from',
  'about',
  'this',
  'that',
  'your',
  'our',
  'are',
  'was',
  'will',
  'has',
  'have',
  'not',
  'you',
  'all',
  'any',
  'can',
  'per',
  'new',
];

/**
 * Tunable knobs for the deterministic shared-signal clustering (spec §10.3: agglomeration over
 * participant/keyword overlap; embedding/LLM grouping deferred). All values have defaults so
 * callers can adjust the algorithm without forking it.
 */
export type TopicOptions = {
  /** Minimum Jaccard similarity between subject-token signatures that joins a topic. */
  readonly similarityThreshold?: number;
  /** Shared-participant count that joins a topic regardless of token overlap. */
  readonly minSharedParticipants?: number;
  /** Subject tokens shorter than this are ignored. */
  readonly minTokenLength?: number;
  /** Tokens excluded from signatures and keywords. */
  readonly stopwords?: readonly string[];
  /** Keywords retained per topic (most frequent first). */
  readonly maxKeywords?: number;
  /**
   * Drop identifier tokens (invoice hashes, order numbers, tracking codes) from subject signatures.
   * These are unique per message, so they fragment otherwise-identical automated mail into singletons.
   */
  readonly dropIdTokens?: boolean;
};

export const DEFAULT_TOPIC_OPTIONS: Required<TopicOptions> = {
  similarityThreshold: 0.25,
  minSharedParticipants: 2,
  minTokenLength: 3,
  stopwords: DEFAULT_STOPWORDS,
  maxKeywords: 5,
  dropIdTokens: true,
};

/** A topic before ECHO materialization: plain values so LLM enrichment can rewrite them freely. */
export type TopicDraft = {
  readonly label: string;
  readonly summary: string;
  readonly threadIds: readonly string[];
  readonly participants: readonly string[];
  readonly keywords: readonly string[];
  /** Open questions rolled up (deduped) from the member threads. */
  readonly questions: readonly string[];
  /** Action items rolled up (deduped) from the member threads. */
  readonly tasks: readonly string[];
};

type Signature = {
  readonly thread: Thread;
  readonly tokens: Set<string>;
  readonly participants: Set<string>;
};

// Identifiers (invoice hashes, order numbers, tracking codes, years) carry no topical signal and are
// unique per message, so they must be dropped or near-identical automated mail never collapses. A
// token is an id if it is a pure number, a hex-looking string, or a digit-heavy alphanumeric code;
// short version-like tokens ("q4", "v2") are kept.
const isIdToken = (token: string): boolean => {
  if (/^\d+$/.test(token)) {
    return true;
  }
  const digits = (token.match(/\d/g) ?? []).length;
  if (digits === 0) {
    return false;
  }
  if (/^[0-9a-f]+$/.test(token) && token.length >= 6) {
    return true;
  }
  return token.length >= 5 && digits / token.length >= 0.3;
};

const tokenize = (subject: string, options: Required<TopicOptions>): Set<string> =>
  new Set(
    subject
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(
        (token) =>
          token.length >= options.minTokenLength &&
          !options.stopwords.includes(token) &&
          !(options.dropIdTokens && isIdToken(token)),
      ),
  );

const jaccard = (left: Set<string>, right: Set<string>): number => {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) {
      shared += 1;
    }
  }
  return shared / (left.size + right.size - shared);
};

const sharedCount = (left: Set<string>, right: Set<string>): number => {
  let shared = 0;
  for (const value of left) {
    if (right.has(value)) {
      shared += 1;
    }
  }
  return shared;
};

/**
 * Greedy agglomerative clustering of threads into topic drafts. Deterministic (Compute mode): a
 * thread joins the first cluster whose aggregate signature overlaps enough — by subject-token
 * Jaccard similarity or by shared participants — else starts its own. Bounded by O(threads ×
 * clusters); no LLM involved, so results are stable and unit-testable.
 */
export const clusterThreads = (threads: readonly Thread[], options?: TopicOptions): TopicDraft[] => {
  const opts = { ...DEFAULT_TOPIC_OPTIONS, ...options };
  const clusters: { members: Signature[]; tokens: Set<string>; participants: Set<string> }[] = [];

  for (const thread of threads) {
    const signature: Signature = {
      thread,
      tokens: tokenize(thread.subject, opts),
      participants: new Set(thread.participants),
    };
    const home = clusters.find(
      (cluster) =>
        jaccard(cluster.tokens, signature.tokens) >= opts.similarityThreshold ||
        sharedCount(cluster.participants, signature.participants) >= opts.minSharedParticipants,
    );
    if (home) {
      home.members.push(signature);
      for (const token of signature.tokens) {
        home.tokens.add(token);
      }
      for (const participant of signature.participants) {
        home.participants.add(participant);
      }
    } else {
      clusters.push({
        members: [signature],
        tokens: new Set(signature.tokens),
        participants: new Set(signature.participants),
      });
    }
  }

  return clusters.map((cluster) => {
    // Rank keywords by how many member threads mention them, then alphabetically for determinism.
    const counts = new Map<string, number>();
    for (const member of cluster.members) {
      for (const token of member.tokens) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    }
    const keywords = [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, opts.maxKeywords)
      .map(([token]) => token);

    const summaries = cluster.members.flatMap((member) =>
      member.thread.summary.length > 0 ? [member.thread.summary] : [],
    );

    // Roll up open questions / action items from the member threads (deduped, order-preserving).
    const questions = [...new Set(cluster.members.flatMap((member) => member.thread.openQuestions ?? []))];
    const tasks = [...new Set(cluster.members.flatMap((member) => member.thread.actionItems ?? []))];

    // Label from top keywords; a keyword-less cluster (e.g. blank subjects) falls back through the
    // first thread's subject to its threadId so the label is never empty.
    const first = cluster.members[0].thread;
    return {
      label: keywords.length > 0 ? keywords.slice(0, 3).join(' ') : first.subject || first.threadId,
      summary: summaries.join('\n'),
      threadIds: cluster.members.map((member) => member.thread.threadId),
      participants: [...cluster.participants].sort(),
      keywords,
      questions,
      tasks,
    };
  });
};

/**
 * Optionally replace each draft's deterministic summary with an LLM one, using the editable
 * `topicSummary` prompt. Degrades per-topic: a failed call keeps that draft's deterministic summary
 * (advisory enrichment must not fail the corpus pass).
 */
export const summarizeTopics = async (
  drafts: readonly TopicDraft[],
  summarize: Summarizer,
  options?: { readonly prompts?: Partial<EmailPrompts> },
): Promise<TopicDraft[]> => {
  const prompts = options?.prompts ? mergePrompts(options.prompts) : DEFAULT_EMAIL_PROMPTS;
  return Promise.all(
    drafts.map(async (draft) => {
      try {
        const summary = await summarize(
          [prompts.topicSummary, `Topic: ${draft.label}`, `Threads:\n${draft.summary}`].join('\n\n'),
        );
        return summary.trim().length > 0 ? { ...draft, summary: summary.trim() } : draft;
      } catch {
        return draft;
      }
    }),
  );
};

/** Materialize drafts as canonical Topic ECHO objects (done last; drafts stay freely mutable). */
export const materializeTopics = (drafts: readonly TopicDraft[]): Topic[] =>
  drafts.map((draft) =>
    Obj.make(Topic, {
      label: draft.label,
      summary: draft.summary,
      threadIds: [...draft.threadIds],
      participants: [...draft.participants],
      keywords: [...draft.keywords],
      questions: [...draft.questions],
      tasks: [...draft.tasks],
    }),
  );
