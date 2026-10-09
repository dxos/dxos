//
// Copyright 2026 DXOS.org
//

import { formatValue } from '../score/render.ts';
import { type Unit } from '../score/score.ts';
import { WORK_GROUP } from '../score/stages.ts';
import { type MetricComparison, type Verdict } from './verdict.ts';

const unitOf = (id: string): Unit =>
  /^(wall|cpu) > /.test(id) || /Ms\b|lag|time|request|visible/.test(id)
    ? 'ms'
    : /bytes|Bytes|memory|footprint|transferred|traffic/.test(id)
      ? 'bytes'
      : 'count';

const signed = (value: number, unit: Unit): string => `${value < 0 ? '−' : '+'}${formatValue(Math.abs(value), unit)}`;

const percent = (value: number, base: number): string =>
  base === 0 ? '' : `${value < 0 ? '−' : '+'}${Math.abs((value / base) * 100).toFixed(1)}%`;

/** One line per metric: verdict, id, base → candidate, shift with its interval, effect size, pairs. */
export const renderMetric = ({
  id,
  verdict,
  base,
  candidate,
  shift,
  interval,
  delta,
  pairs,
}: MetricComparison): string => {
  const unit = unitOf(id);
  const relative = percent(shift, base);
  const range = Number.isFinite(interval[0])
    ? `[${percent(interval[0], base) || signed(interval[0], unit)}, ${percent(interval[1], base) || signed(interval[1], unit)}]`
    : '[unbounded: more rounds]';
  return [
    verdict.padEnd(12),
    id.padEnd(40),
    `${formatValue(base, unit)} → ${formatValue(candidate, unit)}`.padEnd(26),
    `${relative || signed(shift, unit)} ${range}`.padEnd(28),
    `δ ${delta.toFixed(2)}`,
    `n=${pairs}`,
  ].join(' ');
};

const ORDER: ReadonlyArray<Verdict> = ['regressed', 'improved', 'inconclusive', 'no-change'];

export type RenderComparisonOptions = {
  comparisons: ReadonlyArray<MetricComparison>;
  isTarget: (id: string) => boolean;
  /** Most lines spent on metrics outside the verdict. */
  others?: number;
  /** Most lines spent on targets that are not settled as unchanged. */
  limit?: number;
};

/**
 * The targets that moved or are unresolved, then only the other metrics that moved, both capped:
 * with ~150 metrics a 95% interval flags a few by chance, so those are leads, not the verdict.
 */
export const renderComparison = ({
  comparisons,
  isTarget,
  others = 10,
  limit = 25,
}: RenderComparisonOptions): string[] => {
  const byVerdict = (left: MetricComparison, right: MetricComparison) =>
    ORDER.indexOf(left.verdict) - ORDER.indexOf(right.verdict) || left.id.localeCompare(right.id);
  const targets = comparisons.filter(({ id }) => isTarget(id)).sort(byVerdict);
  const moved = comparisons
    .filter(({ id, verdict }) => !isTarget(id) && (verdict === 'regressed' || verdict === 'improved'))
    .sort(byVerdict);
  const rest = comparisons.length - targets.length;
  // A stage that stopped doing half its work wins on every timing; only the flow's outcome says whether that is a fix.
  const skipped = comparisons.filter(
    ({ group, verdict, base, shift }) =>
      group === WORK_GROUP && verdict === 'improved' && base > 0 && shift / base < -0.5,
  );
  const unsettled = targets.filter(({ verdict }) => verdict !== 'no-change');
  return [
    `targets (${targets.length}): ${targets.length - unsettled.length} no change${unsettled.length > limit ? `, first ${limit} others shown` : ''}`,
    ...unsettled.slice(0, limit).map(renderMetric),
    ...(skipped.length > 0
      ? [
          `work fell by more than half (${skipped.length}); confirm these stages still do their job:`,
          ...skipped.map(renderMetric),
        ]
      : []),
    `other metrics (${rest}, not in the verdict): ${moved.length} moved${moved.length > others ? `, first ${others} shown` : ''}`,
    ...moved.slice(0, others).map(renderMetric),
  ];
};
