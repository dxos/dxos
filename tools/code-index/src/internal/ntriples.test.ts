//
// Copyright 2026 DXOS.org
//

import type { Quad } from '@rdfjs/types';
import { DataFactory, Parser } from 'n3';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import * as Ontology from '../Ontology.ts';
import { analyze, createResolver } from '../worker/analyze.ts';
import { documentTriples } from './ntriples.ts';
import { parseJsonLd } from './quadstore.ts';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const PACKAGE = fileURLToPath(new URL('../../', import.meta.url));

const key = (quad: Quad): string =>
  [quad.subject, quad.predicate, quad.object]
    .map((term) => `${term.termType}:${term.value}:${'datatype' in term ? term.datatype.value : ''}`)
    .join(' ');

const sorted = (quads: readonly Quad[]): string[] => [...new Set(quads.map(key))].sort();

const files = async (dir: string): Promise<string[]> =>
  (await readdir(dir, { withFileTypes: true, recursive: true }))
    .filter((entry) => entry.isFile() && !entry.parentPath.includes('node_modules'))
    .map((entry) => join(entry.parentPath, entry.name));

describe('documentTriples', () => {
  const resolve = createResolver(ROOT);

  const sameAsJsonLd = async (document: Ontology.FileDocument) => {
    const expected = sorted(await parseJsonLd(document, DataFactory.defaultGraph()));
    const actual = sorted(new Parser({ format: 'N-Triples' }).parse(documentTriples(document)));
    expect(actual, document.path).toEqual(expected);
  };

  test('every document of this package encodes to the triples a JSON-LD parser reads', async () => {
    const paths = (await files(PACKAGE)).filter((path) => /\.(tsx?|json|ya?ml|mdl|md|n3)$/.test(path));
    expect(paths.length).toBeGreaterThan(50);
    for (const absolute of paths) {
      const path = relative(ROOT, absolute);
      const source = await readFile(absolute, 'utf8');
      const mtime = Math.floor((await stat(absolute)).mtimeMs);
      await sameAsJsonLd(analyze({ root: ROOT, path, source, mtime, resolve, packageOf: () => '@dxos/code-index' }));
    }
  }, 120_000);

  test('literals that need escaping, numbers and booleans', async () => {
    const path = 'src/[id]/odd "name".ts';
    await sameAsJsonLd({
      '@context': Ontology.CONTEXT,
      '@id': Ontology.fileIri(path).value,
      '@type': 'File',
      path,
      'language': 'typescript',
      'size': 1.5,
      'mtime': 1_700_000_000_000,
      'hash': 'quote " backslash \\ newline \n return \r tab \t unicode é 𝄞',
      'imports': [],
      'importsType': [],
      'importsModule': [],
      'reexports': [],
      'declares': [
        {
          '@id': Ontology.symbolIri(path, 'x').value,
          '@type': 'Symbol',
          'name': 'x',
          'kind': 'variable',
          'exported': false,
          'line': 0,
          'extends': [],
          'constructedBy': [],
          'pipedThrough': [],
          'derivedFrom': [],
          'argument': [],
          'apiDependsOn': [],
          'implDependsOn': [],
          'aliasOf': [],
          'deprecated': true,
        },
      ],
    });
  });
});
