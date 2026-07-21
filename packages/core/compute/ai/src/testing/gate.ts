//
// Copyright 2026 DXOS.org
//

import { MemoizedAiService } from './memoization';

/**
 * Gate for memoized-LLM replay suites. Dimensions A (comprehension) and B (tool selection) are
 * frozen recordings in these tests, so they carry no live LLM signal and are being retired (see
 * `packages/core/compute/ai/TESTING.md`). They no longer gate PR CI: they run only when explicitly
 * opted in via `DX_RUN_LLM_TESTS=1`, or while regenerating fixtures via `ALLOW_LLM_GENERATION=1`.
 *
 * Usage: `const describeMemoized = runMemoizedTests() ? describe : describe.skip;`
 */
export const runMemoizedTests = (): boolean =>
  MemoizedAiService.isGenerationEnabled() || ['1', 'true'].includes(process.env.DX_RUN_LLM_TESTS ?? '0');
