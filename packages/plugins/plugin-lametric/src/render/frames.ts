//
// Copyright 2026 DXOS.org
//

import { type MetricSpec } from '@dxos/plugin-space/dashboard';

import * as LaMetric from '#protocol';

const toFrame = (metric: MetricSpec): LaMetric.Frame => {
  if (metric.kind === 'stat') {
    return { text: `${metric.value} ${metric.title.toLowerCase()}` };
  }
  // `goalData` needs an end, so a task reporting no total gets a text frame rather than a bar.
  if (metric.ratio === undefined) {
    return { text: [metric.title, metric.detail].filter(Boolean).join(' ') };
  }
  return { goalData: { start: 0, current: Math.round(metric.ratio * 100), end: 100, unit: '%' } };
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
