//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
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

import { ExitSignal, IO_OPS, text } from './io.ts';
import { DeusDefect, type HostHandler, NONE, UNIT, listFrom, listTo, pair, some } from './machine.ts';

export type HostOptions = {
  args: string[];
  stdout?: (chunk: string) => void;
  stderr?: (chunk: string) => void;
};

/** Time to wait for a full pipe to drain before writing again. */
const PIPE_WAIT_MS = 1;

/**
 * Writes all of `chunk` to `fd`. A pipe takes a partial write when nearly full and refuses with
 * `EAGAIN` when full (node makes stdio pipes non-blocking), so one `writeSync` can lose output.
 */
const writeAll = (fd: number, chunk: string) => {
  const bytes = Buffer.from(chunk, 'utf8');
  const pause = new Int32Array(new SharedArrayBuffer(4));
  let offset = 0;
  while (offset < bytes.length) {
    try {
      offset += writeSync(fd, bytes, offset, bytes.length - offset);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EAGAIN') {
        throw err;
      }
      Atomics.wait(pause, 0, 0, PIPE_WAIT_MS);
    }
  }
};

/** Implements `IO` against node's synchronous file system API. */
export const createHost = ({ args, stdout, stderr }: HostOptions): HostHandler => {
  const start = performance.now();
  const out = stdout ?? ((chunk: string) => writeAll(1, chunk));
  const err = stderr ?? ((chunk: string) => writeAll(2, chunk));
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
      case 'readFile': {
        // A missing file is common (a store asks for metadata it may not hold), and a thrown error costs more than a look.
        const path = text(a);
        if (!existsSync(path)) {
          return NONE;
        }
        try {
          return some(readFileSync(path, 'utf8'));
        } catch {
          return NONE;
        }
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
      case 'exec': {
        const result = spawnSync(text(a), listTo(b).map(text), { encoding: 'utf8', maxBuffer: 1 << 28 });
        const code = result.error ? 127 : (result.status ?? 1);
        const stderr = result.error ? result.error.message : result.stderr;
        return pair(code, pair(result.stdout ?? '', stderr));
      }
      default:
        throw new DeusDefect(`unknown IO operation ${index}`);
    }
  };
};
