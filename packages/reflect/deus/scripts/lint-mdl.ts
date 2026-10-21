//
// Copyright 2026 DXOS.org
//

// Lints .mdl files with the checks the editor runs.
// Usage: node packages/reflect/deus/scripts/lint-mdl.ts [--only <source>] <file.mdl>...
// `--only mdl/decision` keeps one check; the block-type check still knows only the built-in types.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { lintMdl } from '../src/extension/check.ts';

const {
  values: { only },
  positionals: files,
} = parseArgs({ options: { only: { type: 'string' } }, allowPositionals: true });
if (files.length === 0) {
  console.error('usage: lint-mdl.ts [--only <source>] <file.mdl>...');
  process.exit(2);
}

let errors = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const { from, severity, source, message } of lintMdl(text)) {
    if (only && source !== only) {
      continue;
    }
    const line = text.slice(0, from).split('\n').length;
    console.log(`${file}:${line}: ${severity} [${source}]: ${message}`);
    if (severity === 'error') {
      errors++;
    }
  }
}

process.exit(errors > 0 ? 1 : 0);
