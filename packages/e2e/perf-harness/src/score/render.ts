//
// Copyright 2026 DXOS.org
//

import { type Budget, type ScoreReport, type Status } from './score.ts';

/** Three significant figures, with the unit; byte values in binary multiples. */
export const formatValue = (value: number, unit: Budget['unit']): string => {
  const round = (number: number) => Number(number.toPrecision(3)).toLocaleString('en-US');
  if (unit === 'bytes') {
    const steps = ['B', 'KiB', 'MiB', 'GiB'];
    let scaled = value;
    let step = 0;
    while (scaled >= 1024 && step < steps.length - 1) {
      scaled /= 1024;
      step++;
    }
    return `${round(scaled)} ${steps[step]}`;
  }
  return unit === 'count' ? round(value) : `${round(value)} ${unit}`;
};

const STATUS_MARK: Record<Status, string> = { good: '✅', expected: '🟡', over: '🔴' };

const escapeCell = (text: string) => text.replaceAll('|', '\\|');

export type BudgetRow = { id: string; group: string; label: string; budget: Budget };

/** The budgets as markdown, one table per group, in the order the rows are given. */
export const renderBudgetTables = (rows: ReadonlyArray<BudgetRow>): string => {
  const groups = new Map<string, BudgetRow[]>();
  for (const row of rows) {
    groups.set(row.group, [...(groups.get(row.group) ?? []), row]);
  }
  return [...groups]
    .map(([group, members]) =>
      [
        `### ${group}`,
        '',
        '| metric | target | limit | better | weight |',
        '| --- | ---: | ---: | --- | ---: |',
        ...members.map(
          ({ label, budget }) =>
            `| ${escapeCell(label)} | ${formatValue(budget.target, budget.unit)} | ${formatValue(budget.limit, budget.unit)} | ${budget.direction ?? 'lower'} | ${budget.weight ?? 1} |`,
        ),
      ].join('\n'),
    )
    .join('\n\n');
};

/** A run's scores as markdown, for a CI step summary: overall, groups, then every metric. */
export const renderReport = (title: string, report: ScoreReport): string => {
  const over = report.metrics.filter(({ status }) => status === 'over');
  return [
    `### ${title} — score ${report.overall.toFixed(3)}`,
    '',
    `${report.metrics.length} metrics, ${over.length} past their limit` +
      (report.unbudgeted.length > 0 ? `, ${report.unbudgeted.length} with no budget` : '') +
      (report.missing.length > 0 ? `, ${report.missing.length} budgeted but not measured` : '') +
      '.',
    '',
    '| group | score | metrics | over limit |',
    '| --- | ---: | ---: | ---: |',
    ...report.groups.map(
      ({ group, score, metrics, over }) => `| ${escapeCell(group)} | ${score.toFixed(3)} | ${metrics} | ${over} |`,
    ),
    '',
    '| | metric | value | target | limit | score |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...report.metrics.map(
      ({ id, value, budget, score, status }) =>
        `| ${STATUS_MARK[status]} | ${escapeCell(id)} | ${Number.isNaN(value) ? 'not measured' : formatValue(value, budget.unit)} | ${formatValue(budget.target, budget.unit)} | ${formatValue(budget.limit, budget.unit)} | ${score.toFixed(3)} |`,
    ),
    ...(report.unbudgeted.length > 0
      ? ['', 'No budget:', '', ...report.unbudgeted.map(({ id }) => `- ${escapeCell(id)}`)]
      : []),
  ].join('\n');
};
