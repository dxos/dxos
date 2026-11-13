//
// Copyright 2026 DXOS.org
//

import * as TokenX from 'tokenx';

import { type ContentBlock } from '@dxos/types';

/** Thousands abbreviated to one decimal, so the count stays one glance wide as a turn grows. */
export const formatTokens = (tokens: number): string =>
  tokens >= 1_000 ? `${(tokens / 1_000).toFixed(1)}k` : String(tokens);

const estimate = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  return TokenX.estimateTokenCount(typeof value === 'string' ? value : JSON.stringify(value));
};

/**
 * Estimated tokens a block adds to the model's context, from the same estimator the preprocessor
 * budgets with. Per-request usage covers a whole turn, so it cannot be attributed to one block.
 */
export const estimateBlockTokens = (block: ContentBlock.Any): number => {
  switch (block._tag) {
    case 'text':
      return estimate(block.text);
    case 'reasoning':
      return estimate(block.reasoningText ?? block.redactedText);
    case 'toolCall':
      return estimate(block.name) + estimate(block.input);
    case 'toolResult':
      return estimate(block.error ?? block.result);
    case 'summary':
      return estimate(block.content);
    case 'suggestion':
      return estimate(block.text);
    // Runtime bookkeeping: never sent to the model.
    case 'status':
    case 'stats':
      return 0;
    default:
      return estimate(block);
  }
};

/** Total over a run of blocks. */
export const estimateTokens = (blocks: readonly ContentBlock.Any[]): number =>
  blocks.reduce((total, block) => total + estimateBlockTokens(block), 0);
