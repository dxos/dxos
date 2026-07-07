//
// Copyright 2026 DXOS.org
//

import { type Thread } from '../types';
import { type Commitment } from './ledger';
import { DEFAULT_EMAIL_PROMPTS, type EmailPrompts, type Summarizer, mergePrompts } from './prompts';
import { type RelationshipRollup } from './rollups';
import { type TopicDraft } from './topics';

/**
 * Everything the corpus pass has computed; the digest is a Query-mode view over it (spec §3③
 * briefings) — assembled on demand, never materialized as ECHO.
 */
export type DigestInput = {
  readonly threads: readonly Thread[];
  readonly topics: readonly TopicDraft[];
  readonly commitments: readonly Commitment[];
  readonly rollups: readonly RelationshipRollup[];
};

export type DigestOptions = {
  /** Timestamp the digest reports as its generation time (passed in for determinism). */
  readonly now: string;
  /** Topics listed in the skeleton (largest first). */
  readonly maxTopTopics?: number;
};

/** Deterministic digest skeleton; `narrative` stays empty until {@link narrateDigest} fills it. */
export type Digest = {
  readonly generatedAt: string;
  readonly threadCount: number;
  readonly topicCount: number;
  /** Threads needing attention. */
  readonly stalledThreads: readonly string[];
  readonly awaitingMine: readonly string[];
  /** Commitments carrying a deadline, soonest first. */
  readonly dueCommitments: readonly Commitment[];
  readonly topTopics: readonly { readonly label: string; readonly threadCount: number }[];
  /** LLM briefing text; empty when narration is off or degraded. */
  readonly narrative: string;
};

/** Assemble the deterministic digest skeleton from the corpus outputs (Compute mode; no LLM). */
export const buildDigest = (input: DigestInput, options: DigestOptions): Digest => ({
  generatedAt: options.now,
  threadCount: input.threads.length,
  topicCount: input.topics.length,
  stalledThreads: input.threads.filter((thread) => thread.state === 'stalled').map((thread) => thread.threadId),
  awaitingMine: input.threads.filter((thread) => thread.state === 'awaiting-mine').map((thread) => thread.threadId),
  dueCommitments: input.commitments
    .filter((commitment) => commitment.dueBy !== undefined)
    .sort((a, b) => (a.dueBy ?? '').localeCompare(b.dueBy ?? '')),
  topTopics: [...input.topics]
    .sort((a, b) => b.threadIds.length - a.threadIds.length || a.label.localeCompare(b.label))
    .slice(0, options.maxTopTopics ?? 5)
    .map((topic) => ({ label: topic.label, threadCount: topic.threadIds.length })),
  narrative: '',
});

/** Render the skeleton as plain text — the prompt payload for narration, and a fallback briefing. */
export const renderDigest = (digest: Digest): string =>
  [
    `Inbox digest (${digest.generatedAt})`,
    `Threads: ${digest.threadCount}  Topics: ${digest.topicCount}`,
    `Awaiting my reply: ${digest.awaitingMine.join(', ') || 'none'}`,
    `Stalled: ${digest.stalledThreads.join(', ') || 'none'}`,
    `Due commitments: ${
      digest.dueCommitments
        .map((commitment) => `${commitment.who} → ${commitment.what} (${commitment.dueBy})`)
        .join('; ') || 'none'
    }`,
    `Top topics: ${digest.topTopics.map((topic) => `${topic.label} (${topic.threadCount})`).join('; ') || 'none'}`,
  ].join('\n');

/**
 * Optionally add an LLM briefing over the skeleton, using the editable `digest` prompt. Degrades to
 * the un-narrated digest on failure — the skeleton is always available.
 */
export const narrateDigest = async (
  digest: Digest,
  summarize: Summarizer,
  options?: { readonly prompts?: Partial<EmailPrompts> },
): Promise<Digest> => {
  const prompts = options?.prompts ? mergePrompts(options.prompts) : DEFAULT_EMAIL_PROMPTS;
  try {
    const narrative = await summarize([prompts.digest, renderDigest(digest)].join('\n\n'));
    return { ...digest, narrative: narrative.trim() };
  } catch {
    return digest;
  }
};
