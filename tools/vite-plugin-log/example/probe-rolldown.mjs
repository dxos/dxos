//
// Copyright 2026 DXOS.org
//
//
// Pure Rolldown probe (no Vite). Demonstrates that Rolldown's `transform` hook
// natively exposes `meta.ast` and `meta.magicString` as non-enumerable lazy
// getters — i.e. they do not appear in `Object.keys(meta)`, but are reachable
// via `meta.ast` / `meta.magicString` and via `Object.getOwnPropertyNames(meta)`.
//
// Run:
//   node probe-rolldown.mjs
//

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rolldown } from 'rolldown';

const tmpFile = path.join(os.tmpdir(), `dxos-rolldown-probe-${process.pid}.ts`);
fs.writeFileSync(tmpFile, 'export const answer: number = 42;\nconsole.log(answer);\n');

try {
  const bundle = await rolldown({
    input: tmpFile,
    plugins: [
      {
        name: 'probe',
        transform(_code, id, meta) {
          if (!id.endsWith('.ts')) return null;
          const astDesc = Object.getOwnPropertyDescriptor(meta, 'ast');
          const msDesc = Object.getOwnPropertyDescriptor(meta, 'magicString');
          console.log(`id=${id}`);
          console.log(`  Object.keys(meta)=${JSON.stringify(Object.keys(meta))}`);
          console.log(`  Object.getOwnPropertyNames(meta)=${JSON.stringify(Object.getOwnPropertyNames(meta))}`);
          console.log(
            `  ast: { hasGetter: ${typeof astDesc?.get === 'function'}, enumerable: ${!!astDesc?.enumerable}, resolvedType: ${meta.ast?.constructor?.name ?? typeof meta.ast} }`,
          );
          console.log(
            `  magicString: { hasGetter: ${typeof msDesc?.get === 'function'}, enumerable: ${!!msDesc?.enumerable}, resolvedType: ${meta.magicString?.constructor?.name ?? typeof meta.magicString} }`,
          );
          return null;
        },
      },
    ],
  });
  await bundle.write({ dir: path.join(os.tmpdir(), 'dxos-rolldown-probe-out') });
} finally {
  fs.rmSync(tmpFile, { force: true });
  fs.rmSync(path.join(os.tmpdir(), 'dxos-rolldown-probe-out'), { recursive: true, force: true });
}
