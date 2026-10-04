//
// Copyright 2026 DXOS.org
//

import { type PosthogEvent } from '../report.ts';
import { type ScoreReport } from './score.ts';

/** The PostHog event every score row is captured under, for every suite. */
export const SCORE_EVENT_NAME = 'ci.perf-score';

export type ScoreEventOptions = {
  /** The suite the report scores, e.g. `echo` or `composer`; one dashboard filter per suite. */
  suite: string;
  timestamp?: string;
  /** Extra flat properties on every row, e.g. the comparability fields a suite pins. */
  properties?: Record<string, string | number | boolean>;
};

/**
 * One event per metric, per group and for the overall score, so a tile reads one `kind` with no
 * aggregation across rows. Every metric row carries its budget, so the range lines a chart draws
 * are the ones that scored that night rather than whatever the budget file says today.
 */
export const toScoreEvents = (
  report: ScoreReport,
  { suite, timestamp, properties = {} }: ScoreEventOptions,
): PosthogEvent[] => {
  const base = { event: SCORE_EVENT_NAME, ...(timestamp ? { timestamp } : {}) };
  return [
    ...report.metrics.map(({ id, group, value, score, status, budget }): PosthogEvent => ({
      ...base,
      dedup: `${suite}:metric:${id}`,
      properties: {
        ...properties,
        suite,
        kind: 'metric',
        metric: id,
        group,
        value,
        target: budget.target,
        limit: budget.limit,
        unit: budget.unit,
        direction: budget.direction ?? 'lower',
        score,
        status,
      },
    })),
    ...report.groups.map(({ group, score, metrics, over }): PosthogEvent => ({
      ...base,
      dedup: `${suite}:group:${group}`,
      properties: { ...properties, suite, kind: 'group', group, score, metrics, over },
    })),
    {
      ...base,
      dedup: `${suite}:overall`,
      properties: {
        ...properties,
        suite,
        kind: 'overall',
        score: report.overall,
        metrics: report.metrics.length,
        over: report.metrics.filter(({ status }) => status === 'over').length,
        unbudgeted: report.unbudgeted.length,
        missing: report.missing.length,
      },
    },
  ];
};
