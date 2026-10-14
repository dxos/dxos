//
// Copyright 2026 DXOS.org
//

// Runs DEUS images in a browser: answers every IO request from an in-memory file system, so the
// toolchain seed is a complete `deus` CLI with no server. Pure ES module, no Node or DOM APIs.

import { createKernel, run } from './kernel.mjs';

/** A file system held in a `Map` from absolute path to text; directories exist implicitly. */
export const createFiles = (entries = {}) => {
  const files = new Map(Object.entries(entries));
  const dirs = new Set(['/']);
  const normalize = (path) => {
    const parts = [];
    for (const part of path.split('/')) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '' && part !== '.') {
        parts.push(part);
      }
    }
    return '/' + parts.join('/');
  };
  const addParents = (path) => {
    for (let index = path.lastIndexOf('/'); index > 0; index = path.lastIndexOf('/', index - 1)) {
      dirs.add(path.slice(0, index));
    }
  };
  for (const path of files.keys()) {
    addParents(path);
  }
  return {
    normalize,
    files,
    read: (path) => files.get(normalize(path)),
    write: (path, text) => {
      const full = normalize(path);
      addParents(full);
      files.set(full, text);
    },
    exists: (path) => files.has(normalize(path)) || dirs.has(normalize(path)),
    isDir: (path) => dirs.has(normalize(path)),
    mkdirp: (path) => {
      const full = normalize(path);
      addParents(full + '/x');
    },
    remove: (path) => {
      const full = normalize(path);
      files.delete(full);
      for (const key of [...files.keys()]) {
        if (key.startsWith(full + '/')) {
          files.delete(key);
        }
      }
      for (const key of [...dirs]) {
        if (key === full || key.startsWith(full + '/')) {
          dirs.delete(key);
        }
      }
    },
    list: (path) => {
      const prefix = normalize(path) === '/' ? '/' : normalize(path) + '/';
      const names = new Set();
      for (const key of [...files.keys(), ...dirs]) {
        if (key.startsWith(prefix) && key.length > prefix.length) {
          names.add(key.slice(prefix.length).split('/')[0]);
        }
      }
      return [...names].sort();
    },
  };
};

const some = (value) => ({ $: '#Option', tag: 1, fields: [value] });
const none = { $: '#Option', tag: 0, fields: [] };

/**
 * Answers `#IO` against `fs`. `args`, `env`, `cwd` and `stdin` configure the process; output is
 * collected in `out.stdout` and `out.stderr`.
 */
export const ioHandler = ({ fs, args = [], env = {}, cwd = '/', stdin = '', out }) => {
  const started = performance.now();
  const resolve = (path) => fs.normalize(path.startsWith('/') ? path : cwd + '/' + path);
  return (op, opArgs) => {
    const [first, second] = opArgs;
    switch (op) {
      case 0:
        out.stdout += first;
        return null;
      case 1:
        out.stderr += first;
        return null;
      case 2: {
        const text = fs.read(resolve(first));
        return text === undefined ? none : some(text);
      }
      case 3:
        fs.write(resolve(first), second);
        return null;
      case 4:
        return fs.exists(resolve(first));
      case 5:
        return fs.list(resolve(first));
      case 6:
        fs.mkdirp(resolve(first));
        return null;
      case 7:
        fs.remove(resolve(first));
        return null;
      case 8:
        return args;
      case 9:
        throw new ExitRequest(first);
      case 10:
        return Math.floor(performance.now() - started);
      case 11:
        return stdin;
      case 12:
        fs.write(resolve(first), String.fromCharCode(...second));
        return null;
      case 13:
        return first in env ? some(env[first]) : none;
      case 14:
        return fs.isDir(resolve(first));
      case 15:
        return String(BigInt(Date.now()) * 1_000_000n);
      case 16:
        fs.write(resolve(first), (fs.read(resolve(first)) ?? '') + second);
        return null;
      case 17:
        return {
          $: '#Pair',
          tag: 0,
          fields: [127, { $: '#Pair', tag: 0, fields: ['', 'exec: no processes in the browser\n'] }],
        };
      default:
        throw new Error(`IO operation ${op} is not supported in the browser`);
    }
  };
};

class ExitRequest extends Error {
  constructor(code) {
    super(`exit ${code}`);
    this.code = code;
  }
}

/** Exit codes as the CLI's (CLI-JSON.md): 0, the `IO.exit` code, 70 for a defect, 71 for a panic. */
const exitCode = (result) =>
  result.state === 'done' ? 0 : result.state === 'defect' ? 70 : result.state === 'exit' ? result.code : 71;

/**
 * A DEUS runtime in the page. `wasm` is the kernel module or its bytes; `fs` the file system
 * every run shares. `abilities` answers user abilities by IRI: `{ [iri]: (op, args) => answer }`.
 */
export const createDeus = async ({ wasm, fs = createFiles(), env = {}, abilities = {} }) => {
  const kernel = await createKernel(wasm);
  const runImage = async (image, { entry, argument, args = [], cwd = '/', stdin = '' } = {}) => {
    const out = { stdout: '', stderr: '' };
    const io = ioHandler({ fs, args, env, cwd, stdin, out });
    try {
      const result = await run(kernel, image, {
        entry,
        argument,
        handle: async (ability, op, opArgs) => {
          if (ability === 'urn:deus:builtin:IO') {
            return io(op, opArgs);
          }
          const handler = abilities[ability];
          if (!handler) {
            throw new Error(`no handler for ${ability} op ${op}`);
          }
          return handler(op, opArgs);
        },
      });
      if (result.state === 'defect') {
        out.stderr += `defect: ${result.message}\n`;
      }
      if (result.state === 'panic') {
        out.stderr += `panic: ${result.message}\n`;
      }
      return { ...out, code: exitCode(result), result };
    } catch (error) {
      if (error instanceof ExitRequest) {
        return { ...out, code: error.code, result: { state: 'exit', code: error.code } };
      }
      throw error;
    }
  };
  return { fs, kernel, run: runImage };
};
