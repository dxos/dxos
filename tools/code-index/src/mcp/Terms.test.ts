//
// Copyright 2026 DXOS.org
//

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import * as Terms from './Terms.ts';

const PACKAGE = fileURLToPath(new URL('../../', import.meta.url));

/** Every `deus:` local name in a text; N3 comment lines are dropped, since an example there is not a use. */
const deusNames = (text: string): Set<string> =>
  new Set(
    text
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
      .flatMap((line) => [...line.matchAll(/deus:([A-Za-z_][\w]*)/g)].map((match) => match[1])),
  );

describe('Terms', () => {
  test('every term the rules and the indexer use is described', async () => {
    const rules = await readdir(`${PACKAGE}rules`);
    const used = new Set<string>();
    for (const file of rules.filter((name) => name.endsWith('.n3'))) {
      for (const name of deusNames(await readFile(`${PACKAGE}rules/${file}`, 'utf8'))) {
        used.add(name);
      }
    }
    const ontology = await readFile(`${PACKAGE}src/Ontology.ts`, 'utf8');
    for (const match of ontology.matchAll(/iri\('([A-Za-z_]\w*)'\)/g)) {
      used.add(match[1]);
    }
    expect([...used].filter((name) => Terms.TERMS[name] === undefined).sort()).toEqual([]);
  });

  test('every described term is documented in design/ONTOLOGY.md', async () => {
    const doc = await readFile(`${PACKAGE}design/ONTOLOGY.md`, 'utf8');
    const documented = deusNames(doc);
    // Positional predicates are documented as a range, `deus:typeArg0` … `typeArg7`.
    const missing = Object.keys(Terms.TERMS).filter(
      (name) => !documented.has(name) && !documented.has(name.replace(/\d+$/, '0')),
    );
    expect(missing.sort()).toEqual([]);
  });

  test('closest ranks a case-only difference first and ignores distant names', () => {
    expect(Terms.closest('operationkey', ['operationKey', 'operationInput', 'imports'])).toEqual(['operationKey']);
    expect(Terms.closest('importz', ['imports', 'importsType', 'path'])).toEqual(['imports']);
    expect(Terms.closest('zzzzzz', ['imports', 'path'])).toEqual([]);
  });
});
