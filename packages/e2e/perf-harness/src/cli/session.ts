//
// Copyright 2026 DXOS.org
//

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { restorePatchFile } from './arms.ts';
import { acquireLock } from './lock.ts';
import { type Conditions, type Target, resolveTarget, withConditions } from './targets.ts';
import {
  HarnessError,
  type Ports,
  derivePorts,
  harnessHash,
  machineLoad,
  nodeSupported,
  perfDir,
  workspaceRoot,
} from './workspace.ts';

let interrupted = false;

/** First SIGINT/SIGTERM asks the session to stop at the next step; a second exits at once. */
export const installInterruptHandlers = (): void => {
  const onSignal = () => {
    if (interrupted) {
      process.exit(4);
    }
    interrupted = true;
    process.stderr.write('stopping after the current step (signal again to exit now)\n');
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
};

export type Session = {
  root: string;
  target: Target;
  ports: Ports;
  harness: string;
  id: string;
  /** `.perf/runs/<id>`: logs, per-round results, the JSON summary. */
  dir: string;
  started: number;
  ignoreLoad: boolean;
  progress: (line: string) => void;
  checkInterrupted: () => void;
  release: () => void;
};

export type OpenSessionOptions = {
  command: string;
  target: string;
  scenario?: string;
  conditions?: Conditions;
  ignoreLoad: boolean;
  lockWaitMinutes: number;
};

const runId = (): string => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `${stamp}-${randomBytes(2).toString('hex')}`;
};

/** Preflight, then the machine lock: one measurement per machine at a time. */
export const openSession = async ({
  command,
  target: name,
  scenario,
  conditions,
  ignoreLoad,
  lockWaitMinutes,
}: OpenSessionOptions): Promise<Session> => {
  const target = withConditions(resolveTarget(name, scenario), conditions);
  if (!nodeSupported()) {
    throw new HarnessError(
      `node ${process.versions.node} cannot run this CLI; use the pinned one (~/.proto/shims/node)`,
    );
  }
  const root = workspaceRoot();
  if (existsSync(restorePatchFile(root))) {
    throw new HarnessError(
      `an interrupted build left the worktree patched; recover with: git apply -R ${restorePatchFile(root)} && rm ${restorePatchFile(root)}`,
    );
  }
  const progress = (line: string) => process.stderr.write(`${line}\n`);
  const release = await acquireLock({
    worktree: root,
    command,
    waitMs: lockWaitMinutes * 60_000,
    onWait: (holder) => progress(`waiting for pid ${holder.pid} (${holder.command}) in ${holder.worktree}`),
  });
  const id = runId();
  const dir = path.join(perfDir(root), 'runs', id);
  mkdirSync(dir, { recursive: true });
  // Spotlight indexing a freshly copied 300 MB bundle is load the next rounds would measure.
  writeFileSync(path.join(perfDir(root), '.metadata_never_index'), '');
  return {
    root,
    target,
    ports: derivePorts(root),
    harness: harnessHash(root, target.harness),
    id,
    dir,
    started: Date.now(),
    ignoreLoad,
    progress,
    checkInterrupted: () => {
      if (interrupted) {
        throw new HarnessError('interrupted');
      }
    },
    release,
  };
};

export const elapsedMinutes = (session: Session): number => Math.round((Date.now() - session.started) / 60_000);

/**
 * Waits for the load average to fall below the core count before measuring, since a build (or another
 * session) leaves load behind that the first rounds would otherwise measure. Refuses if it never does.
 */
export const settle = async (session: Session, maxMinutes = 10): Promise<void> => {
  const deadline = Date.now() + maxMinutes * 60_000;
  let announced = false;
  for (;;) {
    const { load, cores } = machineLoad();
    if (load <= cores || session.ignoreLoad) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new HarnessError(
        `load average ${load.toFixed(1)} still exceeds ${cores} cores after ${maxMinutes} min; measure later or pass --ignore-load`,
      );
    }
    if (!announced) {
      session.progress(`waiting for load ${load.toFixed(1)} to fall below ${cores}`);
      announced = true;
    }
    session.checkInterrupted();
    await sleep(10_000);
  }
};
