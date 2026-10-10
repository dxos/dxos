//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { formatValue } from '../score/render.ts';
import { readStageEvents } from '../score/run.ts';
import { type DigestRow, digestRows, groupCosts } from '../summarize/digest.ts';
import { type FunctionCost, type Resolve, sourceMappedId, unmappedId } from '../summarize/profile.ts';
import { createFrameResolver } from '../summarize/sourcemap.ts';
import { type Target, TARGETS } from './targets.ts';
import { HarnessError, perfDir, workspaceRoot } from './workspace.ts';

/** Written beside a run's results: which bundle each arm served, so its profiles map back to source. */
export type ArmsRecord = { target: string; base?: string; candidate: string };

export const ARMS_FILE = 'arms.json';

const isArmsRecord = (value: unknown): value is ArmsRecord =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'target') === 'string' &&
  typeof Reflect.get(value, 'candidate') === 'string';

type Handle = { stage: string; realm: string; key: string; label: string };

const SUMMARY_FILE = 'summary.json';

const isHandle = (value: unknown): value is Handle =>
  typeof value === 'object' &&
  value !== null &&
  ['stage', 'realm', 'key', 'label'].every((field) => typeof Reflect.get(value, field) === 'string');

/** The handles the last `summarize` of this run printed. */
const readHandles = (file: string): Map<string, Handle> => {
  const summary: unknown = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
  const handles: unknown =
    typeof summary === 'object' && summary !== null ? Reflect.get(summary, 'handles') : undefined;
  return new Map(
    typeof handles === 'object' && handles !== null
      ? Object.entries(handles).filter((entry): entry is [string, Handle] => isHandle(entry[1]))
      : [],
  );
};

/** A run id, a path, or the newest run when omitted. */
const runDirOf = (root: string, run: string | undefined): string => {
  const runs = path.join(perfDir(root), 'runs');
  if (run) {
    const dir = existsSync(run) ? path.resolve(run) : path.join(runs, run);
    if (!existsSync(dir)) {
      throw new HarnessError(`no run "${run}" under ${runs}`);
    }
    return dir;
  }
  const newest = existsSync(runs)
    ? readdirSync(runs)
        .filter((name) => existsSync(path.join(runs, name, ARMS_FILE)))
        .sort()
        .at(-1)
    : undefined;
  if (!newest) {
    throw new HarnessError('no measured runs yet; `pnpm perf run` or `pnpm perf compare` first');
  }
  return path.join(runs, newest);
};

type Arm = { dirs: string[]; resolve: Resolve };

type LoadedRun = { target: Target; base?: Arm; candidate: Arm; stages: string[] };

const loadRun = (root: string, runDir: string): LoadedRun => {
  const file = path.join(runDir, ARMS_FILE);
  const arms: unknown = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
  if (!isArmsRecord(arms)) {
    throw new HarnessError(`${runDir} has no ${ARMS_FILE}; it predates summaries or did not finish building`);
  }
  const target = TARGETS[arms.target];
  if (!target) {
    throw new HarnessError(`unknown target "${arms.target}" in ${file}`);
  }
  const resolverFor = (armDir: string): Resolve => {
    const assets = path.join(armDir, 'assets');
    return existsSync(assets)
      ? sourceMappedId(
          createFrameResolver(assets, {
            sourceBase: path.join(root, target.appDir, target.build.outDir, 'assets'),
            workspaceRoot: root,
          }),
        )
      : unmappedId;
  };
  const rounds = readdirSync(runDir).filter((name) => name.startsWith('round-'));
  const dirsOf = (label: string) =>
    rounds.map((round) => path.join(runDir, round, label)).filter((dir) => existsSync(dir));
  const comparing = arms.base !== undefined;
  const candidateDirs = comparing ? dirsOf('candidate') : [path.join(runDir, 'results')];
  const stages = [
    ...new Set(
      candidateDirs.flatMap((dir) =>
        readStageEvents(dir, target.flow).flatMap(({ properties }) =>
          typeof properties.stage === 'string' ? [properties.stage] : [],
        ),
      ),
    ),
  ];
  return {
    target,
    stages,
    candidate: { dirs: candidateDirs, resolve: resolverFor(arms.candidate) },
    ...(arms.base ? { base: { dirs: dirsOf('base'), resolve: resolverFor(arms.base) } } : {}),
  };
};

