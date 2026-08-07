//
// Copyright 2026 DXOS.org
//

// Diagnose a hung dev server: sample the busiest `vite dev` and, when it is unresponsive, kill it.
//
// The recurring failure is a hard loop in an ORPHANED vite process (reparented to init, so `ppid` is
// 1). Ctrl-C only reaches the terminal's foreground process group, which an orphan has left, and a
// process spinning synchronously never reaches the tick where a SIGTERM handler would run — so
// SIGKILL is the only thing that ends it. The sample must be taken BEFORE the kill: once the process
// is gone there is nothing left to explain why it was spinning.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const PATTERN = 'vite/bin/vite.js dev';
const DEFAULT_DURATION_SECONDS = 5;

const args = process.argv.slice(2);
const kill = args.includes('--kill');
const durationArg = args.find((arg) => arg.startsWith('--duration='));
const duration = durationArg ? Number(durationArg.split('=')[1]) : DEFAULT_DURATION_SECONDS;
const outputArg = args.find((arg) => arg.startsWith('--out='));
const output = resolve(outputArg ? outputArg.split('=')[1] : `temp/vite-hang-${Date.now()}.txt`);

const processes = execFileSync('ps', ['-eo', 'pid,ppid,pcpu,etime,command'], { encoding: 'utf8' })
  .split('\n')
  .slice(1)
  .filter((line) => line.includes(PATTERN))
  .map((line) => {
    const [pid, ppid, pcpu, etime, ...command] = line.trim().split(/\s+/);
    return { pid: Number(pid), ppid: Number(ppid), pcpu: Number(pcpu), etime, command: command.join(' ') };
  })
  .sort((a, b) => b.pcpu - a.pcpu);

if (processes.length === 0) {
  console.log(`No process matching "${PATTERN}" is running.`);
  process.exit(0);
}

for (const entry of processes) {
  // ppid 1 means the parent died and the process was reparented — the signature of the hang, and the
  // reason Ctrl-C does nothing.
  const orphaned = entry.ppid === 1 ? ' ORPHANED (ppid 1)' : '';
  console.log(`pid ${entry.pid}  cpu ${entry.pcpu}%  up ${entry.etime}${orphaned}`);
}

const [target] = processes;
console.log(`\nSampling pid ${target.pid} for ${duration}s -> ${output}`);
mkdirSync(dirname(output), { recursive: true });
const sampled = spawnSync('sample', [String(target.pid), String(duration), '-f', output], { stdio: 'inherit' });
if (sampled.status !== 0) {
  console.error(`sample exited with ${sampled.status}; the process may have already gone.`);
}

if (!kill) {
  console.log('\nRe-run with --kill to terminate it after sampling.');
  process.exit(0);
}

console.log(`\nTerminating pid ${target.pid}.`);
spawnSync('kill', ['-TERM', String(target.pid)]);
// A hard loop never handles SIGTERM; give it a moment, then escalate.
spawnSync('sleep', ['3']);
const alive = spawnSync('ps', ['-p', String(target.pid)]).status === 0;
if (alive) {
  console.log('SIGTERM ignored (consistent with a hard loop) — sending SIGKILL.');
  spawnSync('kill', ['-9', String(target.pid)]);
}
console.log(spawnSync('ps', ['-p', String(target.pid)]).status === 0 ? 'STILL ALIVE.' : 'Gone.');
