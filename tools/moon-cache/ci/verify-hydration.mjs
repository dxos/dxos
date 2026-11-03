#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Runs moon, then checks that every task it restored from a cache got back the outputs it declares.
//
// moon fails a task whose declared output is missing after it runs, but it accepts an output directory
// that exists and is empty, archives it as an entry with no files, and later hydrates that entry as a
// success that restores nothing. Every consumer of the hash then fails (TS7016, UNRESOLVED_IMPORT) and a
// re-run hydrates the same entry. So after the run, a hydrated task whose declared output is missing or
// empty is rebuilt with `--force`, which keeps the hash and overwrites the entry for every later job,
// and a failed command is run once more against the repaired outputs.
//
// Invoked by the `moon` shim beside this file, which CI puts first on PATH: tools/moon-cache/README.md.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const MOON = process.env.MOON_REAL_BIN || 'moon';
const LABEL = 'moon cache';
// Action statuses in moon's run report that mean the task did not succeed.
const FAILED_STATUSES = new Set(['failed', 'invalid', 'timed-out', 'aborted']);

/** Prints a GitHub annotation in CI, a plain line elsewhere. */
const annotate = (level, message) => {
  const oneLine = message.replaceAll('\n', '%0A');
  console.log(process.env.GITHUB_ACTIONS ? `::${level} title=${LABEL}::${oneLine}` : `[${LABEL}] ${level}: ${message}`);
};

