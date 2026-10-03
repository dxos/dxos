//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Ontology from '../../Ontology.ts';
import { type AnalyzeContext } from './common.ts';
import { analyzeMoonYml, analyzePackageJson } from './package.ts';

const base = (path: string, source: string): AnalyzeContext => ({
  root: '/repo',
  path,
  source,
  mtime: 1,
  resolve: () => undefined,
  packageOf: (candidate) => (candidate.startsWith('packages/echo/') ? '@dxos/echo' : undefined),
});

describe('package analyzers', () => {
  test('package.json asserts the Package node with entries and workspace deps', () => {
    const document = analyzePackageJson(
      base(
        'packages/echo/package.json',
        JSON.stringify({
          name: '@dxos/echo',
          version: '0.11.1',
          private: true,
          exports: {
            '.': { source: './src/index.ts', types: './dist/types/src/index.d.ts', import: './dist/lib/index.mjs' },
            './testing': { types: './dist/types/src/testing.d.ts' },
          },
          dependencies: { '@dxos/keys': 'workspace:*', 'effect': 'catalog:' },
          devDependencies: { '@dxos/effect': 'workspace:*' },
          peerDependencies: { '@dxos/log': 'workspace:^' },
        }),
      ),
    );
    expect(document.inPackage).toEqual(Ontology.packageIri('@dxos/echo').value);
    expect(document.describesPackage).toEqual({
      '@id': Ontology.packageIri('@dxos/echo').value,
      '@type': 'Package',
      'name': '@dxos/echo',
      'version': '0.11.1',
      'private': true,
      'packagePath': 'packages/echo',
      'entry': [
        Ontology.fileIri('packages/echo/src/index.ts').value,
        Ontology.fileIri('packages/echo/dist/types/src/testing.d.ts').value,
      ],
      'declaresDep': [Ontology.packageIri('@dxos/keys').value],
      'declaresDevDep': [Ontology.packageIri('@dxos/effect').value],
      'declaresPeerDep': [Ontology.packageIri('@dxos/log').value],
    });
  });

  test('a manifest without a name is just a file', () => {
    const document = analyzePackageJson(base('fixtures/package.json', '{ "private": true }'));
    expect(document.describesPackage).toBeUndefined();
    expect(document.language).toEqual('json');
  });

  test('a broken manifest reports a parse error', () => {
    const document = analyzePackageJson(base('packages/echo/package.json', '{ nope'));
    expect(document.parseError?.length).toEqual(1);
  });

  test('moon.yml contributes the layer to the sibling package', () => {
    const document = analyzeMoonYml(base('packages/echo/moon.yml', 'layer: library\nlanguage: typescript\n'));
    expect(document.language).toEqual('yaml');
    expect(document.describesPackage).toEqual({
      '@id': Ontology.packageIri('@dxos/echo').value,
      '@type': 'Package',
      'layer': 'library',
    });
  });

  test('moon.yml outside a package asserts nothing about packages', () => {
    const document = analyzeMoonYml(base('tools/moon.yml', 'layer: tool\n'));
    expect(document.describesPackage).toBeUndefined();
  });
});
