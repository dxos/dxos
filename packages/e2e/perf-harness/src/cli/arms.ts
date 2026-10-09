//
// Copyright 2026 DXOS.org
//

import { execFileSync, spawn } from 'node:child_process';
import {
  closeSync,
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { reportDir } from '../report.ts';
import { readStageEvents } from '../score/run.ts';
import { type StageEvent } from '../score/stages.ts';
import { type Target } from './targets.ts';
import { HarnessError, type Ports, errorCode, git, perfDir, trackedChanges } from './workspace.ts';

/** Present only while a build has the worktree patched to another ref; `git apply -R` it to recover. */
export const restorePatchFile = (root: string): string => path.join(perfDir(root), 'restore.patch');

const LOCKFILE = 'pnpm-lock.yaml';

type RunOptions = { cwd: string; env: NodeJS.ProcessEnv; logFile: string };

/** Runs a command with its output appended to `logFile`, keeping it out of the caller's context. */
export const runLogged = (
  command: string,
  args: ReadonlyArray<string>,
  { cwd, env, logFile }: RunOptions,
): Promise<number> =>
  new Promise((resolve, reject) => {
    mkdirSync(path.dirname(logFile), { recursive: true });
    const log = openSync(logFile, 'a');
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', log, log] });
    child.once('error', (error) => {
      closeSync(log);
      reject(error);
    });
    child.once('exit', (code) => {
      closeSync(log);
      resolve(code ?? 1);
    });
  });

export type Arm = {
  ref: string;
  commit: string;
  /** The served bundle. */
  dir: string;
  cached: boolean;
};

const armsDir = (root: string) => path.join(perfDir(root), 'arms');

const armDir = (root: string, target: Target, key: string) =>
  path.join(armsDir(root), [target.name, target.build.variant, key].filter(Boolean).join('-'));

/** Cached bundles kept per worktree, about 400 MB each; `DX_PERF_KEEP_ARMS` overrides. */
export const keepArms = (): number => {
  const keep = Number.parseInt(process.env.DX_PERF_KEEP_ARMS ?? '', 10);
  return keep > 0 ? keep : 6;
};

/** Removes all but the `keep` most recently used cached bundles, never one in `holding`; returns the removed. */
export const pruneArms = (root: string, keep: number, holding: ReadonlyArray<string>): string[] => {
  const dir = armsDir(root);
  if (!existsSync(dir)) {
    return [];
  }
  const held = new Set(holding);
  const removed = readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((arm) => !held.has(arm))
    .map((arm) => ({ arm, used: statSync(arm).mtimeMs }))
    .sort((left, right) => right.used - left.used)
    .slice(Math.max(0, keep - held.size))
    .map(({ arm }) => arm);
  for (const arm of removed) {
    rmSync(arm, { recursive: true, force: true });
  }
  return removed;
};

const buildBundle = async (root: string, target: Target, logFile: string): Promise<void> => {
  const index = path.join(root, target.appDir, target.build.outDir, 'index.html');
  const env = { ...process.env, ...target.build.env };
  const started = Date.now();
  let code = await runLogged('moon', ['run', target.build.moonTarget], { cwd: root, env, logFile });
  // A task with no declared outputs skips on a cache hit and restores nothing, leaving whichever tree built last.
  if (code === 0 && !(existsSync(index) && statSync(index).mtimeMs >= started)) {
    code = await runLogged('moon', ['run', target.build.moonTarget, '--force'], { cwd: root, env, logFile });
  }
  if (code !== 0) {
    throw new HarnessError(`build failed (${target.build.moonTarget}); log: ${logFile}`);
  }
};

const keep = (root: string, target: Target, dir: string): void => {
  const staging = `${dir}.partial`;
  rmSync(staging, { recursive: true, force: true });
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(path.dirname(dir), { recursive: true });
  cpSync(path.join(root, target.appDir, target.build.outDir), staging, {
    recursive: true,
    mode: constants.COPYFILE_FICLONE,
  });
  renameSync(staging, dir);
};

const applyPatch = (root: string, patch: Buffer, reverse: boolean): void => {
  execFileSync('git', ['apply', '--binary', ...(reverse ? ['-R'] : []), '-'], { cwd: root, input: patch });
};

export type BuildArmOptions = { root: string; target: Target; ref: string; logFile: string };

/**
 * Builds `ref` in this worktree by patching the clean tree to it and back, so no second install is
 * needed. Bundles are cached by tree hash, so a ref already built costs nothing.
 */
export const buildArm = async ({ root, target, ref, logFile }: BuildArmOptions): Promise<Arm> => {
  const commit = git(root, ['rev-parse', '--verify', `${ref}^{commit}`]);
  const tree = git(root, ['rev-parse', `${commit}^{tree}`]);
  const dir = armDir(root, target, tree.slice(0, 12));
  if (existsSync(path.join(dir, 'index.html'))) {
    // The directory's mtime is its last use, which `pruneArms` keeps by.
    const now = new Date();
    utimesSync(dir, now, now);
    return { ref, commit, dir, cached: true };
  }

  if (existsSync(restorePatchFile(root))) {
    throw new HarnessError(
      `an interrupted build left the worktree patched; recover with: git apply -R ${restorePatchFile(root)} && rm ${restorePatchFile(root)}`,
    );
  }
  if (trackedChanges(root).length > 0) {
    throw new HarnessError(
      'tracked files differ from HEAD: commit the attempt (the ledger records commits) or discard it',
    );
  }
  const head = git(root, ['rev-parse', 'HEAD']);
  const changed = commit === head ? [] : git(root, ['diff', '--name-only', 'HEAD', commit]).split('\n').filter(Boolean);
  if (changed.includes(LOCKFILE)) {
    throw new HarnessError(
      `${ref} and HEAD have different dependencies (${LOCKFILE}); compare refs that share a lockfile`,
    );
  }

  const patch =
    changed.length > 0
      ? execFileSync('git', ['diff', '--binary', 'HEAD', commit], { cwd: root, maxBuffer: 1024 * 1024 * 1024 })
      : undefined;
  if (patch) {
    mkdirSync(perfDir(root), { recursive: true });
    writeFileSync(restorePatchFile(root), patch);
    applyPatch(root, patch, false);
  }
  try {
    await buildBundle(root, target, logFile);
  } finally {
    if (patch) {
      applyPatch(root, patch, true);
      rmSync(restorePatchFile(root));
    }
  }
  if (trackedChanges(root).length > 0) {
    throw new HarnessError(`the worktree did not return to HEAD after building ${ref}; inspect git status`);
  }
  keep(root, target, dir);
  return { ref, commit, dir, cached: false };
};

/** The working tree as it stands, tracked changes and all; never cached, since its content has no hash. */
export const buildWorkingTree = async ({ root, target, logFile }: Omit<BuildArmOptions, 'ref'>): Promise<Arm> => {
  if (trackedChanges(root).length === 0) {
    return buildArm({ root, target, ref: 'HEAD', logFile });
  }
  await buildBundle(root, target, logFile);
  const dir = armDir(root, target, 'working-tree');
  keep(root, target, dir);
  return { ref: 'working tree', commit: git(root, ['rev-parse', 'HEAD']), dir, cached: false };
};

/** Whether anything accepts a connection on `port`. */
export const portListening = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host: 'localhost' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

const responds = (port: number, https: boolean): Promise<boolean> =>
  new Promise((resolve) => {
    const request = (https ? httpsRequest : httpRequest)(
      { host: 'localhost', port, path: '/', rejectUnauthorized: false, timeout: 5_000 },
      (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      },
    );
    request.once('error', () => resolve(false));
    request.once('timeout', () => request.destroy());
    request.end();
  });

/**
 * The key and certificate `vite preview` reads when `HTTPS=true` (composer-app's `vite.config.ts`),
 * self-signed on first use; the instrumented browser ignores certificate errors under `--http2`.
 */
const ensureCertificate = (root: string): void => {
  if (existsSync(path.join(root, 'key.pem')) && existsSync(path.join(root, 'cert.pem'))) {
    return;
  }
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '365',
      '-subj',
      '/CN=localhost',
      '-keyout',
      'key.pem',
      '-out',
      'cert.pem',
    ],
    { cwd: root, stdio: 'ignore' },
  );
};

