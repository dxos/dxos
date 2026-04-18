//
// Copyright 2026 DXOS.org
//

/** Confidence level the LLM assigns to a match. */
export type MatchConfidence = 'high' | 'medium' | 'low';

/** Shape every match returned by `aiMatch` conforms to. */
export type MatchBase = {
  /** The ID (from `sourceId` config) of the source item. */
  sourceId: string;
  /** The ID (from `targetId` config) of the matched target item. */
  targetId: string;
  confidence: MatchConfidence;
  /** One-sentence explanation from the LLM. */
  reasoning: string;
};

/**
 * A compact, JSON-serializable summary of an object for the prompt.
 * Keep values short — string content gets truncated to ~500 chars in the
 * default summarizer, but callers should pre-trim heavy narrative fields.
 */
export type Summary = Record<string, string | number | boolean | null>;

export type AiMatchConfig<S, T> = {
  /** Objects on the "from" side of the match. */
  source: readonly S[];
  /** Objects on the "to" side of the match. */
  target: readonly T[];

  /** Compact summary of a source item for the prompt. */
  summarizeSource: (item: S, index: number) => Summary;
  /** Compact summary of a target item for the prompt. */
  summarizeTarget: (item: T, index: number) => Summary;

  /** Stable ID for a source item (used in the returned match's `sourceId`). */
  sourceId: (item: S) => string;
  /** Stable ID for a target item (used in the returned match's `targetId`). */
  targetId: (item: T) => string;

  /**
   * Domain description of what "a match" means, e.g.
   * "matching meeting notes to Trello cards — a match means the meeting
   *  was likely about the card's topic or involved the same people".
   */
  task: string;

  /** Anthropic API key. Falls back to `localStorage.ANTHROPIC_API_KEY` in the browser. */
  apiKey?: string;
  /** Endpoint for the Claude API. Default: `/api/anthropic/v1/messages` (Composer's dev proxy). */
  endpoint?: string;
  /** Model ID. Default: `claude-sonnet-4-20250514`. */
  model?: string;
  maxTokens?: number;
  /** Optional AbortSignal to cancel the request. */
  signal?: AbortSignal;
};

export type AiMatchResult<S, T> = MatchBase & {
  /** The source object that matched. */
  source: S;
  /** The target object that matched. */
  target: T;
};
