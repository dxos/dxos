//
// Copyright 2026 DXOS.org
//

import { DeusDefect, type Value, show } from './machine.ts';

/** Thrown by `IO.exit` to unwind the machine. */
export class ExitSignal extends Error {
  readonly code: number;

  constructor(code: number) {
    super(`exit ${code}`);
    this.code = code;
  }
}

export const text = (value: Value): string => {
  if (typeof value !== 'string') {
    throw new DeusDefect(`IO: expected Text, got ${show(value)}`);
  }
  return value;
};

/**
 * Operation indices of the built-in `IO` ability (`#IO`). The DEUS declaration in
 * deus/builtins.deus lists the same operations in the same order.
 */
export const IO_OPS = [
  'print',
  'eprint',
  'readFile',
  'writeFile',
  'exists',
  'listDir',
  'mkdirp',
  'remove',
  'args',
  'exit',
  'time',
  'readStdin',
  'writeBytes',
  'getEnv',
  'isDir',
  'wallClock',
  'appendFile',
  'exec',
] as const;
