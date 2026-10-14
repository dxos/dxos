//
// Copyright 2026 DXOS.org
//

// Stage0 driver: `node src/stage0/build.ts <out> <main> <files…>`.

import { readFileSync, writeFileSync } from 'node:fs';

import { compileImage } from './compile.ts';

const [out, main, ...files] = process.argv.slice(2);
const image = compileImage(
  files.map((path) => ({ path, text: readFileSync(path, 'utf8') })),
  main,
);
writeFileSync(out, image);
