//
// Copyright 2026 DXOS.org
//

import { ExitSignal, type HostOptions, createHost } from './host.ts';
import { createCompiler } from './jit.ts';
import { DeusDefect, DeusPanic, Machine, type MachineOptions, UNIT } from './machine.ts';
import { createPrims } from './prims.ts';
import { Str, readAll } from './sexp.ts';

/** The exit code, the machine's steps, and how many compiled calls deoptimized and were replayed. */
export type RunResult = { code: number; steps: number; replays: number };

/**
 * Loads a Core image (a seed or a compiled program) and calls its `(main "hash")` with `()`.
 * Returns the process exit code instead of exiting, so tests can run images in-process.
 */
/** How to run an image: host IO, machine diagnostics, and whether to compile lambdas to JS. */
export type RunOptions = HostOptions & { machine?: MachineOptions; jit?: boolean };

export const runImage = (image: string, options: RunOptions): RunResult => {
  const stderrOf = options.stderr ?? ((chunk: string) => process.stderr.write(chunk));
  let forms;
  try {
    forms = readAll(image);
  } catch (err) {
    // A malformed image is a broken toolchain artifact, reported without a JS stack trace.
    stderrOf(`panic: malformed image: ${err instanceof Error ? err.message : String(err)}\n`);
    return { code: 71, steps: 0, replays: 0 };
  }
  const machine = new Machine(createPrims(), createHost(options), options.machine);
  // Profiles and traces count the machine's own steps, so they run without compiled code.
  if (options.jit !== false && !machine.profile && !machine.trace) {
    machine.compiler = createCompiler(machine);
  }
  const entry = forms.find((form) => Array.isArray(form) && form[0] === 'main');
  if (!Array.isArray(entry) || !(entry[1] instanceof Str)) {
    stderrOf('panic: malformed image: no (main "hash") form\n');
    return { code: 71, steps: 0, replays: 0 };
  }
  const main = entry[1].value;
  const stderr = stderrOf;
  const report = () => {
    if (machine.profile) {
      const top = [...machine.profile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
      stderr(`profile (entries by definition):\n${top.map(([hash, count]) => `  ${count}\t${hash}`).join('\n')}\n`);
    }
  };
  try {
    machine.load(forms);
    machine.call(main, [UNIT]);
    report();
    return { code: 0, steps: machine.steps, replays: machine.replays };
  } catch (err) {
    if (err instanceof ExitSignal) {
      return { code: err.code, steps: machine.steps, replays: machine.replays };
    }
    if (err instanceof DeusDefect) {
      stderr(`defect: ${err.message}\n${machine.defectTrace.map((hash) => `  at #${hash}\n`).join('')}`);
      if (machine.trace) {
        stderr(`recent definitions:\n  ${machine.trace.join('\n  ')}\n`);
      }
      return { code: 70, steps: machine.steps, replays: machine.replays };
    }
    if (err instanceof DeusPanic) {
      stderr(`panic: ${err.message}\n`);
      return { code: 71, steps: machine.steps, replays: machine.replays };
    }
    throw err;
  }
};