export type Server = { stop: () => Promise<void> };

export type ServeOptions = { root: string; target: Target; dir: string; port: number; logFile: string };

/** `vite preview` of one arm's bundle; every arm is served on the same port, since the port changes the realm set. */
export const serveArm = async ({ root, target, dir, port, logFile }: ServeOptions): Promise<Server> => {
  if (await portListening(port)) {
    throw new HarnessError(`port ${port} is already in use; \`pnpm perf doctor\` shows who holds it`);
  }
  const https = Boolean(target.conditions.http2);
  if (https) {
    ensureCertificate(root);
  }
  mkdirSync(path.dirname(logFile), { recursive: true });
  const log = openSync(logFile, 'a');
  const child = spawn(
    'pnpm',
    ['exec', 'vite', 'preview', '--configLoader', 'native', '--port', String(port), '--strictPort', '--outDir', dir],
    {
      cwd: path.join(root, target.appDir),
      // With `https` set, vite serves preview over HTTP/2.
      env: https ? { ...process.env, HTTPS: 'true' } : process.env,
      detached: true,
      stdio: ['ignore', log, log],
    },
  );
  const pid = child.pid;
  let exited = false;
  const exit = new Promise<void>((resolve) =>
    child.once('exit', () => {
      exited = true;
      closeSync(log);
      resolve();
    }),
  );
  const stop = async () => {
    if (pid !== undefined && !exited) {
      try {
        // The group, so pnpm's vite child dies with it.
        process.kill(-pid, 'SIGTERM');
      } catch (error) {
        if (errorCode(error) !== 'ESRCH') {
          throw error;
        }
      }
    }
    await exit;
    while (await portListening(port)) {
      await sleep(250);
    }
  };

  const deadline = Date.now() + 120_000;
  while (!(await responds(port, https))) {
    if (exited || Date.now() > deadline) {
      await stop();
      throw new HarnessError(`preview server did not come up on port ${port}; log: ${logFile}`);
    }
    await sleep(500);
  }
  return { stop };
};

