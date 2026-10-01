//
// Copyright 2025 DXOS.org
//

import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { TRANSFORMS, formatFiles, formatSummary, run } from './react-ui-next/index.ts';

const USAGE = `Usage: codemorph --transform <name|all> [--dry-run] [--report <file.json>] [--summary <file.md>] [--exclude <path>]... [--format] <paths...>

Transforms (all runs them in this order):
${TRANSFORMS.map((transform) => `  ${transform.name.padEnd(12)}${transform.description}`).join('\n')}
`;

const main = () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'transform': { type: 'string', short: 't' },
      'dry-run': { type: 'boolean', default: false },
      'report': { type: 'string' },
      'summary': { type: 'string' },
      'exclude': { type: 'string', multiple: true, default: [] },
      'format': { type: 'boolean', default: false },
      'help': { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help || !values.transform || positionals.length === 0) {
    process.stdout.write(USAGE);
    process.exitCode = values.help ? 0 : 1;
    return;
  }
  const names =
    values.transform === 'all' ? TRANSFORMS.map((transform) => transform.name) : values.transform.split(',');
  const transforms = TRANSFORMS.filter((transform) => names.includes(transform.name));
  const unknown = names.filter((name) => !TRANSFORMS.some((transform) => transform.name === name));
  if (unknown.length > 0) {
    process.stderr.write(`Unknown transform: ${unknown.join(', ')}\n\n${USAGE}`);
    process.exitCode = 1;
    return;
  }

  const report = run({ paths: positionals, transforms, exclude: values.exclude, dryRun: values['dry-run'] });
  if (values.format && !values['dry-run'] && report.changed.length > 0) {
    formatFiles(report.changed);
  }
  const summary = formatSummary(report);
  if (values.report) {
    writeFileSync(values.report, JSON.stringify(report, null, 2) + '\n');
  }
  if (values.summary) {
    writeFileSync(values.summary, summary);
  }
  process.stdout.write(summary);
};

main();
