#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Query NDJSON log files (e.g. composer vite-plugin-log / LogBuffer exports).
 *
 * Usage:
 *   node scripts/query-logs.mjs <file.ndjson> [-q filter]... [-g pattern]...
 *
 * -q: comma-separated filters in LOG_FILTER form (see @dxos/log parseFilter).
 *     Repeat -q for OR across groups; within one -q, filters combine like shouldLog (include/exclude).
 * Excludes use a ! prefix (!rpc); bare !rpc is normalized to !rpc:trace internally (via -rpc:trace for @dxos/log).
 *
 * -g: JavaScript RegExp source; repeat for AND. Matched against each full JSON line.
 *
 * @example
 * node scripts/query-logs.mjs app.log -q info -q 'process-manager:debug'
 * node scripts/query-logs.mjs app.log -q 'info,process-manager:debug,!rpc' -g 'lifecycle'
 */

import { createReadStream, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const logPackageEntry = join(repoRoot, 'packages/common/log/dist/lib/node-esm/index.mjs');

if (!existsSync(logPackageEntry)) {
  console.error('query-logs: @dxos/log is not built. Run: moon run log:build');
  process.exit(1);
}

const { parseFilter, shouldLog, LogLevel, shortLevelName } = await import(pathToFileURL(logPackageEntry).href);

const letterToLevel = Object.fromEntries(
  Object.entries(shortLevelName).map(([level, letter]) => [letter, Number(level)]),
);

/**
 * CLI uses `!` for excludes; @dxos/log uses `-` on the pattern. Bare `!foo` becomes `-foo:trace` for parseFilter.
 */
const normalizeFilterToken = (token) => {
  let t = token.trim();
  if (t.startsWith('!')) {
    t = `-${t.slice(1)}`;
  }
  if (t.startsWith('-') && !t.includes(':')) {
    return `${t}:trace`;
  }
  return t;
};

const parseFilterGroup = (q) => {
  const tokens = q.split(/,\s*/).map(normalizeFilterToken);
  return parseFilter(tokens);
};

const recordToEntry = (record) => {
  const level = letterToLevel[record.l] ?? LogLevel.INFO;
  const meta = {};
  if (record.f != null) {
    meta.F = record.f;
  }
  if (record.n != null) {
    meta.L = record.n;
  }
  return {
    level,
    message: record.m,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  };
};

const formatField = (value) => {
  if (value == null || value === '') {
    return '';
  }
  return String(value).replace(/\r?\n/g, '\\n');
};

const formatLine = (record) => {
  const fileLine = record.f != null || record.n != null ? `${record.f ?? ''}:${record.n ?? ''}` : '';
  return [
    formatField(record.t),
    formatField(record.l),
    fileLine,
    formatField(record.o),
    formatField(record.m),
    formatField(record.c),
    formatField(record.e),
  ].join(' ');
};

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    q: { type: 'string', multiple: true },
    g: { type: 'string', multiple: true },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
  strict: true,
});

if (values.help || positionals.length === 0) {
  console.error(`Usage: query-logs <ndjson-file> [-q <filter>]... [-g <regexp>]...

  -q   Comma-separated filters (pattern:level, level only, !exclude:level).
       ! prefix excludes paths containing the substring (same rules as @dxos/log with leading -).
       Repeat -q to OR groups. Omit -q to allow all records (still apply -g).
  -g   RegExp source tested against each raw JSON line; repeat -g for AND.

Examples:
  query-logs app.log -q info
  query-logs app.log -q 'info,packages/foo:debug,!rpc'
  query-logs app.log -q debug -g 'ProcessManager'
`);
  process.exit(values.help ? 0 : 1);
}

const logFile = positionals[0];
if (!existsSync(logFile)) {
  console.error(`query-logs: file not found: ${logFile}`);
  process.exit(1);
}

const filterGroups = (values.q ?? []).map(parseFilterGroup);

const greps = (values.g ?? []).map((source) => new RegExp(source));

const matchesGrep = (rawLine) => greps.every((re) => re.test(rawLine));

const matchesQuery = (entry, rawLine) => {
  if (filterGroups.length > 0 && !filterGroups.some((filters) => shouldLog(entry, filters))) {
    return false;
  }
  if (greps.length > 0 && !matchesGrep(rawLine)) {
    return false;
  }
  return true;
};

const input = createReadStream(logFile, { encoding: 'utf8' });
const rl = readline.createInterface({ input, crlfDelay: Number.POSITIVE_INFINITY });

for await (const rawLine of rl) {
  const line = rawLine.trim();
  if (line.length === 0) {
    continue;
  }
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    continue;
  }
  const entry = recordToEntry(record);
  if (!matchesQuery(entry, line)) {
    continue;
  }
  console.log(formatLine(record));
}