export type FlowResult = { exitCode: number; seconds: number; events: StageEvent[]; dir: string };

export type RunFlowOptions = {
  root: string;
  target: Target;
  ports: Ports;
  iterations: number;
  /** Where the run's `test-results/perf` is moved once the flow ends. */
  dir: string;
  logFile: string;
  /** Instruments that perturb the run, e.g. `DX_PERF_SNAPSHOTS`; never set by `compare`. */
  env?: Record<string, string>;
};

/** One Playwright run of the target's flow against the server already listening on `ports.http`. */
export const runFlow = async ({
  root,
  target,
  ports,
  iterations,
  dir,
  logFile,
  env: extraEnv = {},
}: RunFlowOptions): Promise<FlowResult> => {
  const results = reportDir(root);
  rmSync(results, { recursive: true, force: true });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DX_PERF_PORT: String(ports.http),
    DX_PERF_DEBUG_PORT: String(ports.debug),
    DX_PERF_ITERATIONS: String(iterations),
    DX_PERF_MODES: 'measure',
    DX_PWA: 'false',
    ...target.env,
    ...extraEnv,
  };
  // Unset CI so the config reuses this server rather than starting its own; no key, so nothing is published.
  delete env.CI;
  delete env.DX_POSTHOG_API_KEY;
  const started = Date.now();
  const exitCode = await runLogged('pnpm', ['exec', 'playwright', 'test', `--config=${target.config}`, target.spec], {
    cwd: path.join(root, target.appDir),
    env,
    logFile,
  });
  const seconds = Math.round((Date.now() - started) / 1000);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(path.dirname(dir), { recursive: true });
  if (existsSync(results)) {
    renameSync(results, dir);
  } else {
    mkdirSync(dir, { recursive: true });
  }
  const events = readStageEvents(dir, target.flow);
  const { until } = target.conditions;
  // A flow that passed ran every stage it reached, so an `until` it never reached was misspelled.
  if (until && exitCode === 0 && !events.some(({ properties }) => properties.stage === until)) {
    const ran = [...new Set(events.map(({ properties }) => properties.stage))].join(', ');
    throw new HarnessError(`--until ${until} names no stage the flow ran (${ran}), so nothing was skipped`);
  }
  return { exitCode, seconds, events, dir };
};
