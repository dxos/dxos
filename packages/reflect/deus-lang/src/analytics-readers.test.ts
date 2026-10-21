//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';

const { root, scratch, deus } = cliHarness('analytics-readers-');

// The readers are Python libraries the repository does not install: `$DEUS_PYTHON` names an interpreter that has them.
const python = process.env.DEUS_PYTHON ?? 'python3';
const readers = spawnSync(python, ['-c', 'import pyarrow, duckdb, pyiceberg']).status === 0;

/** Every file under `dir` whose name ends with `suffix`. */
const filesUnder = (dir: string, suffix: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesUnder(join(dir, entry.name), suffix)
      : entry.name.endsWith(suffix)
        ? [join(dir, entry.name)]
        : [],
  );

const run = (args: string[]) => {
  const result = spawnSync(python, args, { encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
};

// Analytics.Spec R-6: the files a push writes are read by the tools analytics runs on.
describe('pushed events and their readers', () => {
  test('pyarrow, DuckDB and Iceberg read pushed events', { skip: !readers, timeout: 240_000 }, ({ expect }) => {
    // `init` finds the builtins and prelude through DEUS_HOME, as bin/deus.mjs sets it.
    process.env.DEUS_HOME = root;
    const c = ['--codebase', join(scratch, 'codebase')];
    expect(deus('init', ...c).code).toBe(0);
    const source = join(scratch, 'probe.deus');
    writeFileSync(source, '@[event]\nstructure Probe.Run where\n  name : Text\n  passed : Bool\n  millis : Int\n');
    expect(deus('add', source, ...c).code).toBe(0);
    expect(deus('event', 'record', 'Probe.Run', 'name=alpha', 'passed=true', 'millis=12', ...c).code).toBe(0);
    expect(deus('event', 'record', 'Probe.Run', 'name=beta', 'passed=false', 'millis=40', ...c).code).toBe(0);
    const remote = join(scratch, 'remote');
    deus('remote', 'add', 'origin', remote, ...c);
    expect(deus('event', 'push', ...c).code).toBe(0);
    const [parquet] = filesUnder(remote, '.parquet');
    expect(parquet).toBeDefined();
    const rows = "[(r['name'], r['passed'], r['millis']) for r in t.to_pylist()]";

    const arrow = run([
      '-c',
      `import pyarrow.parquet as pq, sys\nt = pq.read_table(sys.argv[1])\nprint(${rows})`,
      parquet ?? '',
    ]);
    expect([arrow.code, arrow.stdout.trim()]).toEqual([0, "[('alpha', True, 12), ('beta', False, 40)]"]);

    const duck = run([
      '-c',
      'import duckdb, sys\nprint(duckdb.sql(f"select name, passed, millis from read_parquet(\'{sys.argv[1]}\') order by name").fetchall())',
      parquet ?? '',
    ]);
    expect([duck.code, duck.stdout.trim()]).toEqual([0, "[('alpha', True, 12), ('beta', False, 40)]"]);

    // Each event type is one Iceberg table, named after the type's last segment.
    const published = run([
      join(root, 'scripts/analytics-publish.py'),
      remote,
      '--local',
      join(scratch, 'warehouse'),
      '--query',
      'select count(*) as runs, sum(millis) as millis from run',
    ]);
    expect(published.code).toBe(0);
    expect(published.stdout).toContain('deus.run: 1 new files');
    expect(published.stdout).toMatch(/│\s+2 │\s+52 │/);
  });
});
