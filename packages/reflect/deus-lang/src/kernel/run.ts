//
// Copyright 2026 DXOS.org
//

import { ExitSignal, type HostOptions, createHost } from './host.ts';
import { DeusDefect, DeusPanic, Machine, UNIT } from './machine.ts';
import { createPrims } from './prims.ts';
import { Str, readAll } from './sexp.ts';

export type RunResult = { code: number; steps: number };

/**
 * Loads a Core image (a seed or a compiled program) and calls its `(main "hash")` with `()`.
 * Returns the process exit code instead of exiting, so tests can run images in-process.
 */
export const runImage = (image: string, options: HostOptions): RunResult => {
  const stderrOf = options.stderr ?? ((chunk: string) => process.stderr.write(chunk));
  let forms;
  try {
    forms = readAll(image);
  } catch (err) {
    // A malformed image is a broken toolchain artifact, reported without a JS stack trace.
    stderrOf(`panic: malformed image: ${err instanceof Error ? err.message : String(err)}\n`);
    return { code: 71, steps: 0 };
  }
  const machine = new Machine(createPrims(), createHost(options));
  const entry = forms.find((form) => Array.isArray(form) && form[0] === 'main');
  if (!Array.isArray(entry) || !(entry[1] instanceof Str)) {
    stderrOf('panic: malformed image: no (main "hash") form\n');
    return { code: 71, steps: 0 };
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
    return { code: 0, steps: machine.steps };
  } catch (err) {
    if (err instanceof ExitSignal) {
      return { code: err.code, steps: machine.steps };
    }
    if (err instanceof DeusDefect) {
      stderr(`defect: ${err.message}\n${machine.defectTrace.map((hash) => `  at #${hash}\n`).join('')}`);
      if (machine.trace) {
        stderr(`recent definitions:\n  ${machine.trace.join('\n  ')}\n`);
      }
      return { code: 70, steps: machine.steps };
    }
    if (err instanceof DeusPanic) {
      stderr(`panic: ${err.message}\n`);
      return { code: 71, steps: machine.steps };
    }
    throw err;
  }
};
