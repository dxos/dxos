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
  from: string | null;
  /** One trace per subpath; a guard usually covers every entry a headless host imports. */
  exportSubpaths: string[];
  to: string;
  maxChains: number;
  /**
   * Independent condition sets, one per `--conditions` occurrence. A plugin resolves
   * `#capabilities` to a different barrel per runtime, so asserting the property under only one
   * runtime leaves the others unchecked — repeating the flag traces each in the same run.
   */
  conditionSets: string[][];
  packagesOnly: boolean;
  failOn: FailMode | null;
}

/** Collects a repeatable string option, dropping blanks. */
const stringList = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value])
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);

/**
 * Folds repeated `--to` values into one brace pattern.
 *
 * Repeating the flag used to stringify the array — `"@dxos/react-ui,react"` matches no package, so
 * the check found nothing and passed while enforcing nothing. Braces are what the glob layer
 * already understands, so a single value stays byte-identical to before and only the multi-value
 * case changes.
 */
const foldTargets = (targets: string[]): string => (targets.length === 1 ? targets[0] : `{${targets.join(',')}}`);

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
    .usage('$0 (--from <entry.ts> | --export <subpath>) --to <package-or-pattern-or-path> [options]')
    .option('from', { type: 'string', describe: 'Entry file (relative path or absolute)' })
    .option('export', {
      type: 'string',
      array: true,
      describe: 'Package export subpath resolved via package.json exports (e.g. ./plugin). Repeatable.',
    })
    .option('to', {
      type: 'string',
      array: true,
      demandOption: true,
      describe:
        'Terminal: npm package name, file path, or glob pattern (e.g. "*.pcss", "@dxos/react-ui*"). Repeatable.',
    })
    .option('max-chains', { type: 'number', default: 10, describe: 'Stop after this many chains' })
    .option('conditions', {
      type: 'string',
      array: true,
      default: [DEFAULT_CONDITIONS.join(',')],
      describe:
        'Comma-separated package.json export conditions. Repeatable: each occurrence is an ' +
        'independent set traced separately (e.g. --conditions workerd,worker --conditions node).',
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
    .check((args) => {
      const exports = stringList(args.export);
      if (!args.from && exports.length === 0) {
        throw new Error('Provide either --from <entry.ts> or --export <subpath>.');
      }
      if (args.from && exports.length > 0) {
        throw new Error('Use only one of --from or --export.');
      }
      return true;
    })
    .strict()
    .help().argv;

  const maxChains = Number(argv.maxChains);
  if (!Number.isFinite(maxChains) || maxChains < 1) {
    throw new Error(`Invalid --max-chains value: ${String(argv.maxChains)}. Must be a positive integer.`);
  }

  const targets = stringList(argv.to);
  if (targets.length === 0) {
    throw new Error('Provide at least one --to <package-or-pattern-or-path>.');
  }

  const conditionSets = stringList(argv.conditions)
    .map(parseConditions)
    .filter((set) => set.length > 0);
  if (conditionSets.length === 0) {
    throw new Error('Provide at least one non-empty --conditions set.');
  }

  return {
    from: argv.from ? String(argv.from) : null,
    exportSubpaths: stringList(argv.export),
    to: foldTargets(targets),
    maxChains,
    conditionSets,
    packagesOnly: Boolean(argv.packagesOnly),
    failOn: parseFailOn(argv.failOn),
  };
};

/** Traces one entry under one condition set; returns whether it violated `--fail-on`. */
const traceEntry = (args: ParsedArgs, exportSubpath: string | undefined, conditions: string[]): boolean => {
  const result = traceImports({
    from: args.from ?? undefined,
    exportSubpath,
    to: args.to,
    maxChains: args.maxChains,
    conditions,
    packagesOnly: args.packagesOnly,
  });

  const entryLabel = exportSubpath ? `${exportSubpath} (${result.entryPath})` : (args.from ?? result.entryPath);
  // The condition set is named in the label because an entry resolves to a different module per
  // set, so a bare entry name cannot say which resolution the verdict belongs to.
  const label = args.conditionSets.length > 1 ? `${entryLabel} [${conditions.join(',')}]` : entryLabel;
  console.error(`graph: ${result.metafilePath}`);

  if (result.labelChains.length === 0) {
    console.log(`No import paths from "${label}" to "${args.to}".`);
    if (args.failOn === 'missing') {
      console.error('');
      console.error(`Failed because "${label}" does not transitively import "${args.to}".`);
      return true;
    }
    return false;
  }

  console.log(result.rendered);
  const stoppedSuffix = result.stoppedEarly ? `, stopped at --max-chains ${args.maxChains}` : '';
  console.error(`(${result.labelChains.length} chains${stoppedSuffix}; ${result.totalEmitted} terminal chains seen)`);

  if (args.failOn === 'present') {
    console.error('');
    console.error(`Failed because "${label}" transitively imports "${args.to}".`);
    return true;
  }
  return false;
};

const main = async () => {
  const args = await parseArgs();

  // Every entry is traced under every condition set even after one fails, so a single run reports
  // every offending combination rather than only the first — the guard is usually asserting a
  // property of all of them.
  const entries: (string | undefined)[] = args.exportSubpaths.length > 0 ? args.exportSubpaths : [undefined];
  let failed = false;
  for (const conditions of args.conditionSets) {
    for (const entry of entries) {
      failed = traceEntry(args, entry, conditions) || failed;
    }
  }
  process.exit(failed ? 1 : 0);
};

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(2);
});
