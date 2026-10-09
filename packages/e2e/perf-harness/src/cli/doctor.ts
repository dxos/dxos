//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { portListening, restorePatchFile } from './arms.ts';
import { readLedger } from './ledger.ts';
import { LOCK_FILE, lockHolder } from './lock.ts';
import { TARGETS } from './targets.ts';
import {
  HarnessError,
  derivePorts,
  git,
  harnessHash,
  machineLoad,
  nodeSupported,
  perfDir,
  trackedChanges,
  workspaceRoot,
} from './workspace.ts';

const listener = (port: number): string => {
  try {
    const output = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpcn'], { encoding: 'utf8' });
    const pid = output.match(/^p(\d+)/m)?.[1];
    const command = output.match(/^c(.+)$/m)?.[1];
    if (!pid) {
      return 'in use';
    }
    const cwd = execFileSync('lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn'], { encoding: 'utf8' }).match(
      /^n(.+)$/m,
    )?.[1];
    return `in use by pid ${pid} ${command ?? ''}${cwd ? ` in ${cwd}` : ''}`;
  } catch {
    return 'in use';
  }
};

const age = (milliseconds: number): string => {
  const minutes = Math.round(milliseconds / 60_000);
  return minutes < 90 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
};

/** Read-only: everything that would make a measurement fail or mislead, before one starts. */
export const doctor = async ({ target: name }: { target: string }): Promise<number> => {
  const target = TARGETS[name];
  if (!target) {
    throw new HarnessError(`unknown target "${name}"; known: ${Object.keys(TARGETS).join(', ')}`);
  }
  const root = workspaceRoot();
  const ports = derivePorts(root);
  const problems: string[] = [];
  const line = (label: string, text: string, problem?: string) => {
    if (problem) {
      problems.push(problem);
    }
    return `${problem ? '!!' : 'ok'} ${label.padEnd(9)} ${text}`;
  };

  const lines: string[] = [];
  lines.push(line('worktree', `${root} (port slot ${ports.slot})`));
  lines.push(
    line(
      'node',
      process.versions.node,
      nodeSupported() ? undefined : 'node too old to run the CLI; put ~/.proto/shims first on PATH',
    ),
  );
  for (const [label, port] of [
    ['http', ports.http],
    ['debug', ports.debug],
  ] as const) {
    const busy = await portListening(port);
    lines.push(line(label, `${port} ${busy ? listener(port) : 'free'}`, busy ? `port ${port} is taken` : undefined));
  }
  const { load, cores } = machineLoad();
  lines.push(
    line(
      'load',
      `${load.toFixed(1)} on ${cores} cores`,
      load > cores ? 'machine overloaded; timings will not compare' : undefined,
    ),
  );
  const holder = lockHolder();
  lines.push(
    line(
      'lock',
      holder
        ? `held by pid ${holder.pid} (${holder.command}) in ${holder.worktree} since ${holder.started}`
        : `free (${LOCK_FILE})`,
      holder && holder.worktree !== root ? 'another worktree is measuring; perf will wait for it' : undefined,
    ),
  );
  const restore = existsSync(restorePatchFile(root));
  lines.push(
    line(
      'restore',
      restore
        ? `worktree left patched: git apply -R ${restorePatchFile(root)} && rm ${restorePatchFile(root)}`
        : 'none',
      restore ? 'interrupted build left the worktree patched' : undefined,
    ),
  );
  const changes = trackedChanges(root);
  lines.push(
    line(
      'tree',
      changes.length === 0 ? 'clean' : `${changes.length} tracked changes (compare needs a commit; run measures as is)`,
    ),
  );
  const index = path.join(root, target.appDir, target.build.outDir, 'index.html');
  const headTime = Number.parseInt(git(root, ['log', '-1', '--format=%ct']), 10) * 1000;
  lines.push(
    line(
      'bundle',
      existsSync(index)
        ? `${path.join(target.appDir, target.build.outDir)} built ${age(Date.now() - statSync(index).mtimeMs)} ago, HEAD committed ${age(Date.now() - headTime)} ago`
        : 'not built (perf builds it)',
    ),
  );
  const arms = path.join(perfDir(root), 'arms');
  lines.push(line('arms', existsSync(arms) ? `${readdirSync(arms).length} cached under .perf/arms` : 'none cached'));
  lines.push(line('harness', harnessHash(root, target.harness)));
  const ledger = readLedger(root);
  const last = ledger.at(-1);
  lines.push(
    line('ledger', last ? `${ledger.length} rows; last ${last.command} ${last.verdict} (${last.time})` : 'empty'),
  );

  process.stdout.write(lines.join('\n') + '\n');
  return problems.length === 0 ? 0 : 4;
};
