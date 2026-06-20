#!/usr/bin/env node

import { readFileSync } from 'fs';
import { globby } from 'globby';

const files = await globby(['{packages,vendor}/**/package.json'], {
  ignore: ['**/node_modules/**', '**/__fixtures__/**'],
});

const errors = [];

for (const file of files) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }

  if (!pkg.name || pkg.private) {
    continue;
  }

  const access = pkg.publishConfig?.access;
  if (access !== 'public') {
    errors.push(`  ${pkg.name} (${file}): publishConfig.access is '${access ?? '(not set)'}'`);
  }
}

if (errors.length > 0) {
  console.error('ERROR: The following publishable packages are missing publishConfig.access = "public".');
  console.error('Add "publishConfig": { "access": "public" } to their package.json.');
  console.error('');
  for (const error of errors.sort()) {
    console.error(error);
  }
  process.exit(1);
}

console.log(`OK: all ${files.length} publishable packages have publishConfig.access = "public".`);
