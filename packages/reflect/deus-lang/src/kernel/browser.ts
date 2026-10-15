//
// Copyright 2026 DXOS.org
//

// The TypeScript kernel without node: runs an image in a browser page with `IO` answered from an
// in-memory file system (the one `deus-kernel/embed/host.mjs` creates), so a page can pick this
// kernel, whose JIT is faster on the toolchain, over the wasm one.

import { type RunResult, executeImage } from './execute.ts';
import { ExitSignal, IO_OPS, text } from './io.ts';
import { DeusDefect, type HostHandler, NONE, UNIT, listFrom, listTo, pair, some } from './machine.ts';
import { sha256 } from './sha256.ts';

/** The file system a page keeps in memory; paths are absolute. */
export type Files = {
  normalize: (path: string) => string;
  read: (path: string) => string | undefined;
  write: (path: string, text: string) => void;
  exists: (path: string) => boolean;
  isDir: (path: string) => boolean;
  mkdirp: (path: string) => void;
  remove: (path: string) => void;
  list: (path: string) => string[];
};

export type BrowserRunOptions = {
  fs: Files;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  stdin?: string;
  jit?: boolean;
};

/** Answers `#IO` against `fs`; output goes to `out`. */
const createMemoryHost = (
  { fs, args = [], env = {}, cwd = '/', stdin = '' }: BrowserRunOptions,
  out: { stdout: string; stderr: string },
): HostHandler => {
  const started = performance.now();
  const resolve = (path: string) => fs.normalize(path.startsWith('/') ? path : `${cwd}/${path}`);
  return (ability, index, params) => {
    if (ability !== '#IO') {
      throw new DeusDefect(`unhandled ability ${ability} operation ${index}`);
    }
    const [a, b] = params;
    switch (IO_OPS[index]) {
      case 'print':
        out.stdout += text(a);
        return UNIT;
      case 'eprint':
        out.stderr += text(a);
        return UNIT;
      case 'readFile': {
        const content = fs.read(resolve(text(a)));
        return content === undefined ? NONE : some(content);
      }
      case 'writeFile':
        fs.write(resolve(text(a)), text(b));
        return UNIT;
      case 'exists':
        return fs.exists(resolve(text(a)));
      case 'listDir':
        return listFrom(fs.list(resolve(text(a))));
      case 'mkdirp':
        fs.mkdirp(resolve(text(a)));
        return UNIT;
      case 'remove':
        fs.remove(resolve(text(a)));
        return UNIT;
      case 'args':
        return listFrom(args);
      case 'exit':
        throw new ExitSignal(typeof a === 'number' ? a : 1);
      case 'time':
        return Math.floor(performance.now() - started) | 0;
      case 'readStdin':
        return stdin;
      case 'writeBytes':
        fs.write(
          resolve(text(a)),
          listTo(b)
            .map((byte) => String.fromCharCode(typeof byte === 'number' ? byte & 255 : 0))
            .join(''),
        );
        return UNIT;
      case 'getEnv':
        return text(a) in env ? some(env[text(a)]) : NONE;
      case 'isDir':
        return fs.isDir(resolve(text(a)));
      case 'wallClock':
        return (BigInt(Date.now()) * 1_000_000n).toString();
      case 'appendFile':
        fs.write(resolve(text(a)), (fs.read(resolve(text(a))) ?? '') + text(b));
        return UNIT;
      case 'exec':
        return pair(127, pair('', 'exec: no processes in the browser\n'));
      default:
        throw new DeusDefect(`unknown IO operation ${index}`);
    }
  };
};

/** Runs the image's main with `args` against `fs`, returning its output and exit code. */
export const runInBrowser = (
  image: string,
  options: BrowserRunOptions,
): RunResult & { stdout: string; stderr: string } => {
  const out = { stdout: '', stderr: '' };
  const result = executeImage(image, {
    jit: options.jit,
    host: createMemoryHost(options, out),
    platform: { sha256, stderr: (chunk) => (out.stderr += chunk) },
  });
  return { ...result, ...out };
};
