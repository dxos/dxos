//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Ontology from '../../Ontology.ts';
import { declarations, envFromDocuments } from './Bind.ts';

type SymbolSpec = {
  readonly name: string;
  readonly kind?: string;
  readonly aliasOf?: string;
  readonly namespaceOf?: string;
};

type FileSpec = {
  readonly symbols?: readonly SymbolSpec[];
  readonly reexports?: readonly string[];
  readonly modules?: Readonly<Record<string, string>>;
};

const document = (path: string, spec: FileSpec): Ontology.FileDocument => ({
  '@context': Ontology.CONTEXT,
  '@id': Ontology.fileIri(path).value,
  '@type': 'File',
  path,
  'language': 'typescript',
  'size': 1,
  'mtime': 1,
  'hash': `hash-${path}`,
  'imports': [],
  'importsType': [],
  'importsModule': [],
  'reexports': (spec.reexports ?? []).map((target) => Ontology.fileIri(target).value),
  'declares': (spec.symbols ?? []).map((symbol) => ({
    '@id': Ontology.symbolIri(path, symbol.name).value,
    '@type': 'Symbol',
    'name': symbol.name,
    'kind': symbol.kind ?? 'variable',
    'exported': true,
    'line': 1,
    'extends': [],
    'constructedBy': [],
    'pipedThrough': [],
    'derivedFrom': [],
    'argument': [],
    'apiDependsOn': [],
    'implDependsOn': [],
    'aliasOf': symbol.aliasOf === undefined ? [] : [symbol.aliasOf],
    ...(symbol.namespaceOf === undefined ? {} : { namespaceOf: [Ontology.fileIri(symbol.namespaceOf).value] }),
  })),
  '@included': Object.entries(spec.modules ?? {}).map(([specifier, file]) => ({
    '@id': Ontology.moduleIri(specifier).value,
    '@type': 'Module' as const,
    'moduleFile': Ontology.fileIri(file).value,
  })),
});

const resolver = (files: Readonly<Record<string, FileSpec>>) =>
  declarations(envFromDocuments(Object.entries(files).map(([path, spec]) => document(path, spec))));

const at = (path: string, name: string) => Ontology.symbolIri(path, name).value;

describe('declarations', () => {
  test('a three-deep export * chain reaches the declaration', ({ expect }) => {
    const { declarationOf } = resolver({
      'index.ts': { reexports: ['a/index.ts'] },
      'a/index.ts': { reexports: ['a/b/index.ts'] },
      'a/b/index.ts': { reexports: ['a/b/impl.ts'] },
      'a/b/impl.ts': { symbols: [{ name: 'proxy' }] },
    });
    expect(declarationOf(at('index.ts', 'proxy'))).toBe(at('a/b/impl.ts', 'proxy'));
    expect(declarationOf(at('index.ts', 'missing'))).toBeUndefined();
  });

  test('an alias of an alias reaches the declaration', ({ expect }) => {
    const { declarationOf } = resolver({
      'index.ts': { symbols: [{ name: 'layer', kind: 'reexport', aliasOf: at('services/index.ts', 'layer') }] },
      'services/index.ts': {
        symbols: [{ name: 'layer', kind: 'reexport', aliasOf: at('services/source.ts', 'sourceLayer') }],
      },
      'services/source.ts': { symbols: [{ name: 'sourceLayer' }] },
    });
    expect(declarationOf(at('index.ts', 'layer'))).toBe(at('services/source.ts', 'sourceLayer'));
  });

  test('a namespace member resolves through export * as N, by file and by module', ({ expect }) => {
    const { declarationOf } = resolver({
      'index.ts': {
        symbols: [{ name: 'Order', kind: 'namespace', namespaceOf: 'Order.ts' }],
        modules: { '@test/echo': 'index.ts' },
      },
      'Order.ts': { symbols: [{ name: 'natural' }] },
    });
    expect(declarationOf(at('index.ts', 'Order.natural'))).toBe(at('Order.ts', 'natural'));
    expect(declarationOf(Ontology.memberIri('@test/echo', 'Order.natural').value)).toBe(at('Order.ts', 'natural'));
    // The namespace itself is no declaration.
    expect(declarationOf(at('index.ts', 'Order'))).toBeUndefined();
  });

  test('a local declaration shadows a star export', ({ expect }) => {
    const { declarationOf } = resolver({
      'index.ts': { symbols: [{ name: 'shared' }], reexports: ['other.ts'] },
      'other.ts': { symbols: [{ name: 'shared' }, { name: 'only' }] },
    });
    expect(declarationOf(at('index.ts', 'shared'))).toBe(at('index.ts', 'shared'));
    expect(declarationOf(at('index.ts', 'only'))).toBe(at('other.ts', 'only'));
  });

  test('a bare specifier resolves through moduleFile', ({ expect }) => {
    const { declarationOf } = resolver({
      'consumer.ts': { modules: { '@test/svc': 'svc/index.ts' } },
      'svc/index.ts': { reexports: ['svc/store.ts'] },
      'svc/store.ts': { symbols: [{ name: 'Store', kind: 'class' }] },
    });
    expect(declarationOf(Ontology.memberIri('@test/svc', 'Store').value)).toBe(at('svc/store.ts', 'Store'));
    expect(declarationOf(Ontology.memberIri('effect/Layer', 'effect').value)).toBeUndefined();
  });

  test('a module mapped to two files is ambiguous and skipped', ({ expect }) => {
    const { declarationOf } = resolver({
      'a/consumer.ts': { modules: { '#capabilities': 'a/capabilities.ts' } },
      'b/consumer.ts': { modules: { '#capabilities': 'b/capabilities.ts' } },
      'a/capabilities.ts': { symbols: [{ name: 'Cap' }] },
      'b/capabilities.ts': { symbols: [{ name: 'Cap' }] },
    });
    expect(declarationOf(Ontology.memberIri('#capabilities', 'Cap').value)).toBeUndefined();
    expect(declarationOf(at('a/capabilities.ts', 'Cap'))).toBe(at('a/capabilities.ts', 'Cap'));
  });

  test('an export * cycle terminates', ({ expect }) => {
    const { declarationOf } = resolver({
      'a.ts': { reexports: ['b.ts'] },
      'b.ts': { reexports: ['a.ts', 'c.ts'] },
      'c.ts': { symbols: [{ name: 'found' }] },
    });
    expect(declarationOf(at('a.ts', 'missing'))).toBeUndefined();
    expect(declarationOf(at('a.ts', 'found'))).toBe(at('c.ts', 'found'));
  });

  test('a member of a declared value resolves to the value', ({ expect }) => {
    const { declarationOf } = resolver({
      'index.ts': { reexports: ['foo.ts'] },
      'foo.ts': { symbols: [{ name: 'Foo' }] },
    });
    expect(declarationOf(at('index.ts', 'Foo.bar'))).toBe(at('foo.ts', 'Foo'));
  });
});

describe('envFromDocuments', () => {
  test('a module mapped to one file twice is not ambiguous', ({ expect }) => {
    const env = envFromDocuments([
      document('a.ts', { modules: { '@test/x': 'x.ts' } }),
      document('b.ts', { modules: { '@test/x': 'x.ts' } }),
    ]);
    expect(env.moduleFile(Ontology.moduleIri('@test/x').value)).toBe(Ontology.fileIri('x.ts').value);
  });
});
