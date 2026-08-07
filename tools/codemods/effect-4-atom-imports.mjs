#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Fixes the named imports the Tier 1 module rewrite left behind.
//
// `@effect-atom/atom` and `@effect-atom/atom-react` both re-exported `Atom`, `Registry` and
// `Result`. Their v4 successors do not: `@effect/atom-react` carries only the React bindings, and
// the core barrel names the modules `AtomRegistry` / `AsyncResult`. So the specifiers have to move
// between the two imports and pick up aliases -- which the module-path rewrite could not know.
//
//   node tools/codemods/effect-4-atom-imports.mjs [--dry] [path...]
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CORE = 'effect/unstable/reactivity';
const REACT = '@effect/atom-react';

/** Renamed in the core barrel; aliased back so call sites keep their local binding. */
const ALIASES = { Registry: 'AtomRegistry', Result: 'AsyncResult' };

/** Lives in the core barrel, never in the React package. */
const CORE_ONLY = new Set(['Atom', 'Registry', 'Result', 'AtomRef', 'AtomRpc', 'AtomHttpApi']);

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const parseSpecifiers = (text) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

/** `type Registry` / `Registry as Foo` -> the bare imported name. */
const importedName = (specifier) =>
  specifier
    .replace(/^type\s+/, '')
    .split(/\s+as\s+/)[0]
    .trim();

const withAlias = (specifier) => {
  const name = importedName(specifier);
  const alias = ALIASES[name];
  if (!alias || /\s+as\s+/.test(specifier)) {
    return specifier;
  }
  return specifier.startsWith('type ') ? `type ${alias} as ${name}` : `${alias} as ${name}`;
};

const files = execFileSync(
  'grep',
  ['-rlE', `from '(${CORE}|${REACT})'`, '--include=*.ts', '--include=*.tsx', ...(paths.length ? paths : ['packages'])],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter(Boolean);

let changedFiles = 0;
let aliased = 0;
let moved = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  let source = before;

  // Alias the renamed modules in the core barrel import.
  source = source.replace(new RegExp(`import \\{([^}]*)\\} from '${CORE}';`, 'g'), (_match, body) => {
    const specifiers = parseSpecifiers(body).map((specifier) => {
      const next = withAlias(specifier);
      if (next !== specifier) {
        aliased += 1;
      }
      return next;
    });
    return `import { ${specifiers.join(', ')} } from '${CORE}';`;
  });

  // Split core-only specifiers out of the React import.
  source = source.replace(new RegExp(`import \\{([^}]*)\\} from '${REACT}';`, 'g'), (match, body) => {
    const specifiers = parseSpecifiers(body);
    const core = specifiers.filter((specifier) => CORE_ONLY.has(importedName(specifier))).map(withAlias);
    const react = specifiers.filter((specifier) => !CORE_ONLY.has(importedName(specifier)));
    if (core.length === 0) {
      return match;
    }
    moved += core.length;
    const coreImport = `import { ${core.join(', ')} } from '${CORE}';`;
    return react.length === 0 ? coreImport : `${coreImport}\nimport { ${react.join(', ')} } from '${REACT}';`;
  });

  if (source !== before) {
    changedFiles += 1;
    if (!dry) {
      writeFileSync(file, source);
    }
  }
}

console.log(`${dry ? '[dry] ' : ''}${changedFiles} files; ${aliased} aliased, ${moved} moved to the core barrel`);
