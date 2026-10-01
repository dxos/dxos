//
// Copyright 2026 DXOS.org
//

/** Something a transform found but could not convert: Phase C's manual residue. */
export type Residue = {
  transform: string;
  file: string;
  line: number;
  column: number;
  reason: string;
  /** The source the reason refers to, on one line. */
  snippet: string;
};

/** What one transform did across a run. */
export type TransformSummary = {
  transform: string;
  filesScanned: number;
  filesChanged: number;
  /** Applied conversions by rule. */
  rules: Record<string, number>;
  residue: Residue[];
};

export type Report = {
  generated: string;
  paths: string[];
  transforms: TransformSummary[];
};

const sortedEntries = (counts: Record<string, number>) =>
  Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const tally = (values: string[]) => {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
};

/** Renders the summary tables of a report as markdown (counts per transform, top rules, top residue reasons). */
export const formatSummary = (report: Report, { top = 15 }: { top?: number } = {}): string => {
  const lines: string[] = [
    '| Transform | Files scanned | Files changed | Conversions | Residue items | Residue files |',
    '| --------- | ------------: | ------------: | ----------: | ------------: | ------------: |',
  ];
  for (const summary of report.transforms) {
    const conversions = Object.values(summary.rules).reduce((sum, count) => sum + count, 0);
    const residueFiles = new Set(summary.residue.map((item) => item.file)).size;
    lines.push(
      `| \`${summary.transform}\` | ${summary.filesScanned} | ${summary.filesChanged} | ${conversions} | ${summary.residue.length} | ${residueFiles} |`,
    );
  }
  for (const summary of report.transforms) {
    lines.push('', `### \`${summary.transform}\``, '');
    const rules = sortedEntries(summary.rules);
    if (rules.length > 0) {
      lines.push('| Conversion | Count |', '| ---------- | ----: |');
      for (const [rule, count] of rules.slice(0, top)) {
        lines.push(`| ${rule} | ${count} |`);
      }
      if (rules.length > top) {
        lines.push(`| (${rules.length - top} more) | ${rules.slice(top).reduce((sum, [, count]) => sum + count, 0)} |`);
      }
      lines.push('');
    }
    const reasons = sortedEntries(tally(summary.residue.map((item) => item.reason)));
    if (reasons.length > 0) {
      lines.push('| Residue reason | Count |', '| -------------- | ----: |');
      for (const [reason, count] of reasons.slice(0, top)) {
        lines.push(`| ${reason.replaceAll('|', '\\|')} | ${count} |`);
      }
      if (reasons.length > top) {
        lines.push(
          `| (${reasons.length - top} more) | ${reasons.slice(top).reduce((sum, [, count]) => sum + count, 0)} |`,
        );
      }
    } else if (rules.length === 0) {
      lines.push('No conversions and no residue.');
    }
  }
  return lines.join('\n') + '\n';
};
