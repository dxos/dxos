#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Tier 2 of the Effect 3 -> 4 migration: service keys.
//
//   v3  class Foo extends Context.Tag('Name')<Foo, Shape>() {}
//   v4  class Foo extends Context.Service<Foo, Shape>()('Name') {}
//
// The identifier moves from the first call to the second, so this is a reorder rather than a
// rename. Both the single-line and the wrapped forms are handled; anything that does not match
// the shape exactly is left alone and shows up as a compile error.
//
//   node tools/codemods/effect-4-context.mjs [--dry] [path...]
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const files = execFileSync(
  'grep',
  ['-rl', 'Context.Tag(', '--include=*.ts', '--include=*.tsx', ...(paths.length ? paths : ['packages', 'tools'])],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter(Boolean);

// `[\s\S]` rather than `.` so a declaration wrapped across lines still matches; the type argument
// list is matched non-greedily up to the `>()` that closes the v3 call.
const PATTERN = /Context\.Tag\(\s*([^)]*?)\s*\)<([\s\S]*?)>\(\)/g;

let changedFiles = 0;
let rewrites = 0;
for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  const source = before.replace(PATTERN, (_match, identifier, typeArgs) => {
    rewrites += 1;
    return `Context.Service<${typeArgs}>()(${identifier})`;
  });
  if (source !== before) {
    changedFiles += 1;
    if (!dry) {
      writeFileSync(file, source);
    }
  }
}

console.log(`${dry ? '[dry] ' : ''}${changedFiles} files, ${rewrites} rewrites`);
