//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Ontology from '../Ontology.ts';
import { analyze, declarations, language } from './analyze.ts';

const SOURCE = [
  "import { b } from './b';",
  "export * from './c';",
  'const internal = 1;',
  'export const value = internal;',
  'export function run() {}',
  'export class Thing {}',
  'export type Alias = string;',
  "await import('effect');",
].join('\n');

// Resolves the fixture's relative specifiers the way oxc-resolver would, without touching a disk.
const resolve = (fromFile: string, specifier: string): string | undefined =>
  specifier === './b' ? '/repo/src/b.ts' : specifier === './c' ? '/repo/node_modules/pkg/c.ts' : undefined;

describe('analyze', () => {
  test('language comes from the extension', () => {
    expect(language('src/a.ts')).toEqual('typescript');
    expect(language('README.md')).toEqual('markdown');
    expect(language('a.rs')).toEqual('other');
  });

  const document = analyze({ root: '/repo', path: 'src/a.ts', source: SOURCE, mtime: 42, resolve });

  test('produces the document shape the ontology fixes', () => {
    expect(document['@id']).toEqual(Ontology.fileIri('src/a.ts').value);
    expect(document['@type']).toEqual('File');
    expect(document).toMatchObject({ path: 'src/a.ts', language: 'typescript', mtime: 42 });
    expect(document.hash).toHaveLength(64);
    expect(document.parseError).toBeUndefined();
  });

  test('resolved repository imports are edges, everything else is a module reference', () => {
    expect(document.imports).toEqual([Ontology.fileIri('src/b.ts').value]);
    // `./c` resolves into node_modules, so it is not an indexed file.
    expect(document.importsModule).toEqual(['./c', 'effect']);
  });

  test('declarations carry kind, export status and line', () => {
    expect(document.declares).toEqual([
      expect.objectContaining({ name: 'internal', kind: 'variable', exported: false, line: 3 }),
      expect.objectContaining({ name: 'value', kind: 'variable', exported: true, line: 4 }),
      expect.objectContaining({ name: 'run', kind: 'function', exported: true, line: 5 }),
      expect.objectContaining({ name: 'Thing', kind: 'class', exported: true, line: 6 }),
      expect.objectContaining({ name: 'Alias', kind: 'type', exported: true, line: 7 }),
    ]);
    expect(document.declares[0]['@id']).toEqual(Ontology.symbolIri('src/a.ts', 'internal').value);
  });

  test('an anonymous default export is named default', () => {
    const anonymous = analyze({ root: '/repo', path: 'src/d.ts', source: 'export default 42;\n', mtime: 1, resolve });
    expect(anonymous.declares).toEqual([expect.objectContaining({ name: 'default', exported: true })]);
  });

  test('a parse failure still yields a file node', () => {
    const broken = analyze({ root: '/repo', path: 'src/e.ts', source: 'const = ;\n', mtime: 1, resolve });
    expect(broken.parseError?.length).toBeGreaterThan(0);
    expect(broken.path).toEqual('src/e.ts');
  });

  test('declarations ignores statements that declare nothing', () => {
    expect(declarations([])).toEqual([]);
  });
});