const ms = (value: number) => formatValue(value, 'ms');
const signedMs = (value: number) => `${value < 0 ? '−' : '+'}${ms(Math.abs(value))}`;

const renderRow = (handle: string, row: DigestRow): string =>
  [
    handle.padEnd(4),
    (row.base === undefined
      ? ms(row.candidate)
      : `${signedMs(row.candidate - row.base)} (${ms(row.base)} → ${ms(row.candidate)})`
    ).padEnd(row.base === undefined ? 9 : 30),
    row.stage.padEnd(16),
    row.realm.padEnd(32),
    row.label,
    row.package ? ` ${row.package}` : '',
  ].join(' ');

export type SummarizeOptions = { run?: string; stage?: string; realm?: string; top: number; heap: boolean };

const SNAPSHOT_REPORT = 'packages/apps/composer-app/scripts/memory/perf-snapshot-report.mjs';

/** The composition of each memory snapshot a `perf run --snapshots` took, through the memory toolkit's report. */
const summarizeHeap = (root: string, runDir: string, top: number): number => {
  const artifacts = path.join(runDir, 'results', 'artifacts');
  const runs = existsSync(artifacts)
    ? readdirSync(artifacts).filter((name) => existsSync(path.join(artifacts, name, 'snapshots')))
    : [];
  if (runs.length === 0) {
    throw new HarnessError(`${runDir} took no memory snapshots; \`pnpm perf run --snapshots idle,end\` first`);
  }
  const file = path.join(runDir, ARMS_FILE);
  const arms: unknown = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
  const dist = isArmsRecord(arms) ? ['--dist', arms.candidate] : [];
  for (const run of runs) {
    process.stdout.write(
      execFileSync(process.execPath, [SNAPSHOT_REPORT, path.join(artifacts, run), '--top', String(top), ...dist], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      }),
    );
  }
  return 0;
};

/**
 * The functions worth reading first in a run's CPU profiles: by self time, or by the change in self
 * time between the arms of a compare. Each row gets a handle that `expand` drills into.
 */
export const summarize = ({ run, stage, realm, top, heap }: SummarizeOptions): number => {
  const root = workspaceRoot();
  const runDir = runDirOf(root, run);
  if (heap) {
    return summarizeHeap(root, runDir, top);
  }
  const loaded = loadRun(root, runDir);
  const comparing = loaded.base !== undefined;
  const groups = groupCosts(
    { ...(loaded.base ? { base: loaded.base } : {}), candidate: loaded.candidate },
    loaded.stages,
    (candidateStage, candidateRealm) =>
      (!stage || candidateStage === stage) && (!realm || candidateRealm.includes(realm)),
  );
  const rows = digestRows(groups, comparing, top);
  const handles: Record<string, Handle> = Object.fromEntries(
    rows.map((row, index) => [`h${index + 1}`, { stage: row.stage, realm: row.realm, key: row.key, label: row.label }]),
  );
  writeFileSync(path.join(runDir, SUMMARY_FILE), JSON.stringify({ handles }, null, 2) + '\n');
  const rounds = loaded.candidate.dirs.length;
  process.stdout.write(
    [
      `${path.relative(root, runDir)}: self time per ${comparing ? `round, candidate − base, over ${rounds} rounds` : `iteration over ${rounds} run`}${stage ? `, stage ${stage}` : ''}${realm ? `, realm ${realm}` : ''}`,
      ...rows.map((row, index) => renderRow(`h${index + 1}`, row)),
      rows.length > 0 ? 'drill into a row: pnpm perf expand <handle>' : 'no profiles matched',
    ].join('\n') + '\n',
  );
  return 0;
};

