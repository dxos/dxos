//
// Copyright 2026 DXOS.org
//

import type { Term } from '@rdfjs/types';
import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Ontology from './Ontology.ts';
import * as Reasoner from './Reasoner.ts';
import * as Store from './Store.ts';
import { analyze } from './worker/analyze.ts';
import { createResolver } from './worker/analyzers/resolver.ts';
import { analyzeTypeScript } from './worker/analyzers/typescript.ts';

/**
 * The rule files as shipped, run against a real store — a paraphrase of a rule in a test proves the
 * paraphrase. `60-canonical.n3` is the one with a property worth guarding: exactly one canonical
 * name per symbol, which its scoped negation is what secures.
 */

const CANONICAL = join(Reasoner.BUNDLED_DIR, '60-canonical.n3');

const symbol = (path: string, name: string, extra: Partial<Ontology.SymbolNode> = {}): Ontology.SymbolNode => ({
  '@id': Ontology.symbolIri(path, name).value,
  '@type': 'Symbol',
  name,
  'kind': 'variable',
  'exported': true,
  'line': 1,
  'extends': [],
  'constructedBy': [],
  'pipedThrough': [],
  'derivedFrom': [],
  'argument': [],
  'apiDependsOn': [],
  'implDependsOn': [],
  'aliasOf': [],
  ...extra,
});

const document = (path: string, declares: readonly Ontology.SymbolNode[]): Ontology.FileDocument => ({
  '@context': Ontology.CONTEXT,
  '@id': Ontology.fileIri(path).value,
  '@type': 'File',
  path,
  'language': 'typescript',
  'size': 1,
  'mtime': 1,
  'hash': `hash-${path}`,
  'inPackage': Ontology.packageIri('@dxos/test').value,
  'imports': [],
  'importsType': [],
  'importsModule': [],
  'reexports': [],
  declares,
});

describe('bundled rules', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-rules-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const canonicalNames = async (documents: readonly Ontology.FileDocument[]): Promise<string[]> =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const each of documents) {
          yield* store.putDocument(each);
        }
        const [reasoner] = yield* Reasoner.loadFile(CANONICAL);
        const derived = yield* store.reason(reasoner.name, reasoner.rules);
        return derived
          .filter((quad) => quad.predicate.value === Ontology.canonicalName.value)
          .map((quad) => `${quad.subject.value} = ${quad.object.value}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(dir, `store-${documents.length}-${Math.random()}`))), Effect.scoped),
    );

  test('an identifier imported directly is its own canonical name', async () => {
    const names = await canonicalNames([document('src/plain.ts', [symbol('src/plain.ts', 'helper')])]);
    expect(names).toEqual([`${Ontology.symbolIri('src/plain.ts', 'helper').value} = helper`]);
  });

  test('a namespaced module qualifies its identifiers, and only that', async () => {
    const names = await canonicalNames([
      document('src/Ontology.ts', [symbol('src/Ontology.ts', 'symbolIri'), symbol('src/Ontology.ts', 'fileIri')]),
      document('src/index.ts', [
        symbol('src/index.ts', 'Ontology', {
          kind: 'namespace',
          namespaceOf: [Ontology.fileIri('src/Ontology.ts').value],
        }),
      ]),
    ]);

    // The qualified form, and no bare `symbolIri` beside it: two canonical names would leave every
    // consumer to guess which one an importer actually writes.
    expect(names).toEqual([
      `${Ontology.symbolIri('src/Ontology.ts', 'fileIri').value} = Ontology.fileIri`,
      `${Ontology.symbolIri('src/Ontology.ts', 'symbolIri').value} = Ontology.symbolIri`,
      // The namespace is imported by name from the barrel, so it is its own canonical name.
      `${Ontology.symbolIri('src/index.ts', 'Ontology').value} = Ontology`,
    ]);
  });

  test('an unexported declaration has no canonical name', async () => {
    // Nothing outside can name it, so there is no external name to state.
    const names = await canonicalNames([
      document('src/private.ts', [symbol('src/private.ts', 'internal', { exported: false })]),
    ]);
    expect(names).toEqual([]);
  });
});

describe('type rules', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-types-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('a layer provides and requires what its inferred type says', async () => {
    // The real analyzer over the agreement fixture, whose types are checked against `tsc`.
    const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
    const path = 'src/worker/types/fixtures/effect.ts';
    const document = analyzeTypeScript({
      root,
      path,
      source: await readFile(join(root, path), 'utf8'),
      mtime: 1,
      resolve: createResolver(root),
      packageOf: () => '@dxos/code-index',
    });
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        yield* store.putDocument(document);
        const [reasoner] = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, '15-types.n3'));
        const derived = yield* store.reason(reasoner.name, reasoner.rules);
        const local = (iri: string) => iri.slice(iri.lastIndexOf('#') + 1);
        return derived
          .filter((quad) => quad.predicate.value !== Ontology.type.value)
          .map((quad) => `${local(quad.subject.value)} ${local(quad.predicate.value)} ${local(quad.object.value)}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(dir, 'store'))), Effect.scoped),
    );
    expect(facts).toEqual([
      'clockLayer providesService Clock',
      'loggerLayer providesService Logger',
      'merged layerRequires Clock',
      'merged providesService Logger',
      'merged providesService Store',
      'mergedTwo layerRequires Clock',
      'mergedTwo providesService Clock',
      'mergedTwo providesService Store',
      // `Layer.provide` discharged the requirement: nothing left to require.
      'provided providesService Store',
      'providedDirect providesService Store',
      'storeLayer layerRequires Clock',
      'storeLayer providesService Store',
    ]);
  });
});

