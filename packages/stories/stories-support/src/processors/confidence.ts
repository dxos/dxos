//
// Copyright 2026 DXOS.org
//

import { type Support } from '../types/index.ts';
import { terms, topicsOf } from './terms.ts';

/** The confidence at or above which a question is answered with a draft. */
export const DEFAULT_THRESHOLD = 0.5;

export type DecideOptions = {
  readonly threshold?: number;
};

/** The share of a question's terms that a passage contains, 0..1; 0 for a question with no terms. */
export const coverage = (question: string, passage: Pick<Support.Passage, 'heading' | 'text'>): number => {
  const wanted = terms(question);
  if (wanted.size === 0) {
    return 0;
  }
  const found = terms(`${passage.heading} ${passage.text}`);
  let shared = 0;
  for (const term of wanted) {
    if (found.has(term)) {
      shared++;
    }
  }
  return shared / wanted.size;
};

/**
 * The evidence the canonical passages give for a question: every passage of a document whose title names a topic the
 * question or its message mentions, best coverage first.
 */
export const findEvidence = (
  { question, context = '' }: { question: string; context?: string },
  passages: readonly Support.Passage[],
): { topics: string[]; evidence: Support.Evidence[] } => {
  const topics = [...new Set([...topicsOf(question), ...topicsOf(context)])];
  const evidence = passages
    .map((passage) => ({
      passage,
      topics: topicsOf(passage.title).filter((topic) => topics.includes(topic)),
      coverage: coverage(question, passage),
    }))
    .filter((entry) => entry.topics.length > 0)
    // Ties keep document order, so the same evidence always yields the same citation.
    .sort((first, second) => second.coverage - first.coverage);
  return { topics, evidence };
};

/**
 * Decides one question or request: a draft when a passage covers the question at or above the threshold, else a task.
 * A request is always a task. Pure, so the rule can be tested without a space.
 */
export const decide = (
  { kind, evidence }: { kind: 'question' | 'request'; evidence: readonly Support.Evidence[] },
  { threshold = DEFAULT_THRESHOLD }: DecideOptions = {},
): Support.Decision => {
  if (kind === 'request') {
    return { kind: 'task', confidence: 0, reason: 'request' };
  }

  const [best] = [...evidence].sort((first, second) => second.coverage - first.coverage);
  if (!best) {
    return { kind: 'task', confidence: 0, reason: 'no-evidence' };
  }
  if (best.coverage < threshold) {
    return { kind: 'task', confidence: best.coverage, reason: 'low-confidence' };
  }

  const { document, title, heading, text } = best.passage;
  return { kind: 'draft', confidence: best.coverage, citations: [{ document, title, heading, quote: text }] };
};
