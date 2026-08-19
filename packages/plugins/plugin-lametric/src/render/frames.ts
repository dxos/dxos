//
// Copyright 2026 DXOS.org
//

import { type MetricSpec } from '@dxos/plugin-space/dashboard';

import * as LaMetric from '#protocol';

/**
 * Short forms for the statistic labels. Nine characters fit before the device starts scrolling, and
 * a dashboard is read at a glance — `42 obj` is legible standing still where `42 objects` is not.
 */
const SHORT_LABELS: Record<string, string> = {
  Objects: 'obj',
  Feeds: 'feeds',
  Types: 'types',
  Plugins: 'plugins',
};

const toFrame = (metric: MetricSpec, index: number): LaMetric.Frame => {
  if (metric.kind === 'stat') {
    return { text: `${metric.value} ${SHORT_LABELS[metric.title] ?? metric.title.toLowerCase()}`, index };
  }
  // `goalData` needs an end, so a task reporting no total gets a text frame rather than a bar.
  if (metric.ratio === undefined) {
    return { text: [metric.title, metric.detail].filter(Boolean).join(' '), index };
  }
  return { goalData: { start: 0, current: Math.round(metric.ratio * 100), end: 100, unit: '%' }, index };
};

/**
 * Projects the space's metrics onto the device's frame cycle.
 *
 * Pure, so the whole visual surface is testable without hardware — and so the on-screen replica and
 * the device are driven from one function and cannot drift.
 */
export const toFrames = (metrics: readonly (MetricSpec | null)[]): LaMetric.Frame[] =>
  metrics
    .filter((metric) => metric !== null)
    .slice(0, LaMetric.MAX_FRAMES)
    .map(toFrame);