describe('ordered reasoners', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-strata-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  // The earlier file negates a predicate the later file concludes. Run twice: on the second pass the
  // later file's graph from the first pass exists, and must stay invisible to the earlier file.
  const earlier: Reasoner.Reasoner = {
    name: '10-earlier',
    rules: `@prefix log: <http://www.w3.org/2000/10/swap/log#>.
@prefix list: <http://www.w3.org/2000/10/swap/list#>.
{ ?s <urn:p> ?o. (?x { ?s <urn:q> ?x } ?l) log:collectAllIn ?scope. ?l list:length 0 } => { ?s <urn:r> ?o }.`,
  };
  const later: Reasoner.Reasoner = { name: '20-later', rules: '{ ?s <urn:p> ?o } => { ?s <urn:q> ?o }.' };

  test('a reasoner never sees the conclusions of reasoners ordered after it', async () => {
    const concluded = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        yield* store.putQuads([
          DataFactory.quad(
            DataFactory.namedNode('urn:s'),
            DataFactory.namedNode('urn:p'),
            DataFactory.namedNode('urn:o'),
            DataFactory.namedNode('urn:graph'),
          ),
        ]);
        yield* Reasoner.run([earlier, later]);
        yield* Reasoner.run([earlier, later]);
        return (yield* store.derived(earlier.name)).map((quad) => quad.predicate.value);
      }).pipe(Effect.provide(Store.layer(join(dir, 'store'))), Effect.scoped),
    );
    expect(concluded).toEqual(['urn:r']);
  });
});

/**
 * `65-packages`, `70-specs` and `80-gaps` over a small repository run through the real analyzers, so
 * the facts the rules join on are the ones the parsers actually emit.
 */
