//
// Copyright 2026 DXOS.org
//

// Token budgeting for System One requests. The API caps a request at 64k tokens and the state
// plus its longest question at 32k, and there is no local tokenizer, so sizes are estimated
// from characters and every limit carries a margin.

/** Published System One limits (https://docs.typesafe.ai/models). */
export const LIMITS = {
  request: 64_000,
  statePlusQuestion: 32_000,
};

/**
 * Characters per token assumed when estimating. Source code tokenizes denser than prose, so
 * this sits below the usual four; a run reports the measured ratio so it can be tuned.
 */
export const CHARS_PER_TOKEN = 3;

/** Fraction of each published limit a planned request may use, covering estimation error. */
const MARGIN = 0.8;

export const REQUEST_BUDGET = Math.floor(LIMITS.request * MARGIN);
export const STATE_PLUS_QUESTION_BUDGET = Math.floor(LIMITS.statePlusQuestion * MARGIN);

/** Estimated tokens for a value as it will be serialized into the request body. */
export const estimateTokens = (value) =>
  Math.ceil((typeof value === 'string' ? value.length : JSON.stringify(value).length) / CHARS_PER_TOKEN);

/** Characters that fit in a token budget, for truncating text before it is serialized. */
export const charsForTokens = (tokens) => Math.max(0, Math.floor(tokens * CHARS_PER_TOKEN));

/**
 * Split questions into batches that each fit one request beside `stateTokens`. A question that
 * cannot fit beside the state even alone is returned in `oversized` rather than sent to fail.
 *
 * @param {number} stateTokens
 * @param {Array<{ id: string, question: object }>} questions
 * @returns {{ batches: Array<Array<{ id: string, question: object }>>, oversized: string[] }}
 */
export const packQuestions = (stateTokens, questions) => {
  const batches = [];
  const oversized = [];
  let current = [];
  let currentTokens = stateTokens;
  for (const entry of questions) {
    const tokens = estimateTokens(entry.question) + estimateTokens(entry.id);
    if (stateTokens + tokens > STATE_PLUS_QUESTION_BUDGET) {
      oversized.push(entry.id);
      continue;
    }
    if (current.length > 0 && currentTokens + tokens > REQUEST_BUDGET) {
      batches.push(current);
      current = [];
      currentTokens = stateTokens;
    }
    current.push(entry);
    currentTokens += tokens;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return { batches, oversized };
};
