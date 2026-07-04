//
// Copyright 2026 DXOS.org
//

import { trim } from '@dxos/util';

/**
 * User-editable prompts for the LLM-assisted corpus algorithms. Every slot has a default; callers
 * override any subset via {@link mergePrompts}, so the discovery algorithms stay configurable
 * without forking the pipeline. (Extraction rules are configured separately, via semantic-index
 * `ExtractOptions.rules`.)
 */
export type EmailPrompts = {
  /** Summarize one topic (cluster of threads); receives the topic label + per-thread summaries. */
  readonly topicSummary: string;
  /** Narrate a corpus digest; receives the deterministic digest skeleton. */
  readonly digest: string;
};

export const DEFAULT_EMAIL_PROMPTS: EmailPrompts = {
  topicSummary: trim`
    Summarize the following email conversation topic in 1-2 sentences.
    Focus on what the threads have in common and any outcome or open question.
    Respond with ONLY the summary text.
  `,
  digest: trim`
    Write a short briefing (3-5 sentences) from the following inbox digest data.
    Lead with what needs attention (stalled threads, due commitments), then notable topics.
    Respond with ONLY the briefing text.
  `,
};

/** Overlay caller overrides onto the defaults; absent slots keep their default. */
export const mergePrompts = (overrides?: Partial<EmailPrompts>): EmailPrompts => ({
  ...DEFAULT_EMAIL_PROMPTS,
  ...overrides,
});

/**
 * LLM call boundary used by the corpus algorithms: the harness owns model/runtime plumbing and hands
 * modules a plain async closure (same pattern as `FactIndexer`), so algorithm Effects stay R = never.
 */
export type Summarizer = (prompt: string) => Promise<string>;
