#!/usr/bin/env node

import { readFileSync } from 'fs';
import { globby } from 'globby';

const files = await globby(['{packages,tools,vendor}/**/package.json', 'docs/package.json'], {
  ignore: ['**/node_modules/**', '**/__fixtures__/**', '**/dist/**', '**/build/**', '**/out/**'],
});

const packagesByName = new Map();

for (const file of files) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }

  if (!pkg.name) {
    continue;
  }

  packagesByName.set(pkg.name, { file, private: !!pkg.private });
}

const errors = [];

for (const [name, { file, private: isPrivate }] of packagesByName) {
  if (isPrivate) {
    continue;
  }

  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const dependencyFields = ['dependencies', 'peerDependencies', 'optionalDependencies'];

  for (const field of dependencyFields) {
    for (const dependencyName of Object.keys(pkg[field] ?? {})) {
      const dependency = packagesByName.get(dependencyName);
      if (dependency?.private) {
        errors.push(`  ${name} (${file}): depends on private package '${dependencyName}' via ${field}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('ERROR: The following publishable packages depend on private packages.');
  console.error('Either publish the dependency or remove it from the public package.');
  console.error('');
  for (const error of errors.sort()) {
    console.error(error);
  }
  process.exit(1);
}

console.log(`OK: no public packages depend on private packages (checked ${packagesByName.size} packages).`);
