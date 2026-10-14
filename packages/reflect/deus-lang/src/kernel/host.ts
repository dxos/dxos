//
// Copyright 2026 DXOS.org
//

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { dirname } from 'node:path';

import { DeusDefect, type HostHandler, NONE, UNIT, type Value, listFrom, listTo, show, some } from './machine.ts';

/** Thrown by `IO.exit` to unwind the machine. */
export class ExitSignal extends Error {
  readonly code: number;

  constructor(code: number) {
    super(`exit ${code}`);
    this.code = code;
  }
}

const text = (value: Value): string => {
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
] as const;

export type HostOptions = {
  args: string[];
  stdout?: (chunk: string) => void;
  stderr?: (chunk: string) => void;
};

/** Implements `IO` against node's synchronous file system API. */
export const createHost = ({ args, stdout, stderr }: HostOptions): HostHandler => {
  const start = performance.now();
  const out = stdout ?? ((chunk: string) => writeSync(1, chunk));
  const err = stderr ?? ((chunk: string) => writeSync(2, chunk));
  return (ability, index, params) => {
    if (ability !== '#IO') {
      throw new DeusDefect(`unhandled ability ${ability} operation ${index}`);
    }
    const [a, b] = params;
    switch (IO_OPS[index]) {
      case 'print':
        out(text(a));
        return UNIT;
      case 'eprint':
        err(text(a));
        return UNIT;
      case 'readFile':
        try {
          return some(readFileSync(text(a), 'utf8'));
        } catch {
          return NONE;
        }
      case 'writeFile':
        mkdirSync(dirname(text(a)), { recursive: true });
        writeFileSync(text(a), text(b));
        return UNIT;
      case 'exists':
        return existsSync(text(a));
      case 'listDir':
        try {
          return listFrom(readdirSync(text(a)).sort());
        } catch {
          return listFrom([]);
        }
      case 'mkdirp':
        mkdirSync(text(a), { recursive: true });
        return UNIT;
      case 'remove':
        rmSync(text(a), { recursive: true, force: true });
        return UNIT;
      case 'args':
        return listFrom(args);
      case 'exit':
        throw new ExitSignal(typeof a === 'number' ? a : 1);
      case 'time':
        return Math.floor(performance.now() - start) | 0;
      case 'readStdin':
        try {
          return readFileSync(0, 'utf8');
        } catch {
          return '';
        }
      case 'writeBytes':
        mkdirSync(dirname(text(a)), { recursive: true });
        writeFileSync(text(a), Uint8Array.from(listTo(b).map((byte) => (typeof byte === 'number' ? byte & 255 : 0))));
        return UNIT;
      case 'getEnv': {
        const value = process.env[text(a)];
        return value === undefined ? NONE : some(value);
      }
      case 'isDir':
        try {
          return statSync(text(a)).isDirectory();
        } catch {
          return false;
        }
      case 'wallClock':
        // Nanoseconds since the Unix epoch overflow an Int, so they travel as decimal text.
        return (BigInt(Math.round((performance.timeOrigin + performance.now()) * 1000)) * 1000n).toString();
      case 'appendFile':
        mkdirSync(dirname(text(a)), { recursive: true });
        appendFileSync(text(a), text(b));
        return UNIT;
      default:
        throw new DeusDefect(`unknown IO operation ${index}`);
    }
  };
};
