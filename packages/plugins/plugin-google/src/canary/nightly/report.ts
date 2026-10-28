//
// Copyright 2026 DXOS.org
//

import { type Report } from '../checks/index.ts';

/** Everything one nightly run produced, written to disk before the test asserts. */
export type NightlyReport = Report & {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly spaceId: string;
  readonly seeded: number;
  readonly trashed: number;
  readonly poolSize: number;
  /** Minutes from seeding until every copy was in the mailbox feed; absent when they never all arrived. */
  readonly syncMinutes?: number;
};

/** Flat properties for the `ci.mail-canary` PostHog event: no nesting, no message content. */
export const toEventProperties = (report: NightlyReport): Record<string, string | number | boolean> => {
  const failures = report.checks.flatMap((check) => check.failures);
  const classes = [...new Set(failures.map((failure) => failure.class))].sort();
  return {
    ok: report.ok,
    failedChecks: report.checks
      .filter((check) => !check.ok)
      .map((check) => check.id)
      .join(','),
    failureClasses: classes.join(','),
    failures: failures.length,
    seeded: report.seeded,
    poolSize: report.poolSize,
    syncMinutes: report.syncMinutes ?? -1,
    runs: report.runs.runs,
    invocations: report.runs.invocations,
    runsFailed: report.runs.failed,
    runsOpen: report.runs.open,
    runsYielded: report.runs.yielded,
  };
};

/** The report as Markdown: a verdict, the checks, then each failure. */
export const renderSummary = (report: NightlyReport): string => {
  const lines = [
    `## Mail canary: ${report.ok ? 'passed' : 'FAILED'}`,
    '',
    `Space \`${report.spaceId}\`, ${report.startedAt} to ${report.finishedAt}. ` +
      `Seeded ${report.seeded} of ${report.poolSize} pool messages, trashed ${report.trashed} old copies, ` +
      (report.syncMinutes === undefined
        ? 'and the copies never all arrived.'
        : `and all copies arrived in ${report.syncMinutes} min.`),
    '',
    `Sync runs in the window: ${report.runs.runs}, over ${report.runs.invocations} invocations ` +
      `(${report.runs.succeeded} succeeded, ${report.runs.yielded} yielded, ${report.runs.failed} failed, ` +
      `${report.runs.open} open).`,
    '',
    '| Check | | Failures |',
    '| --- | --- | --- |',
    ...report.checks.map(
      (check) => `| ${check.id} ${check.name} | ${check.ok ? 'pass' : 'FAIL'} | ${check.failures.length} |`,
    ),
  ];
  const failures = report.checks.flatMap((check) => check.failures.map((failure) => ({ check: check.id, ...failure })));
  if (failures.length > 0) {
    lines.push('', '| Check | Class | Run or message | Detail |', '| --- | --- | --- | --- |');
    for (const failure of failures.slice(0, 50)) {
      lines.push(
        `| ${failure.check} | ${failure.class} | ${failure.pid ?? failure.gmailId ?? ''} | ${failure.message.replace(/\s+/g, ' ').trim().slice(0, 300).replaceAll('|', '\\|')} |`,
      );
    }
    if (failures.length > 50) {
      lines.push('', `${failures.length - 50} more in the report artifact.`);
    }
  }
  return lines.join('\n') + '\n';
};