describe('spec and package rules', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-specs-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const PLUGIN = 'packages/plugin-x';
  const FILES: Record<string, string> = {
    [`${PLUGIN}/package.json`]: JSON.stringify({
      name: '@dxos/plugin-x',
      exports: { '.': { source: './src/index.ts' } },
      dependencies: { '@dxos/echo': 'workspace:*', '@dxos/unused': 'workspace:*' },
    }),
    [`${PLUGIN}/moon.yml`]: 'layer: library\n',
    [`${PLUGIN}/src/index.ts`]: `export * from './ops.ts';\nexport * as X from './types.ts';\n`,
    [`${PLUGIN}/src/ops.ts`]: `import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export const Create = Operation.make({ meta: { key: DXN.make('org.dxos.operation.x.create') } });

export const Orphan = Operation.make({ meta: { key: DXN.make('org.dxos.operation.x.orphan') } });

export const helper = 1;
`,
    [`${PLUGIN}/src/types.ts`]: `import { Type } from '@dxos/echo';
import { App } from '@dxos/app';
import * as Schema from 'effect/Schema';

export const Document = Schema.Struct({ name: Schema.String }).pipe(Type.Obj({ typename: 'x', version: '1' }));

export const view = (app: App) => app;
`,
    'packages/echo/package.json': JSON.stringify({
      name: '@dxos/echo',
      exports: { '.': { source: './src/index.ts' } },
    }),
    'packages/echo/src/index.ts': 'export const Type = {};\n',
    'packages/app/package.json': JSON.stringify({ name: '@dxos/app' }),
    'packages/app/moon.yml': 'layer: application\n',
    'packages/app/src/index.ts': 'export type App = {};\n',
    'packages/unused/package.json': JSON.stringify({ name: '@dxos/unused' }),
    'packages/e2e/composer-e2e/package.json': JSON.stringify({ name: '@dxos/composer-e2e' }),
    'packages/e2e/composer-e2e/src/playwright/basic.spec.ts': 'export const run = 1;\n',
    [`${PLUGIN}/PLUGIN.mdl`]: `---
id: org.dxos.plugin.x
name: XPlugin
version: 0.1.0
---

## Extensions

| Term   | URI                     |
|--------|-------------------------|
| \`op\`   | \`org.dxos.mdl.op@1.1\`   |
| \`type\` | \`org.dxos.mdl.type@1.0\` |

\`\`\`mdl
op create
  key: org.dxos.operation.x.create
  desc: Creates an \`X.Document\`.
  bogus: not in the schema

op ghost
  key: org.dxos.operation.x.ghost
\`\`\`

\`\`\`mdl
type Document
  fields:
    name: string

type Phantom
  desc: Nothing declares this.
\`\`\`

\`\`\`mdl
feat F-1: Create
  req F-1.1: Creating works.
\`\`\`

\`\`\`mdl
scenario T-1: Create
  then: a document exists
  tags: [F-1.1]
\`\`\`

\`\`\`mdl
test QA-1: Create
  covers: [F-1]
  automated:
    - composer-e2e:basic.spec.ts#Basic › create
  steps:
    - do: create
\`\`\`

\`\`\`mdl
suite smoke: The quick one
  tests: [QA-1]
\`\`\`

\`\`\`mdl
rule ops-only: Operations live in ops files
  files:
    - src/ops.ts
\`\`\`

\`\`\`mdl
ext op
  uri: org.dxos.mdl.op@1.1
  fields:
    key?: NSID
    desc?: Prose
\`\`\`
`,
    'packages/spec/SCHEMAS.mdl': `\`\`\`mdl
ext type
  uri: org.dxos.mdl.type@1.0
  fields:
    fields: FieldMap
    desc?: Prose
\`\`\`
`,
  };

  const PACKAGES: Record<string, string> = {
    [PLUGIN]: '@dxos/plugin-x',
    'packages/echo': '@dxos/echo',
    'packages/app': '@dxos/app',
    'packages/unused': '@dxos/unused',
    'packages/e2e/composer-e2e': '@dxos/composer-e2e',
  };
  const RESOLVED: Record<string, string> = {
    '@dxos/echo': 'packages/echo/src/index.ts',
    '@dxos/app': 'packages/app/src/index.ts',
    './ops.ts': `${PLUGIN}/src/ops.ts`,
    './types.ts': `${PLUGIN}/src/types.ts`,
  };

  const derive = async (): Promise<string[]> =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const [path, source] of Object.entries(FILES)) {
          yield* store.putDocument(
            analyze({
              root: '/repo',
              path,
              source,
              mtime: 1,
              resolve: (_from, specifier) => (RESOLVED[specifier] ? `/repo/${RESOLVED[specifier]}` : undefined),
              packageOf: (candidate) =>
                Object.entries(PACKAGES).find(([prefix]) => candidate.startsWith(`${prefix}/`))?.[1],
            }),
          );
        }
        yield* Reasoner.run(yield* Reasoner.load(Reasoner.BUNDLED_DIR));
        const local = (term: Term) =>
          term.termType === 'Literal'
            ? term.datatype.value.endsWith('#boolean')
              ? term.value
              : JSON.stringify(term.value)
            : term.value.startsWith(Ontology.GLOB_BASE)
              ? `glob:${term.value.slice(Ontology.GLOB_BASE.length)}`
              : term.value.startsWith(Ontology.PACKAGE_BASE)
                ? term.value.slice(Ontology.PACKAGE_BASE.length)
                : term.value.startsWith(Ontology.PREFIX)
                  ? term.value.slice(Ontology.PREFIX.length)
                  : term.value.slice(Math.max(term.value.lastIndexOf('#'), term.value.lastIndexOf('/')) + 1);
        const facts: string[] = [];
        for (const name of ['65-packages', '70-specs', '80-gaps']) {
          for (const quad of yield* store.derived(name)) {
            facts.push(`${local(quad.subject)} ${local(quad.predicate)} ${local(quad.object)}`);
          }
        }
        return [...new Set(facts)].sort();
      }).pipe(Effect.provide(Store.layer(join(dir, `store-${Math.random()}`))), Effect.scoped),
    );

  test('specs link to code and to each other, and the gaps are found', async () => {
    const facts = await derive();
    const having = (predicate: string) => facts.filter((fact) => fact.split(' ')[1] === predicate);

    expect(having('operationKey')).toEqual([
      'Create operationKey "org.dxos.operation.x.create"',
      'Orphan operationKey "org.dxos.operation.x.orphan"',
    ]);
    expect(having('specifies')).toEqual(['op:create specifies Create', 'type:Document specifies Document']);
    // The mention `X.Document` is the canonical name of `Document`, published as a namespace.
    expect(having('describes')).toEqual(expect.arrayContaining(['op:create describes Document']));
    expect(having('covers')).toEqual(['scenario:T-1 covers req:F-1.1', 'test:QA-1 covers feat:F-1']);
    expect(having('includesTest')).toEqual(['suite:smoke includesTest test:QA-1']);
    expect(having('automatedBy')).toEqual(['test:QA-1 automatedBy basic.spec.ts']);
    expect(having('matchesGlob')).toEqual([`ops.ts matchesGlob glob:${PLUGIN}/src/ops.ts`]);

    expect(having('phantom')).toEqual(['op:ghost phantom true', 'type:Phantom phantom true']);
    expect(having('unspecified')).toEqual(['Orphan unspecified true']);
    expect(having('undocumented')).toEqual([
      'Orphan undocumented true',
      'helper undocumented true',
      'view undocumented true',
    ]);
    expect(having('unknownField')).toEqual(['op:create unknownField "bogus"']);
    expect(having('missingField')).toEqual(['type:Phantom missingField "fields"']);

    expect(having('usesPackage')).toEqual([
      '@dxos/plugin-x usesPackage @dxos/app',
      '@dxos/plugin-x usesPackage @dxos/echo',
    ]);
    expect(having('usesPackageInApi')).toEqual(['@dxos/plugin-x usesPackageInApi @dxos/app']);
    expect(having('undeclaredDependency')).toEqual(['@dxos/plugin-x undeclaredDependency @dxos/app']);
    expect(having('unusedDependency')).toEqual(['@dxos/plugin-x unusedDependency @dxos/unused']);
    expect(having('violatesLayering')).toEqual(['@dxos/plugin-x violatesLayering @dxos/app']);
  });
});
