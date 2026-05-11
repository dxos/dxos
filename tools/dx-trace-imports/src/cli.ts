#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { traceImports } from './main.ts';

const DEFAULT_CONDITIONS = ['workerd', 'worker', 'node'] as const;

type FailMode = 'present' | 'missing';

interface ParsedArgs {
  from: string;
  to: string;
  maxChains: number;
  conditions: string[];
  packagesOnly: boolean;
  failOn: FailMode | null;
}

const parseFailOn = (value: unknown): FailMode | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (value === 'present' || value === 'missing') {
    return value;
  }
  throw new Error(`Invalid --fail-on value: ${String(value)}. Expected "present" or "missing".`);
};

const parseConditions = (raw: string): string[] =>
  raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const parseArgs = async (): Promise<ParsedArgs> => {
  const argv: any = await yargs(hideBin(process.argv))
    .scriptName('dx-trace-imports')
    .usage('$0 --from <entry.ts> --to <package-or-pattern-or-path> [options]')
    .option('from', { type: 'string', demandOption: true, describe: 'Entry file (relative path or absolute)' })
    .option('to', {
      type: 'string',
      demandOption: true,
      describe: 'Terminal: npm package name, file path, or glob pattern (e.g. "*.pcss", "@dxos/react-ui*")',
    })
    .option('max-chains', { type: 'number', default: 10, describe: 'Stop after this many chains' })
    .option('conditions', {
      type: 'string',
      default: DEFAULT_CONDITIONS.join(','),
      describe: 'Comma-separated esbuild custom conditions',
    })
    .option('packages-only', {
      type: 'boolean',
      default: false,
      describe: 'Strip filenames, render package-to-package chains, and dedupe',
    })
    .option('fail-on', {
      type: 'string',
      choices: ['present', 'missing'] as const,
      describe: 'Exit non-zero if any chains are present or if no chains are found',
    })
    .strict()
    .help().argv;

  const maxChains = Number(argv.maxChains);
  if (!Number.isFinite(maxChains) || maxChains < 1) {
    throw new Error(`Invalid --max-chains value: ${String(argv.maxChains)}. Must be a positive integer.`);
  }

  return {
    from: String(argv.from),
    to: String(argv.to),
    maxChains,
    conditions: parseConditions(String(argv.conditions ?? '')),
    packagesOnly: Boolean(argv.packagesOnly),
    failOn: parseFailOn(argv.failOn),
  };
};

const main = async () => {
  const args = await parseArgs();

  const result = await traceImports({
    from: args.from,
    to: args.to,
    maxChains: args.maxChains,
    conditions: args.conditions,
    packagesOnly: args.packagesOnly,
  });

  console.error(`metafile: ${result.metafilePath}`);

  if (result.labelChains.length === 0) {
    console.log(`No import paths from "${args.from}" to "${args.to}".`);
    if (args.failOn === 'missing') {
      console.error('');
      console.error(`Failed because "${args.from}" does not transitively import "${args.to}".`);
      process.exit(1);
    }
    process.exit(0);
  }

  console.log(result.rendered);
  const stoppedSuffix = result.stoppedEarly ? `, stopped at --max-chains ${args.maxChains}` : '';
  console.error(`(${result.labelChains.length} chains${stoppedSuffix}; ${result.totalEmitted} terminal chains seen)`);

  if (args.failOn === 'present') {
    console.error('');
    console.error(`Failed because "${args.from}" transitively imports "${args.to}".`);
    process.exit(1);
  }
  process.exit(0);
};

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(2);
});
