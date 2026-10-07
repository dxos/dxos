#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Ports `Context.Tag` / `Context.GenericTag` to Effect 4's `Context.Service`.
//
// Not a rename: v4 flipped the argument order of the class form, so
// `Tag('id')<Self, Shape>()` becomes `Service<Self, Shape>()('id')`, and folded `GenericTag` into
// the same name's function overload. The two type helpers moved with it -- `Tag.Service<T>` reads
// the service shape, which v4 spells `Service.Shape<T>` because `Service` is now the constructor.
//
// Gated on the file binding the namespace to `effect/Context`, under whatever alias.
//
//   node tools/codemods/effect-4-context-service.mjs [--dry] [path...]
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const files = execFileSync(
  'grep',
  [
    '-rlE',
    '\\.(Tag|GenericTag)\\b',
    '--include=*.ts',
    '--include=*.tsx',
    ...(paths.length ? paths : ['packages', 'tools']),
  ],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

const counts = {};
const bump = (key) => (counts[key] = (counts[key] ?? 0) + 1);
let changedFiles = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  const binding = /^import \* as ([A-Za-z_$][\w$]*) from 'effect\/Context';$/m.exec(before);
  if (!binding) {
    continue;
  }
  const namespace = binding[1];
  let source = before;

  // Type helpers. `Tag.Service` is the shape, and `Service` is taken by the constructor in v4.
  source = source.replace(
    new RegExp(`(?<![\\w$.])${namespace}\\.Tag\\.Service\\b`, 'g'),
    () => (bump('Tag.Service -> Service.Shape'), `${namespace}.Service.Shape`),
  );
  source = source.replace(
    new RegExp(`(?<![\\w$.])${namespace}\\.Tag\\.Identifier\\b`, 'g'),
    () => (bump('Tag.Identifier -> Service.Identifier'), `${namespace}.Service.Identifier`),
  );

  // Class form: the id moved after the type arguments.
  source = source.replace(
    new RegExp(`(?<![\\w$.])${namespace}\\.Tag\\((\`[^\`]*\`|'[^']*'|"[^"]*")\\)(<[^;{]*?>)\\(\\)`, 'g'),
    (_match, id, typeArgs) => (
      bump('Tag(id)<...>() -> Service<...>()(id)'),
      `${namespace}.Service${typeArgs}()(${id})`
    ),
  );

  // Function form.
  source = source.replace(
    new RegExp(`(?<![\\w$.])${namespace}\\.GenericTag\\b`, 'g'),
    () => (bump('GenericTag -> Service'), `${namespace}.Service`),
  );

  if (source !== before) {
    changedFiles += 1;
    if (!dry) {
      writeFileSync(file, source);
    }
  }
}

const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
console.log(`${dry ? '[dry] ' : ''}${total} rewrites across ${changedFiles} files`);
for (const [key, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${key}`);
}