const neighbours = (
  title: string,
  candidate: Map<string, number>,
  base: Map<string, number> | undefined,
  labelOf: (key: string) => string,
): string[] => {
  const keys = [...new Set([...candidate.keys(), ...(base?.keys() ?? [])])];
  const weight = (key: string) =>
    base ? Math.abs((candidate.get(key) ?? 0) - (base.get(key) ?? 0)) : (candidate.get(key) ?? 0);
  return [
    `${title}:`,
    ...keys
      .sort((left, right) => weight(right) - weight(left))
      .slice(0, 8)
      .map((key) => {
        const now = candidate.get(key) ?? 0;
        return base
          ? `  ${signedMs(now - (base.get(key) ?? 0)).padEnd(10)} ${ms(now).padEnd(9)} ${labelOf(key)}`
          : `  ${ms(now).padEnd(9)} ${labelOf(key)}`;
      }),
  ];
};

/** One summary row's callers and callees, with the same arm-to-arm change when the run compared two arms. */
export const expand = ({ handle, run }: { handle: string; run?: string }): number => {
  const root = workspaceRoot();
  const runDir = runDirOf(root, run);
  const file = path.join(runDir, SUMMARY_FILE);
  const entry = readHandles(file).get(handle);
  if (!entry) {
    throw new HarnessError(`no handle "${handle}" in ${file}; run \`pnpm perf summarize\` first`);
  }
  const { stage, realm, key } = entry;
  const loaded = loadRun(root, runDir);
  const [group] = groupCosts(
    { ...(loaded.base ? { base: loaded.base } : {}), candidate: loaded.candidate },
    loaded.stages,
    (candidateStage, candidateRealm) => candidateStage === stage && candidateRealm === realm,
  );
  const cost: FunctionCost | undefined = group?.candidate.get(key) ?? group?.base.get(key);
  if (!group || !cost) {
    throw new HarnessError(`${handle} no longer resolves in ${runDir}`);
  }
  const baseCost = loaded.base ? group.base.get(key) : undefined;
  const labelOf = (other: string) => (group.candidate.get(other) ?? group.base.get(other))?.label ?? other;
  const now = group.candidate.get(key);
  process.stdout.write(
    [
      `${handle} ${cost.label}${cost.package ? ` (${cost.package})` : ''} in ${stage}, ${realm}`,
      ...(cost.source ? [`source ${cost.source}`] : []),
      loaded.base
        ? `self ${ms(baseCost?.selfMs ?? 0)} → ${ms(now?.selfMs ?? 0)}, total ${ms(baseCost?.totalMs ?? 0)} → ${ms(now?.totalMs ?? 0)} per round`
        : `self ${ms(cost.selfMs)}, total ${ms(cost.totalMs)} per iteration`,
      ...neighbours(
        'called from',
        now?.callers ?? new Map(),
        loaded.base ? (baseCost?.callers ?? new Map()) : undefined,
        labelOf,
      ),
      ...neighbours(
        'calls',
        now?.callees ?? new Map(),
        loaded.base ? (baseCost?.callees ?? new Map()) : undefined,
        labelOf,
      ),
    ].join('\n') + '\n',
  );
  return 0;
};

/**
 * Base self time, per stage across realms, of functions in the files a change touched. A timing win
 * far larger than this is more likely an artifact (skipped work, a shifted wait) than the change.
 */
export const touchedSelfMs = (
  runDir: string,
  touched: ReadonlySet<string>,
  stages: ReadonlySet<string>,
): Map<string, number> => {
  const root = workspaceRoot();
  const loaded = loadRun(root, runDir);
  const totals = new Map<string, number>();
  if (!loaded.base) {
    return totals;
  }
  for (const group of groupCosts({ base: loaded.base, candidate: loaded.candidate }, loaded.stages, (stage) =>
    stages.has(stage),
  )) {
    for (const cost of group.base.values()) {
      if (cost.source && touched.has(cost.source)) {
        totals.set(group.stage, (totals.get(group.stage) ?? 0) + cost.selfMs);
      }
    }
  }
  return totals;
};
