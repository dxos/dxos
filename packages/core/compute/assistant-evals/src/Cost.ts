//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * USD per 1M tokens, by the provider's model name. `input` is the uncached rate; a cache write is
 * billed at `cacheWrite` and a cache hit at `cacheRead`.
 */
export type Rates = {
  readonly input: number;
  readonly output: number;
  readonly cacheWrite: number;
  readonly cacheRead: number;
};

/** Bumped with any rate below, so a cost read back from an export names the card it came from. */
export const PRICE_VERSION = '2026-09-27';

/** Anthropic list prices; a 5-minute cache write is 1.25x input and a hit 0.1x. */
const ANTHROPIC: Record<string, Rates> = {
  'claude-opus-5': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-sonnet-5': { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

/**
 * DeepSeek list prices as EDGE bills them (`edge` ai-service `deepseek-pricing.ts`): a cache miss is
 * the input rate, there is no separate write charge, and weekday peak hours cost double.
 */
const DEEPSEEK: Record<string, { offPeak: Rates; peak: Rates }> = {
  'deepseek-v4-flash': {
    offPeak: { input: 0.22, output: 0.66, cacheWrite: 0.22, cacheRead: 0.007 },
    peak: { input: 0.44, output: 1.32, cacheWrite: 0.44, cacheRead: 0.014 },
  },
  'deepseek-v4-pro': {
    offPeak: { input: 0.66, output: 1.98, cacheWrite: 0.66, cacheRead: 0.022 },
    peak: { input: 1.32, output: 3.96, cacheWrite: 1.32, cacheRead: 0.044 },
  },
};

/** DeepSeek's peak windows, UTC hours, Monday through Friday. */
const DEEPSEEK_PEAK_HOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 4],
  [6, 10],
];

const isDeepSeekPeak = (at: Date): boolean => {
  const day = at.getUTCDay();
  const hour = at.getUTCHours();
  return day !== 0 && day !== 6 && DEEPSEEK_PEAK_HOURS.some(([start, end]) => hour >= start && hour < end);
};

/** The rates in force for a model at an instant, or undefined for a model with no published price here. */
export const ratesFor = (model: string, at: Date): Rates | undefined => {
  const deepseek = DEEPSEEK[model];
  if (deepseek) {
    return isDeepSeekPeak(at) ? deepseek.peak : deepseek.offPeak;
  }
  return ANTHROPIC[model];
};

export type Tokens = {
  /** Uncached prompt tokens; the cache buckets are disjoint from it. */
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
};

/** USD for one call, or undefined when the model has no rate here rather than a guessed one. */
export const ofCall = (model: string, tokens: Tokens, at: Date): number | undefined => {
  const rates = ratesFor(model, at);
  if (!rates) {
    return undefined;
  }
  return (
    (tokens.inputTokens * rates.input +
      tokens.outputTokens * rates.output +
      tokens.cacheWriteTokens * rates.cacheWrite +
      tokens.cacheReadTokens * rates.cacheRead) /
    1_000_000
  );
};
