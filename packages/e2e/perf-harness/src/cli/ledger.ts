//
// Copyright 2026 DXOS.org
//

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { perfDir } from './workspace.ts';

export const LEDGER_COLUMNS = [
  'id',
  'time',
  'command',
  'target',
  'base',
  'head',
  'harness',
  'rounds',
  'verdict',
  'summary',
  'dir',
] as const;

export type LedgerRow = Record<(typeof LEDGER_COLUMNS)[number], string>;

export const ledgerFile = (root: string): string => path.join(perfDir(root), 'ledger.tsv');

const cell = (value: string) => value.replace(/[\t\n\r]+/g, ' ');

/** One row per measurement this worktree ran, kept or not, so a later attempt can see what was tried. */
export const appendLedger = (root: string, row: LedgerRow): void => {
  const file = ledgerFile(root);
  mkdirSync(path.dirname(file), { recursive: true });
  const header = existsSync(file) ? '' : LEDGER_COLUMNS.join('\t') + '\n';
  appendFileSync(file, header + LEDGER_COLUMNS.map((column) => cell(row[column])).join('\t') + '\n');
};

export const readLedger = (root: string): LedgerRow[] => {
  const file = ledgerFile(root);
  if (!existsSync(file)) {
    return [];
  }
  const [header, ...lines] = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const columns = header.split('\t');
  return lines.map((line) => {
    const values = line.split('\t');
    const get = (column: string) => values[columns.indexOf(column)] ?? '';
    return {
      id: get('id'),
      time: get('time'),
      command: get('command'),
      target: get('target'),
      base: get('base'),
      head: get('head'),
      harness: get('harness'),
      rounds: get('rounds'),
      verdict: get('verdict'),
      summary: get('summary'),
      dir: get('dir'),
    };
  });
};
