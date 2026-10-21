//
// Copyright 2026 DXOS.org
//

// Runs the wasm32-wasip1 kernel under Node's WASI: `node wasi/run.mjs <kernel.wasm> [args…]`.
import { readFileSync } from 'node:fs';
import { setFlagsFromString } from 'node:v8';
import { WASI } from 'node:wasi';

// Node 22's WASI crashes when a collection runs inside a fast API call (`path_*` allocate).
setFlagsFromString('--no-turbo-fast-api-calls');

const [path, ...args] = process.argv.slice(2);
const wasi = new WASI({
  version: 'preview1',
  args: ['deus-kernel', ...args],
  // The whole file system; the kernel resolves relative paths against $PWD itself.
  env: { ...process.env, PWD: process.cwd() },
  preopens: { '/': '/' },
  returnOnExit: true,
});
const { instance } = await WebAssembly.instantiate(readFileSync(path), wasi.getImportObject());
process.exitCode = wasi.start(instance);
