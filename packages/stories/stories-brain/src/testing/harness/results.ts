//
// Copyright 2026 DXOS.org
//

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { log } from '@dxos/log';

import { LIMIT, PACKAGE_ROOT, RESULTS_DIR, RESULTS_OUT } from './config';

// Capped (LIMIT-ed) iteration runs write to a `partial/` subdir so they never clobber the canonical
// full-feed results.
const SUBDIR = LIMIT !== undefined ? 'partial/' : '';

/** Path for a named result document (override the whole path with `RESULTS_OUT`). */
export const resultsPath = (name: string): string => RESULTS_OUT ?? `${RESULTS_DIR}${SUBDIR}${name}.json`;

/** Renders an absolute path as package-relative (e.g. `fixtures/local/fact-store.json`) for JSON output. */
export const toRelative = (absolutePath: string): string =>
  absolutePath.startsWith(PACKAGE_ROOT) ? absolutePath.slice(PACKAGE_ROOT.length) : absolutePath;

/** Writes a result document as pretty JSON, creating the directory as needed, and logs the path. */
export const writeResults = (name: string, report: unknown): string => {
  const path = resultsPath(name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(report, null, 2));
  log.info('wrote results', { path });
  return path;
};

/** The markdown path for a named result (`<name>.md`, sibling of the JSON). */
const responsesPath = (name: string): string => resultsPath(name).replace(/\.json$/, '.md');

/**
 * Writes the free-text outputs to a sister markdown file (`<name>.md`) so responses are readable
 * outside the (compact, stats-only) JSON. Each section is a titled block.
 */
export const writeResponses = (name: string, sections: readonly { title: string; body: string }[]): string => {
  const path = responsesPath(name);
  mkdirSync(dirname(path), { recursive: true });
  const body = sections.map((section) => `## ${section.title}\n\n${section.body.trim()}\n`).join('\n');
  writeFileSync(path, `# ${name}\n\n${body}`);
  log.info('wrote responses', { path });
  return path;
};

export type ResponseLog = {
  readonly path: string;
  readonly append: (section: { title: string; body: string }) => void;
};

/**
 * Opens an incremental responses markdown file, truncating it, and returns an `append` that writes
 * one titled block per call — so long runs stream their output to disk as each response completes
 * (and partial results survive an interrupted run).
 */
export const startResponseLog = (name: string): ResponseLog => {
  const path = responsesPath(name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `# ${name}\n\n`);
  return {
    path,
    append: (section) => appendFileSync(path, `## ${section.title}\n\n${section.body.trim()}\n\n`),
  };
};

export const round = (value: number): number => Math.round(value * 100) / 100;