/** The directory holding `.moon/workspace.yml`, from the current directory upwards. */
const findWorkspaceRoot = (start) => {
  let dir = resolve(start);
  while (!existsSync(join(dir, '.moon', 'workspace.yml'))) {
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
  return dir;
};

const runMoon = (args) => spawnSync(MOON, args, { stdio: 'inherit' }).status ?? 1;

/**
 * From the run report: tasks whose outputs came from the local or remote cache, with their hashes, and
 * the targets of tasks that failed.
 */
const readRunReport = (reportPath, since) => {
  if (!existsSync(reportPath) || statSync(reportPath).mtimeMs < since) {
    return { hydrated: [], failed: [] };
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const hydrated = [];
  const failed = [];
  for (const action of report.actions ?? []) {
    const target = action.node?.params?.target;
    if (!target) {
      continue;
    }
    if (FAILED_STATUSES.has(action.status)) {
      failed.push(target);
    }
    const operations = action.operations ?? [];
    const restored = operations.some(
      (operation) => operation.meta?.type === 'output-hydration' && String(operation.status).startsWith('cached'),
    );
    if (restored) {
      const hash = operations.find((operation) => operation.meta?.type === 'hash-generation')?.meta?.hash ?? '';
      hydrated.push({ target, hash });
    }
  }
  return { hydrated, failed };
};

/**
 * Per target: the workspace-relative outputs it must produce, and the targets it depends on. Globs and
 * `optional` literals are skipped, since moon allows them to be missing.
 */
const readTaskGraph = (root) => {
  const result = spawnSync(MOON, ['query', 'tasks'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    annotate('warning', `\`moon query tasks\` exited ${result.status}; cannot check hydrated outputs.`);
    return undefined;
  }

  const outputs = new Map();
  const deps = new Map();
  for (const [project, tasks] of Object.entries(JSON.parse(result.stdout.toString()).tasks ?? {})) {
    for (const [id, task] of Object.entries(tasks)) {
      outputs.set(
        `${project}:${id}`,
        Object.entries(task.outputFiles ?? {})
          .filter(([, params]) => !params?.optional)
          .map(([path]) => path),
      );
      deps.set(`${project}:${id}`, (task.deps ?? []).map((dep) => dep.target).filter(Boolean));
    }
  }
  return { outputs, deps };
};

/** True when `target` is one of `roots` or depends on one of them, directly or transitively. */
const reaches = (deps, target, roots, seen = new Set()) => {
  if (roots.has(target)) {
    return true;
  }
  if (seen.has(target)) {
    return false;
  }
  seen.add(target);
  return (deps.get(target) ?? []).some((dep) => reaches(deps, dep, roots, seen));
};

/** True when the path is a file, or a directory with at least one file somewhere beneath it. */
const hasContent = (path) => {
  if (!existsSync(path)) {
    return false;
  }
  if (!statSync(path).isDirectory()) {
    return true;
  }
  return readdirSync(path, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() ? hasContent(join(path, entry.name)) : true,
  );
};

const findEmptyOutputs = (root, outputs, target) =>
  (outputs.get(target) ?? []).filter((output) => !hasContent(join(root, output)));

/**
 * Deletes the local CAS manifest for a hash. The local store writes a manifest only when none exists
 * for its hash, so without this `--force` would leave the empty one in place for the next hydration;
 * the remote store overwrites on every upload.
 */
const dropLocalManifest = (root, hash) => {
  if (hash.length < 3) {
    return;
  }
  // `unstable_sharedWorktreeCache` keeps manifests in the base checkout, which on a CI runner is `root`.
  const commonDir = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root });
  const bases = new Set([root]);
  if (commonDir.status === 0) {
    bases.add(dirname(commonDir.stdout.toString().trim()));
  }
  for (const base of bases) {
    rmSync(join(base, '.moon', 'cache', 'manifests', hash.slice(0, 2), hash.slice(2)), { force: true });
  }
};

const main = () => {
  const args = process.argv.slice(2);
  const startedAt = Date.now();
  const status = runMoon(args);

  const root = findWorkspaceRoot(process.cwd());
  if (!root) {
    return status;
  }

  const { hydrated, failed } = readRunReport(join(root, '.moon', 'cache', 'runReport.json'), startedAt);
  if (hydrated.length === 0) {
    return status;
  }

  const graph = readTaskGraph(root);
  if (!graph) {
    return status;
  }
  const { outputs, deps } = graph;

  const broken = hydrated
    .map((task) => ({ ...task, empty: findEmptyOutputs(root, outputs, task.target) }))
    .filter((task) => task.empty.length > 0);
  if (broken.length === 0) {
    return status;
  }

  for (const task of broken) {
    annotate(
      'warning',
      `${task.target} (${task.hash.slice(0, 8)}) was restored from the cache without ${task.empty.join(', ')}; rebuilding it with --force to overwrite the entry.`,
    );
  }

  for (const task of broken) {
    dropLocalManifest(root, task.hash);
  }
  const targets = broken.map((task) => task.target);
  const repairStatus = runMoon(['run', ...targets, '--force']);
  const repaired = targets.filter((target) => findEmptyOutputs(root, outputs, target).length === 0);
  const unrepaired = targets.filter((target) => !repaired.includes(target));
  for (const target of unrepaired) {
    annotate(
      'error',
      `${target} leaves ${findEmptyOutputs(root, outputs, target).join(', ')} missing or empty even when built from scratch (exit ${repairStatus}). ` +
        'moon archives an empty directory output as an entry that restores nothing: make the task write a file there, or declare the output as a glob.',
    );
  }

  // Every later job that shares the hash would hydrate the same empty entry, so this fails the step.
  if (unrepaired.length > 0) {
    return status !== 0 ? status : repairStatus !== 0 ? repairStatus : 1;
  }

  // moon archives only a task that succeeded, so a failed rebuild left the bad entry in place.
  if (repairStatus !== 0) {
    annotate(
      'error',
      `Rebuilding ${targets.join(', ')} failed (exit ${repairStatus}); the cache entry was not replaced.`,
    );
    return status !== 0 ? status : repairStatus;
  }

  if (status === 0) {
    return status;
  }

  // A retry's verdict replaces the first run's only for failures the repair can explain; any other
  // failure would get a free second attempt and could turn a real red into green.
  const repairedSet = new Set(repaired);
  const unexplained = failed.filter((target) => !reaches(deps, target, repairedSet));
  if (failed.length === 0 || unexplained.length > 0) {
    annotate(
      'notice',
      `Not re-running: ${unexplained.length > 0 ? unexplained.join(', ') : 'the failure'} does not depend on the rebuilt ${repaired.join(', ')}.`,
    );
    return status;
  }

  annotate('notice', `Re-running \`moon ${args.join(' ')}\` against the rebuilt outputs of ${repaired.join(', ')}.`);
  return runMoon(args);
};

process.exit(main());
