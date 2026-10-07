#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Rewrites the emitter-shaped `Stream.async` (removed in Effect 4) to `EffectEx.streamFromEmitter`,
// which keeps the same registration shape on top of v4's queue-shaped `Stream.callback`.
//
//   node tools/codemods/effect-4-stream-async.mjs [--dry] [path...]
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

/** Namespace aliases the repo binds `effect/Stream` to. */
const NAMESPACES = ['Stream', 'EffectStream'];

const files = execFileSync(
  'grep',
  [
    '-rlE',
    `(${NAMESPACES.join('|')})\\.async[<(]`,
    '--include=*.ts',
    '--include=*.tsx',
    ...(paths.length ? paths : ['packages']),
  ],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.includes('/dist/'));

/** Inserts `import { EffectEx } from '@dxos/effect';` if the file does not already import it. */
const ensureImport = (source) => {
  if (/\bEffectEx\b/.test(source.replace(/EffectEx\.streamFromEmitter/g, ''))) {
    return source;
  }
  const dxos = source.match(/^import .* from '@dxos\/[^']*';$/m);
  if (dxos) {
    return source.replace(dxos[0], `import { EffectEx } from '@dxos/effect';\n${dxos[0]}`);
  }
  const last = [...source.matchAll(/^import .*;$/gm)].at(-1);
  return last
    ? source.slice(0, last.index + last[0].length) +
        `\n\nimport { EffectEx } from '@dxos/effect';` +
        source.slice(last.index + last[0].length)
    : source;
};

let changedFiles = 0;
let rewrites = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  let source = before;

  for (const namespace of NAMESPACES) {
    source = source.replace(new RegExp(`\\b${namespace}\\.async([<(])`, 'g'), (_match, delimiter) => {
      rewrites += 1;
      return `EffectEx.streamFromEmitter${delimiter}`;
    });
  }

  if (source !== before) {
    source = ensureImport(source);
    changedFiles += 1;
    if (!dry) {
      writeFileSync(file, source);
    }
  }
}

console.log(`${dry ? '[dry] ' : ''}${changedFiles} files; ${rewrites} Stream.async call sites rewritten`);
