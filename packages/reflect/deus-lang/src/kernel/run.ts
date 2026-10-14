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
  const forms = readAll(image);
  const machine = new Machine(createPrims(), createHost(options));
  machine.load(forms);
  const entry = forms.find((form) => Array.isArray(form) && form[0] === 'main');
  if (!Array.isArray(entry) || !(entry[1] instanceof Str)) {
    throw new Error('image has no (main "hash") form');
  }
  const stderr = options.stderr ?? ((chunk: string) => process.stderr.write(chunk));
  const report = () => {
    if (machine.profile) {
      const top = [...machine.profile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
      stderr(`profile (entries by definition):\n${top.map(([hash, count]) => `  ${count}\t${hash}`).join('\n')}\n`);
    }
  };
  try {
    machine.call(entry[1].value, [UNIT]);
    report();
    return { code: 0, steps: machine.steps };
  } catch (err) {
    if (err instanceof ExitSignal) {
      return { code: err.code, steps: machine.steps };
    }
    if (err instanceof DeusDefect) {
      stderr(`defect: ${err.message}\n`);
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
