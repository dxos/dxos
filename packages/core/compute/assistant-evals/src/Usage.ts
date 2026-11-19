//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { reportTrace, shouldReportTrace } from 'evalite/traces';

import { type AiUsage } from '@dxos/ai';

/** Where the run's events went, so the export step can attach the scores to the same trace. */
export type Link = {
  readonly traceId: string;
  readonly experimentId: string;
  readonly experimentName: string;
};

/**
 * Hands the calls to evalite as traces, one per call, so the export carries them next to the
 * scores. A no-op outside an eval, where there is nothing to report to.
 */
export const report = (calls: readonly AiUsage.Call[], link: Link): void => {
  if (!shouldReportTrace()) {
    return;
  }
  for (const call of calls) {
    reportTrace({
      input: { model: call.model },
      output: {
        ...link,
        model: call.model,
        cacheReadTokens: call.cacheReadTokens,
        cacheWriteTokens: call.cacheWriteTokens,
      },
      usage: {
        inputTokens: call.inputTokens,
        outputTokens: call.outputTokens,
        totalTokens: call.inputTokens + call.outputTokens,
      },
      start: call.start,
      end: call.end,
    });
  }
};
