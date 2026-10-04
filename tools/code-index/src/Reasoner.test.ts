//
// Copyright 2026 DXOS.org
//

import type { Quad, Term } from '@rdfjs/types';
import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Ontology from './Ontology.ts';
import * as Reasoner from './Reasoner.ts';
import * as ReferenceResolution from './ReferenceResolution.ts';
import * as Store from './Store.ts';
import * as TypeBinding from './TypeBinding.ts';
import { analyze } from './worker/analyze.ts';
import { createResolver } from './worker/analyzers/resolver.ts';
import { analyzeTypeScript } from './worker/analyzers/typescript.ts';

/**
 * The rule files as shipped, run against a real store — a paraphrase of a rule in a test proves the
 * paraphrase. `60-canonical.n3` is the one with a property worth guarding: a canonical name is
 * stated only where it differs from the declared one.
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

  test('an identifier imported directly is not restated', async () => {
    // Its canonical name is its `deus:name`; a query reads `COALESCE(?canonical, ?name)`.
    const names = await canonicalNames([document('src/plain.ts', [symbol('src/plain.ts', 'helper')])]);
    expect(names).toEqual([]);
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
    ]);
  });

  test('an unexported declaration has no canonical name', async () => {
    // Nothing outside can name it, so there is no external name to state.
    const names = await canonicalNames([
      document('src/private.ts', [symbol('src/private.ts', 'internal', { exported: false })]),
    ]);
    expect(names).toEqual([]);
  });

  test('a non-test file importing a test file is flagged, and a test importing a test is not', async () => {
    const testScript = (path: string, imports: string[]): Ontology.FileDocument => ({
      ...document(path, []),
      testFile: true,
      imports: imports.map((each) => Ontology.fileIri(each).value),
    });
    const derived = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        yield* store.putDocument(testScript('src/a.test.ts', ['src/b.test.ts']));
        yield* store.putDocument(testScript('src/b.test.ts', []));
        yield* store.putDocument({
          ...document('src/lib.ts', []),
          imports: [Ontology.fileIri('src/b.test.ts').value],
        });
        const [reasoner] = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, '50-example.n3'));
        return yield* store.reason(reasoner.name, reasoner.rules);
      }).pipe(Effect.provide(Store.layer(join(dir, `store-example-${Math.random()}`))), Effect.scoped),
    );
    expect(derived.map((quad) => `${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`)).toEqual([
      `${Ontology.fileIri('src/lib.ts').value} ${Ontology.importsTestFile.value} ${Ontology.fileIri('src/b.test.ts').value}`,
    ]);
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
      'discarded layerRequires Clock',
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
      'providedMerge providesService Clock',
      'providedMerge providesService Store',
      'providedMergeDirect providesService Clock',
      'providedMergeDirect providesService Store',
      'storeLayer layerRequires Clock',
      'storeLayer providesService Store',
    ]);
  });

  test('both backends conclude the same once restated premises are set aside', async () => {
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
    const { backend, restated, concluded } = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        yield* store.putDocument(document);
        const effect = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, '10-effect.n3'));
        const types = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, '15-types.n3'));
        yield* Reasoner.run([...effect, ...types]);
        const local = (iri: string) => iri.slice(iri.lastIndexOf('#') + 1);
        const key = (quad: Quad) =>
          `${local(quad.subject.value)} ${local(quad.predicate.value)} ${local(quad.object.value)}`;
        // `15-types` sees the file graph and `10-effect`'s graph; a head matching either restates a premise.
        const files = (yield* store.match()).filter((quad) => !Ontology.isDerivedGraph(quad.graph.value));
        const premises = new Set([...files, ...(yield* store.derived(effect[0].name))].map(key));
        const derived = (yield* store.derived(types[0].name)).map(key);
        return {
          backend: store.backend,
          restated: derived.filter((fact) => premises.has(fact)),
          concluded: derived.filter((fact) => !premises.has(fact)).sort(),
        };
      }).pipe(Effect.provide(Store.layer(join(dir, 'restated'))), Effect.scoped),
    );
    // EYE's `derivations` output drops a restated premise and the native engine keeps it (NATIVE-BACKEND.md).
    expect(restated).toEqual(backend === 'native' ? expect.arrayContaining(['clockLayer providesService Clock']) : []);
    expect(concluded).toEqual([
      'discarded layerRequires Clock',
      'merged layerRequires Clock',
      'merged providesService Logger',
      'merged providesService Store',
      'mergedTwo layerRequires Clock',
      'mergedTwo providesService Clock',
      'mergedTwo providesService Store',
      'provided providesService Store',
      'providedDirect providesService Store',
      'providedMerge providesService Clock',
      'providedMerge providesService Store',
      'providedMergeDirect providesService Clock',
      'providedMergeDirect providesService Store',
      'storeLayer layerRequires Clock',
    ]);
  });
});

describe('effect rules', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-effect-'));
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  // `effect` is not installed in this root, so its imports stay members under the specifier written;
  // `@test/svc` is a path alias, so it is a bare specifier that resolves inside the root.
  const sources: Record<string, string> = {
    'tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@test/svc': ['./index.ts'] } } }),
    'svc/store.ts': [
      "import * as Context from 'effect/Context';",
      "export class Store extends Context.Service<Store, { readonly n: number }>()('Store') {}",
      "export class Clock extends Context.Service<Clock, { readonly now: number }>()('Clock') {}",
      "export const Verbose = Context.Reference<boolean>('Verbose', { defaultValue: () => false });",
    ].join('\n'),
    'svc/index.ts': "export * from './store';",
    'index.ts': "export * from './svc';",
    'layers.ts': [
      "import * as Effect from 'effect/Effect';",
      "import * as Layer from 'effect/Layer';",
      "import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';",
      "import * as SqlClient from 'effect/sql/SqlClient';",
      "import { Clock, Store } from './index';",
      'export const storeLayer = Layer.succeed(Store, { n: 1 });',
      'export const clockLayer = Layer.succeed(Clock, { now: 0 });',
      'export const provided = storeLayer.pipe(Layer.provide(clockLayer));',
      'export const launched = storeLayer.pipe(Layer.launch);',
      'export const fromEffect = Effect.succeed({ n: 1 }).pipe(Layer.effect(Store));',
      'export const nothing = Layer.empty;',
      'export const sql = Layer.succeed(SqlClient.SqlClient, undefined as never);',
      'export const reading = Layer.effect(Store, Effect.gen(function* () { const clock = yield* Clock; return { n: clock.now }; }));',
      'export const makeLayer = () => Layer.succeed(Store, { n: 1 });',
      'export const makeSql = (): Layer.Layer<SqlClient.SqlClient> => Layer.succeed(SqlClient.SqlClient, undefined as never);',
      'export const fromFactory = makeSql().pipe(Layer.provideMerge(clockLayer));',
      "export const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.provideMerge(clockLayer));",
      'export class Db {',
      '  static layer(): Layer.Layer<Store, never, SqlClient.SqlClient> { throw new Error(); }',
      '}',
    ].join('\n'),
    'reexport.ts': "export { makeSql } from './layers';",
    'aliased.ts': [
      "import * as Layer from 'effect/Layer';",
      "import { makeSql } from './reexport';",
      'export const viaAlias = makeSql().pipe(Layer.orDie);',
    ].join('\n'),
    'consumer.ts': [
      "import * as Layer from 'effect/Layer';",
      "import { Clock, Store } from '@test/svc';",
      'export declare const needs: Layer.Layer<Store, never, Clock>;',
    ].join('\n'),
  };

  test('layers, the keys they provide and read, through barrels and bare specifiers', async () => {
    for (const [path, source] of Object.entries(sources)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), source);
    }
    const resolve = createResolver(root);
    const documents = Object.keys(sources)
      .filter((path) => path.endsWith('.ts'))
      .map((path) =>
        analyzeTypeScript({ root, path, source: sources[path], mtime: 1, resolve, packageOf: () => '@test/svc' }),
      );
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const each of documents) {
          yield* store.putDocument(each);
        }
        // The pass that resolves every reference and alias, which the rule files read.
        yield* Reasoner.run(
          (yield* Reasoner.load(Reasoner.BUNDLED_DIR)).filter((reasoner) => reasoner.name === ReferenceResolution.NAME),
        );
        const conclusions: string[] = [];
        // In filename order, each seeing the conclusions of the ones before it.
        for (const name of ['10-effect', '15-types', '90-aliases']) {
          const [reasoner] = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, `${name}.n3`));
          const derived = yield* store.reason(reasoner.name, reasoner.rules, { materialize: true });
          const local = (iri: string) =>
            decodeURIComponent(iri.replace(/^https:\/\/dxos\.org\/(deus\/file\/|deus\/module\/|vocab\/deus#)/, ''));
          conclusions.push(
            ...derived
              .filter((quad) => !quad.object.value.endsWith('#Schema') && !quad.object.value.endsWith('#DomainError'))
              .map(
                (quad) =>
                  `${local(quad.subject.value)} ${quad.predicate.equals(Ontology.type) ? 'a' : local(quad.predicate.value)} ${local(quad.object.value)}`,
              ),
          );
        }
        return [...new Set(conclusions)].sort();
      }).pipe(Effect.provide(Store.layer(join(root, '.store'))), Effect.scoped),
    );
    // References resolve in the pass, so the rule files restate none; names below are declarations.
    expect(facts).toEqual([
      // Built by a repo factory through a barrel's alias of it, which the pass resolves.
      'aliased.ts#viaAlias a EffectLayer',
      'aliased.ts#viaAlias providesService effect/sql/SqlClient#SqlClient',
      'consumer.ts#needs a EffectLayer',
      'consumer.ts#needs layerRequires svc/store.ts#Clock',
      'consumer.ts#needs providesService svc/store.ts#Store',
      // A static method returning a layer: a factory, described by the layer it returns.
      'layers.ts#Db.layer a EffectLayerFactory',
      'layers.ts#Db.layer layerRequires effect/sql/SqlClient#SqlClient',
      'layers.ts#Db.layer providesService svc/store.ts#Store',
      // A listed library constructor, through a pipeline that keeps its output.
      'layers.ts#TestLayer a EffectLayer',
      'layers.ts#TestLayer providesService @effect/sql-sqlite-node/SqliteClient#SqliteClient',
      'layers.ts#TestLayer providesService effect/sql/SqlClient#SqlClient',
      'layers.ts#clockLayer a EffectLayer',
      'layers.ts#clockLayer providesService svc/store.ts#Clock',
      'layers.ts#fromEffect a EffectLayer',
      // Built by a repo factory whose own call type is not inferred.
      'layers.ts#fromFactory a EffectLayer',
      'layers.ts#fromFactory providesService effect/sql/SqlClient#SqlClient',
      // A function returning a layer, whatever its type arguments say.
      'layers.ts#makeLayer a EffectLayerFactory',
      'layers.ts#makeSql a EffectLayerFactory',
      'layers.ts#makeSql providesService effect/sql/SqlClient#SqlClient',
      'layers.ts#nothing a EffectLayer',
      // Carried over from the piped layer: the imported key leaves its type unknown here.
      'layers.ts#provided a EffectLayer',
      'layers.ts#provided providesService svc/store.ts#Store',
      'layers.ts#reading a EffectLayer',
      'layers.ts#reading providesService svc/store.ts#Store',
      'layers.ts#reading requiresService svc/store.ts#Clock',
      // A library key, named by its member.
      'layers.ts#sql a EffectLayer',
      'layers.ts#sql providesService effect/sql/SqlClient#SqlClient',
      'layers.ts#storeLayer a EffectLayer',
      'layers.ts#storeLayer providesService svc/store.ts#Store',
      // The alias carries the class (`rules/90-aliases.n3`).
      'reexport.ts#makeSql a EffectLayerFactory',
      'svc/store.ts#Clock a EffectService',
      'svc/store.ts#Store a EffectService',
      'svc/store.ts#Verbose a EffectService',
    ]);
    // `launched` is an `Effect` (a `Layer.launch` stage).
    expect(facts.filter((fact) => /#launched /.test(fact))).toEqual([]);
  });
});

describe('capability rules', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-capabilities-'));
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  // The framework itself is not in this root, so its imports stay members under the specifier written.
  const sources: Record<string, string> = {
    'types.ts': [
      "import * as Capability from '@dxos/app-framework/Capability';",
      "export const State = Capability.makeSingleton<number>()('test.state');",
      "export const Other = Capability.make<string>()('test.other');",
      'export namespace Local {',
      "  export const Thing = Capability.make<boolean>()('test.thing');",
      '}',
    ].join('\n'),
    'barrel.ts': "export * as TestCapabilities from './types';",
    'capabilities.ts': [
      "import * as Capability from '@dxos/app-framework/Capability';",
      "import { TestCapabilities } from './barrel';",
      "import { Local } from './types';",
      "export const otherMaker = Capability.moduleMaker('Other', TestCapabilities.Other);",
      'export const StateModule = Capability.lazyModule(',
      "  'State',",
      '  { requires: [TestCapabilities.Other], provides: [TestCapabilities.State] },',
      "  () => import('./body'),",
      ');',
      "export const OtherModule = otherMaker(() => import('./body'), { provides: [TestCapabilities.State] });",
      "export const thingModule = (load: () => Promise<any>) => Capability.inlineModule('thing', { provides: [Local.Thing] }, load);",
      "export const ThingModule = thingModule(() => import('./body'));",
      'export const viaMaker = (load: () => Promise<any>) => otherMaker(load);',
      "export const ViaMakerModule = viaMaker(() => import('./body'));",
    ].join('\n'),
    'body.ts': [
      "import * as Effect from 'effect/Effect';",
      "import * as Capability from '@dxos/app-framework/Capability';",
      "import { TestCapabilities } from './barrel';",
      "import { Local } from './types';",
      'export default Capability.makeModule(() =>',
      '  Effect.gen(function* () {',
      '    const other = yield* Capability.get(TestCapabilities.Other);',
      '    return [Capability.contribute(TestCapabilities.State, 1), Capability.contribute(Local.Thing, other.length > 0)];',
      '  }),',
      ');',
    ].join('\n'),
  };

  test('a module contributes what it provides or passes to contribute, not what it reads', async () => {
    const resolve = createResolver(root);
    for (const [path, source] of Object.entries(sources)) {
      await writeFile(join(root, path), source);
    }
    const documents = Object.entries(sources).map(([path, source]) =>
      analyzeTypeScript({ root, path, source, mtime: 1, resolve, packageOf: () => '@dxos/test' }),
    );
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const document of documents) {
          yield* store.putDocument(document);
        }
        const [reasoner] = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, '41-capabilities.n3'));
        const derived = yield* store.reason(reasoner.name, reasoner.rules);
        const local = (iri: string) => decodeURIComponent(iri.slice(iri.lastIndexOf('/') + 1));
        return derived
          .map((quad) => `${local(quad.subject.value)} ${local(quad.predicate.value)} ${local(quad.object.value)}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(root, 'store'))), Effect.scoped),
    );
    expect(facts).toEqual([
      'body.ts#default deus#contributesCapability types.ts#Local.Thing',
      'body.ts#default deus#contributesCapability types.ts#State',
      'capabilities.ts#OtherModule deus#contributesCapability types.ts#Other',
      // The maker's own capability, plus the `provides` the call site adds.
      'capabilities.ts#OtherModule deus#contributesCapability types.ts#State',
      // `requires` names `Other` in the same spec; only `provides` is a contribution.
      'capabilities.ts#StateModule deus#contributesCapability types.ts#State',
      'capabilities.ts#ThingModule deus#contributesCapability types.ts#Local.Thing',
      'capabilities.ts#ViaMakerModule deus#contributesCapability types.ts#Other',
      'capabilities.ts#otherMaker deus#buildsModuleFor types.ts#Other',
      'capabilities.ts#thingModule deus#buildsModuleFor types.ts#Local.Thing',
      'capabilities.ts#viaMaker deus#buildsModuleFor types.ts#Other',
      'types.ts#Local.Thing 22-rdf-syntax-ns#type deus#Capability',
      'types.ts#Other 22-rdf-syntax-ns#type deus#Capability',
      'types.ts#State 22-rdf-syntax-ns#type deus#Capability',
    ]);
  });
});

describe('plugin rules', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-plugins-'));
    await mkdir(join(root, 'src', 'capabilities'), { recursive: true });
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  // The layout every plugin package follows: config, meta, a capabilities barrel, the body, the lazy shim.
  const sources: Record<string, string> = {
    'dx.config.ts': [
      "import { Config2 } from '@dxos/app-framework/config';",
      "export default Config2.make({ plugin: { key: 'org.example.plugin.demo', icon: { key: 'ph--x' } } });",
    ].join('\n'),
    'src/meta.ts': [
      "import * as Plugin from '@dxos/app-framework/Plugin';",
      "import config from '../dx.config';",
      'export const meta = Plugin.getMetaFromConfig(config);',
    ].join('\n'),
    'src/capabilities/state.ts': [
      "import * as Capability from '@dxos/app-framework/Capability';",
      "export const State = Capability.lazyModule('State', { provides: [] }, () => import('./body'));",
    ].join('\n'),
    'src/capabilities/body.ts': [
      "import * as Capability from '@dxos/app-framework/Capability';",
      'export default Capability.makeModule(() => []);',
    ].join('\n'),
    'src/capabilities/index.ts': [
      "import * as Capability from '@dxos/app-framework/Capability';",
      "export * from './state';",
      "export const Surface = Capability.lazyModule('Surface', { provides: [] }, () => import('./body'));",
      "export const Unused = Capability.lazyModule('Unused', { provides: [] }, () => import('./body'));",
    ].join('\n'),
    'src/plugin.ts': [
      "import * as Plugin from '@dxos/app-framework/Plugin';",
      "import { State, Surface } from './capabilities';",
      "import { meta } from './meta';",
      'export const DemoPlugin = Plugin.define(meta).pipe(Plugin.addModule(State), Plugin.addModule(Surface), Plugin.make);',
      'export default DemoPlugin;',
    ].join('\n'),
    'src/DemoPlugin.ts': [
      "import * as Plugin from '@dxos/app-framework/Plugin';",
      "import { meta as pluginMeta } from './meta';",
      'export const meta = pluginMeta;',
      "export const make = Plugin.lazy(meta, () => import('./plugin'));",
    ].join('\n'),
  };

  test('a plugin is linked to its meta, id, modules, package and lazy shim', async () => {
    const resolve = createResolver(root);
    for (const [path, source] of Object.entries(sources)) {
      await writeFile(join(root, path), source);
    }
    const documents = Object.entries(sources).map(([path, source]) =>
      analyzeTypeScript({ root, path, source, mtime: 1, resolve, packageOf: () => '@dxos/test' }),
    );
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const document of documents) {
          yield* store.putDocument(document);
        }
        const [reasoner] = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, '40-composer.n3'));
        const derived = yield* store.reason(reasoner.name, reasoner.rules);
        const local = (iri: string) =>
          decodeURIComponent(
            /^https:\/\/dxos\.org\/deus\/(file|module|package)\//.test(iri)
              ? iri.replace(/^https:\/\/dxos\.org\/deus\/(file|module|package)\//, '')
              : iri.slice(iri.lastIndexOf('/') + 1),
          );
        return derived
          .filter((quad) => quad.predicate.value !== Ontology.type.value || quad.object.value.includes('Plugin'))
          .map((quad) => `${local(quad.subject.value)} ${local(quad.predicate.value)} ${local(quad.object.value)}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(root, 'store'))), Effect.scoped),
    );
    expect(facts).toEqual([
      '@dxos/test deus#definesPlugin src/plugin.ts#DemoPlugin',
      'src/DemoPlugin.ts#make 22-rdf-syntax-ns#type deus#LazyPlugin',
      'src/DemoPlugin.ts#make deus#loadsPlugin src/plugin.ts#DemoPlugin',
      'src/DemoPlugin.ts#make deus#pluginId org.example.plugin.demo',
      // The shim names a re-export of the meta; the declaration it re-exports is the meta.
      'src/DemoPlugin.ts#make deus#pluginMeta src/meta.ts#meta',
      'src/capabilities/body.ts#default 22-rdf-syntax-ns#type deus#PluginModule',
      'src/capabilities/index.ts#Surface 22-rdf-syntax-ns#type deus#PluginModule',
      'src/capabilities/index.ts#Unused 22-rdf-syntax-ns#type deus#PluginModule',
      'src/capabilities/state.ts#State 22-rdf-syntax-ns#type deus#PluginModule',
      'src/meta.ts#meta 22-rdf-syntax-ns#type deus#PluginMeta',
      // The plugin's own `key`, not the icon's `key` beside it.
      'src/meta.ts#meta deus#pluginId org.example.plugin.demo',
      'src/plugin.ts#DemoPlugin 22-rdf-syntax-ns#type deus#Plugin',
      // `Unused` is a module the plugin never adds; `State` reaches it through `export * from './state'`.
      'src/plugin.ts#DemoPlugin deus#addsModule src/capabilities/index.ts#Surface',
      'src/plugin.ts#DemoPlugin deus#addsModule src/capabilities/state.ts#State',
      'src/plugin.ts#DemoPlugin deus#pluginId org.example.plugin.demo',
      'src/plugin.ts#DemoPlugin deus#pluginMeta src/meta.ts#meta',
    ]);
  });
});

describe('surface rules', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-surfaces-'));
    await mkdir(join(root, 'src', 'capabilities'), { recursive: true });
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const sources: Record<string, string> = {
    'src/meta.ts': [
      "import * as Plugin from '@dxos/app-framework/Plugin';",
      "export const meta = Plugin.makeMeta({ key: 'org.example.plugin.demo' });",
    ].join('\n'),
    'src/capabilities/react-surface.ts': [
      "import * as Effect from 'effect/Effect';",
      "import * as Capabilities from '@dxos/app-framework/Capabilities';",
      "import * as Capability from '@dxos/app-framework/Capability';",
      "import { Surface } from '@dxos/app-framework/ui';",
      "import { Article, Dialog } from '../components';",
      "const DIALOG = 'dialog';",
      'export default Capability.makeModule(() =>',
      '  Effect.succeed(',
      '    Capability.contribute(Capabilities.ReactSurface, [',
      "      Surface.create({ id: 'article', component: Article }),",
      '      Surface.create({ id: DIALOG, component: Dialog }),',
      '    ]),',
      '  ),',
      ');',
    ].join('\n'),
    'src/capabilities/index.ts': [
      "import * as Capability from '@dxos/app-framework/Capability';",
      "export const ReactSurface = Capability.lazyModule('ReactSurface', { provides: [] }, () => import('./react-surface'));",
    ].join('\n'),
    // Reached by no module the plugin adds, so only the one-plugin-per-package fallback places it.
    'src/capabilities/orphan.ts': [
      "import * as Capability from '@dxos/app-framework/Capability';",
      "import { Surface } from '@dxos/app-framework/ui';",
      "export const Orphan = Capability.makeModule(() => [Surface.create({ id: 'orphan' })]);",
    ].join('\n'),
    'src/plugin.ts': [
      "import * as Plugin from '@dxos/app-framework/Plugin';",
      "import { ReactSurface } from './capabilities';",
      "import { meta } from './meta';",
      'export const DemoPlugin = Plugin.define(meta).pipe(Plugin.addModule(ReactSurface), Plugin.make);',
    ].join('\n'),
    // A story's fixture plugin is not one the package ships, so the fallback still finds one plugin.
    'src/demo.stories.tsx': [
      "import * as Plugin from '@dxos/app-framework/Plugin';",
      "import { Surface } from '@dxos/app-framework/ui';",
      "import { meta } from './meta';",
      "export const Story = () => Surface.create({ id: 'story' });",
      'export const StoryPlugin = Plugin.define(meta).pipe(Plugin.make);',
    ].join('\n'),
  };

  test('a surface carries its id and the plugin that registers its module', async () => {
    const resolve = createResolver(root);
    for (const [path, source] of Object.entries(sources)) {
      await writeFile(join(root, path), source);
    }
    const documents = Object.entries(sources).map(([path, source]) =>
      analyzeTypeScript({ root, path, source, mtime: 1, resolve, packageOf: () => '@dxos/test' }),
    );
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const document of documents) {
          yield* store.putDocument(document);
        }
        const [composer] = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, '40-composer.n3'));
        yield* store.reason(composer.name, composer.rules, { materialize: true });
        const [surfaces] = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, '42-surfaces.n3'));
        const derived = yield* store.reason(surfaces.name, surfaces.rules);
        const local = (iri: string) =>
          decodeURIComponent(
            /^https:\/\/dxos\.org\/deus\/file\//.test(iri)
              ? iri.replace(/^https:\/\/dxos\.org\/deus\/file\//, '')
              : iri.slice(iri.lastIndexOf('#') + 1),
          );
        return derived
          .map((quad) => `${local(quad.subject.value)} ${local(quad.predicate.value)} ${local(quad.object.value)}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(root, 'store'))), Effect.scoped),
    );
    expect(facts).toEqual([
      'src/capabilities/orphan.ts#Orphan/call/Surface.create/0 providedBy src/plugin.ts#DemoPlugin',
      'src/capabilities/orphan.ts#Orphan/call/Surface.create/0 surfaceId orphan',
      'src/capabilities/orphan.ts#Orphan/call/Surface.create/0 type Surface',
      // Reached through the lazy module that loads the file the module is declared in.
      'src/capabilities/react-surface.ts#default/call/Surface.create/0 providedBy src/plugin.ts#DemoPlugin',
      'src/capabilities/react-surface.ts#default/call/Surface.create/0 surfaceId article',
      'src/capabilities/react-surface.ts#default/call/Surface.create/0 type Surface',
      'src/capabilities/react-surface.ts#default/call/Surface.create/1 providedBy src/plugin.ts#DemoPlugin',
      // A same-file string constant.
      'src/capabilities/react-surface.ts#default/call/Surface.create/1 surfaceId dialog',
      'src/capabilities/react-surface.ts#default/call/Surface.create/1 type Surface',
      // A story builds its own fixture plugin, so the package's plugin is not its provider.
      'src/demo.stories.tsx#Story/call/Surface.create/0 surfaceId story',
      'src/demo.stories.tsx#Story/call/Surface.create/0 type Surface',
    ]);
  });
});

describe('compute rules', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-compute-'));
    await mkdir(join(root, 'src', 'types'), { recursive: true });
    await mkdir(join(root, 'src', 'operations'), { recursive: true });
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  // A plugin's layout: definitions published as a namespace through `#types`, a star barrel, one
  // handler module per operation, a lazy handler set, and a skill offering some operations as tools.
  const sources: Record<string, string> = {
    'package.json': JSON.stringify({ name: '@dxos/test', imports: { '#types': './src/types/index.ts' } }),
    'src/types/DemoOperation.ts': [
      "import * as Operation from '@dxos/compute/Operation';",
      "import { Database, DXN } from '@dxos/echo';",
      "import * as Schema from 'effect/Schema';",
      'export const CreateInput = Schema.Struct({ title: Schema.String });',
      'export const Create = Operation.make({',
      "  meta: { key: DXN.make('org.example.operation.create') },",
      '  input: CreateInput,',
      '  output: Schema.Void,',
      '  services: [Database.Service],',
      '});',
      'export const Remove = Operation.make({',
      "  meta: { key: 'org.example.operation.remove' },",
      '  input: Schema.Struct({ id: Schema.String }),',
      '  output: Schema.Void,',
      '});',
    ].join('\n'),
    'src/types/index.ts': "export * as DemoOperation from './DemoOperation';",
    'src/operations/definitions.ts': [
      "import * as Operation from '@dxos/compute/Operation';",
      "import * as Schema from 'effect/Schema';",
      "export const Ping = Operation.make({ meta: { key: 'org.example.operation.ping' }, input: Schema.Void, output: Schema.Void });",
    ].join('\n'),
    'src/operations/create.ts': [
      "import * as Effect from 'effect/Effect';",
      "import * as Operation from '@dxos/compute/Operation';",
      "import { DemoOperation } from '#types';",
      'const handler = DemoOperation.Create.pipe(Operation.withHandler(() => Effect.void));',
      'export default handler;',
    ].join('\n'),
    'src/operations/ping.ts': [
      "import * as Effect from 'effect/Effect';",
      "import * as Operation from '@dxos/compute/Operation';",
      "import { Ping } from './definitions';",
      'export default Operation.withHandler(Ping, () => Effect.void);',
    ].join('\n'),
    'src/operations/index.ts': [
      "import * as Operation from '@dxos/compute/Operation';",
      "import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';",
      "import { DemoOperation } from '#types';",
      "import { Ping } from './definitions';",
      "export * from './definitions';",
      'export const DemoHandlers = OperationHandlerSet.lazy([',
      "  DemoOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),",
      "  Ping.pipe(Operation.lazyHandler(() => import('./ping'))),",
      ']);',
    ].join('\n'),
    'src/skill.ts': [
      "import * as Operation from '@dxos/compute/Operation';",
      "import * as Skill from '@dxos/compute/Skill';",
      "import { DemoOperation } from '#types';",
      "import { Ping } from './operations';",
      'const operations = [DemoOperation.Create];',
      'const make = () =>',
      '  Skill.make({',
      "    key: 'org.example.skill.demo',",
      '    tools: Skill.toolDefinitions({ operations: [...operations, Ping] }),',
      '    hooks: [Operation.serialize(DemoOperation.Remove)],',
      '  });',
      "export const skill: Skill.Definition = { key: 'org.example.skill.demo', make };",
    ].join('\n'),
  };

  test('operations are linked to their keys, schemas, handlers, handler sets and skills', async () => {
    for (const [path, source] of Object.entries(sources)) {
      await writeFile(join(root, path), source);
    }
    const resolve = createResolver(root);
    const documents = Object.entries(sources)
      .filter(([path]) => path.endsWith('.ts'))
      .map(([path, source]) =>
        analyzeTypeScript({ root, path, source, mtime: 1, resolve, packageOf: () => '@dxos/test' }),
      );
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const document of documents) {
          yield* store.putDocument(document);
        }
        const [reasoner] = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, '30-compute.n3'));
        const derived = yield* store.reason(reasoner.name, reasoner.rules);
        const local = (iri: string) =>
          decodeURIComponent(
            /^https:\/\/dxos\.org\/deus\/(file|module|package)\//.test(iri)
              ? iri.replace(/^https:\/\/dxos\.org\/deus\/(file|module|package)\//, '')
              : iri.slice(iri.lastIndexOf('/') + 1),
          );
        // The published relations; `denotes` and the like are the joins that reach them.
        const shown = new Set(
          [
            Ontology.type,
            Ontology.implementsOperation,
            Ontology.bundlesHandler,
            Ontology.handlesOperation,
            Ontology.exposesOperation,
            Ontology.operationKey,
            Ontology.operationInput,
            Ontology.operationOutput,
            Ontology.operationRequires,
          ].map((term) => term.value),
        );
        return derived
          .filter((quad) => shown.has(quad.predicate.value))
          .map((quad) => `${local(quad.subject.value)} ${local(quad.predicate.value)} ${local(quad.object.value)}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(root, 'store'))), Effect.scoped),
    );
    expect(facts).toEqual([
      // `export default handler` is the same handler under the name a lazy loader imports.
      'src/operations/create.ts#default 22-rdf-syntax-ns#type deus#OperationHandler',
      'src/operations/create.ts#default deus#implementsOperation src/types/DemoOperation.ts#Create',
      // `DemoOperation.Create` lands on the namespace; the member IRI beside it names `Create`.
      'src/operations/create.ts#handler 22-rdf-syntax-ns#type deus#OperationHandler',
      'src/operations/create.ts#handler deus#implementsOperation src/types/DemoOperation.ts#Create',
      'src/operations/definitions.ts#Ping 22-rdf-syntax-ns#type deus#Operation',
      'src/operations/definitions.ts#Ping deus#operationInput effect/Schema#Void',
      'src/operations/definitions.ts#Ping deus#operationKey org.example.operation.ping',
      'src/operations/definitions.ts#Ping deus#operationOutput effect/Schema#Void',
      'src/operations/index.ts#DemoHandlers 22-rdf-syntax-ns#type deus#OperationHandlerSet',
      'src/operations/index.ts#DemoHandlers deus#bundlesHandler src/operations/create.ts#default',
      'src/operations/index.ts#DemoHandlers deus#bundlesHandler src/operations/ping.ts#default',
      'src/operations/index.ts#DemoHandlers deus#handlesOperation src/operations/definitions.ts#Ping',
      'src/operations/index.ts#DemoHandlers deus#handlesOperation src/types/DemoOperation.ts#Create',
      // Data-first `Operation.withHandler(Ping, fn)`.
      'src/operations/ping.ts#default 22-rdf-syntax-ns#type deus#OperationHandler',
      'src/operations/ping.ts#default deus#implementsOperation src/operations/definitions.ts#Ping',
      // A `Skill.Definition`; `Ping` reaches it through `export * from './definitions'`, `Create` through
      // the spread list, and `Remove` — bound as a hook, not offered as a tool — not at all.
      'src/skill.ts#skill 22-rdf-syntax-ns#type deus#Skill',
      'src/skill.ts#skill deus#exposesOperation src/operations/definitions.ts#Ping',
      'src/skill.ts#skill deus#exposesOperation src/types/DemoOperation.ts#Create',
      'src/types/DemoOperation.ts#Create 22-rdf-syntax-ns#type deus#Operation',
      'src/types/DemoOperation.ts#Create deus#operationInput src/types/DemoOperation.ts#CreateInput',
      'src/types/DemoOperation.ts#Create deus#operationKey org.example.operation.create',
      'src/types/DemoOperation.ts#Create deus#operationOutput effect/Schema#Void',
      'src/types/DemoOperation.ts#Create deus#operationRequires @dxos/echo#Database.Service',
      'src/types/DemoOperation.ts#Remove 22-rdf-syntax-ns#type deus#Operation',
      'src/types/DemoOperation.ts#Remove deus#operationKey org.example.operation.remove',
      // An inline `Schema.Struct({ … })` input is a call, not a name.
      'src/types/DemoOperation.ts#Remove deus#operationOutput effect/Schema#Void',
    ]);
  });
});

describe('echo rules', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-echo-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const header = ["import * as Schema from 'effect/Schema';", "import { DXN, Ref, Type } from '@dxos/echo';"];
  const sources: Record<string, string> = {
    'app/src/Org.ts': [
      ...header,
      "export class Org extends Type.makeObject<Org>(DXN.make('com.example.org', '0.1.0'))(Schema.Struct({})) {}",
    ].join('\n'),
    // A barrel re-exporting an imported namespace: no symbol sits at `index.ts#Org`.
    'app/src/index.ts': ["import * as Org from './Org.ts';", 'export { Org };'].join('\n'),
    'app/src/Person.ts': [
      ...header,
      "import { Org } from './index.ts';",
      "import { Team } from '@example/teams';",
      'export const PersonSchema = Schema.Struct({ org: Ref.Ref(Org.Org), team: Ref.Ref(Team.Team) });',
      "export class Person extends Type.makeObject<Person>(DXN.make('com.example.person', '0.2.0'))(PersonSchema) {}",
      "export const WorksAt = Type.makeRelation(DXN.make('com.example.worksAt', '0.1.0'))({ source: Person, target: Org.Org })(",
      '  Schema.Struct({}),',
      ');',
      "export const Legacy = Schema.Struct({}).pipe(Type.makeObject(DXN.make('com.example.legacy', '0.1.0')));",
      // Two literal DXNs: which one is the type's identity is ambiguous, so neither is concluded.
      "export class Twice extends Type.makeObject<Twice>(DXN.make('com.example.a', '0.1.0'))(",
      "  Schema.Struct({ other: Schema.Literal(DXN.make('com.example.b', '0.1.0').toString()) }),",
      ') {}',
    ].join('\n'),
    'teams/src/Team.ts': [
      ...header,
      "export class Team extends Type.makeObject<Team>(DXN.make('com.example.team', '0.1.0'))(Schema.Struct({})) {}",
    ].join('\n'),
    'teams/src/index.ts': ["import * as Team from './Team.ts';", 'export { Team };'].join('\n'),
  };
  const resolved: Record<string, string> = {
    './Org.ts': '/repo/app/src/Org.ts',
    './index.ts': '/repo/app/src/index.ts',
    './Team.ts': '/repo/teams/src/Team.ts',
    '@example/teams': '/repo/teams/src/index.ts',
    '@dxos/echo': '/repo/node_modules/@dxos/echo/index.js',
  };
  const packageOf = (path: string) => (path.startsWith('teams/') ? '@example/teams' : '@example/app');

  test('ECHO types carry their identity, schema, references and endpoints', async () => {
    const documents: Ontology.FileDocument[] = [
      ...Object.entries(sources).map(([path, source]) =>
        analyzeTypeScript({
          root: '/repo',
          path,
          source,
          mtime: 1,
          resolve: (_from, specifier) => resolved[specifier],
          packageOf,
        }),
      ),
      ...['app', 'teams'].map((name) => ({
        ...document(`${name}/package.json`, []),
        describesPackage: {
          '@id': Ontology.packageIri(packageOf(`${name}/`)).value,
          '@type': 'Package' as const,
          'name': packageOf(`${name}/`),
        },
      })),
    ];
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const each of documents) {
          yield* store.putDocument(each);
        }
        // `deus:Schema` is the effect rules' conclusion; the echo rules read it.
        for (const name of ['10-effect.n3', '20-echo.n3']) {
          const [reasoner] = yield* Reasoner.loadFile(join(Reasoner.BUNDLED_DIR, name));
          yield* store.reason(reasoner.name, reasoner.rules, { materialize: true });
        }
        const local = (iri: string) =>
          decodeURIComponent(
            /^https:\/\/dxos\.org\/deus\/(file|module|package)\//.test(iri)
              ? iri.replace(/^https:\/\/dxos\.org\/deus\/(file|module|package)\//, '')
              : iri.slice(iri.lastIndexOf('/') + 1),
          );
        return (yield* store.derived('20-echo'))
          .map((quad) => `${local(quad.subject.value)} ${local(quad.predicate.value)} ${local(quad.object.value)}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(dir, 'store'))), Effect.scoped),
    );
    expect(facts).toEqual([
      'app/src/Org.ts#Org 22-rdf-syntax-ns#type deus#EchoType',
      'app/src/Org.ts#Org deus#echoTypename com.example.org',
      'app/src/Org.ts#Org deus#echoVersion 0.1.0',
      'app/src/Person.ts#Legacy 22-rdf-syntax-ns#type deus#EchoType',
      'app/src/Person.ts#Legacy deus#echoTypename com.example.legacy',
      'app/src/Person.ts#Legacy deus#echoVersion 0.1.0',
      'app/src/Person.ts#Person 22-rdf-syntax-ns#type deus#EchoType',
      // Through the relative barrel, and through the other package's barrel by member path.
      'app/src/Person.ts#Person deus#echoReferences app/src/Org.ts#Org',
      'app/src/Person.ts#Person deus#echoReferences teams/src/Team.ts#Team',
      'app/src/Person.ts#Person deus#echoSchema app/src/Person.ts#PersonSchema',
      'app/src/Person.ts#Person deus#echoTypename com.example.person',
      'app/src/Person.ts#Person deus#echoVersion 0.2.0',
      'app/src/Person.ts#Twice 22-rdf-syntax-ns#type deus#EchoType',
      'app/src/Person.ts#WorksAt 22-rdf-syntax-ns#type deus#EchoRelation',
      'app/src/Person.ts#WorksAt deus#echoTypename com.example.worksAt',
      'app/src/Person.ts#WorksAt deus#echoVersion 0.1.0',
      'app/src/Person.ts#WorksAt deus#relationSource app/src/Person.ts#Person',
      'app/src/Person.ts#WorksAt deus#relationTarget app/src/Org.ts#Org',
      'teams/src/Team.ts#Team 22-rdf-syntax-ns#type deus#EchoType',
      'teams/src/Team.ts#Team deus#echoTypename com.example.team',
      'teams/src/Team.ts#Team deus#echoVersion 0.1.0',
    ]);
  });
});

describe('cross-file type binding', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-bind-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("a call into another file is bound to the callee's declared return type", async () => {
    const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
    const analyze = async (path: string) =>
      analyzeTypeScript({
        root,
        path,
        source: await readFile(join(root, path), 'utf8'),
        mtime: 1,
        resolve: createResolver(root),
        packageOf: () => '@dxos/code-index',
      });
    const documents = [
      await analyze('src/worker/types/fixtures/basics.ts'),
      await analyze('src/worker/types/fixtures/remote.ts'),
    ];
    const bound = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const each of documents) {
          yield* store.putDocument(each);
        }
        const outcomes = yield* Reasoner.run(
          (yield* Reasoner.load(Reasoner.BUNDLED_DIR)).filter((reasoner) => reasoner.name === TypeBinding.NAME),
        );
        expect(outcomes.map((outcome) => outcome.name)).toEqual([TypeBinding.NAME]);
        return yield* store.select(`
          PREFIX deus: <https://dxos.org/vocab/deus#>
          SELECT ?name ?text WHERE {
            GRAPH <${Ontology.passGraphIri(TypeBinding.NAME).value}> { ?symbol deus:hasType ?type }
            ?symbol deus:name ?name. ?type deus:typeText ?text.
          }`);
      }).pipe(Effect.provide(Store.layer(join(dir, 'store'))), Effect.scoped),
    );
    const texts = new Map(bound.map((row) => [row.name, row.text]));
    expect(texts.get('calledRemote')).toBe(
      `<${Ontology.symbolIri('src/worker/types/fixtures/remote.ts', 'Remote').value}>`,
    );
    expect(texts.get('widenedRemote')).toBe('number');
    expect(texts.get('fromRemote')).toBe('1');
    expect(texts.get('boxedRemote')).toBe('{ value: string }');
  });
});

describe('reference resolution pass', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-refs-'));
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  // `@test/lib` is a path alias, so its imports are members of a bare specifier that resolves in the root.
  const sources: Record<string, string> = {
    'tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@test/lib': ['./lib/index.ts'] } } }),
    'lib/impl.ts': ['/** @deprecated Use fresh. */', 'export const legacy = () => 1;', 'export const fresh = 2;'].join(
      '\n',
    ),
    'lib/order.ts': 'export const natural = 1;',
    'lib/services/source.ts': 'export const sourceLayer = 3;',
    'lib/services/index.ts': "export { sourceLayer } from './source';",
    'lib/index.ts': [
      "export * from './impl';",
      "export * as Order from './order';",
      "export { sourceLayer as layer } from './services';",
    ].join('\n'),
    'app/use.ts': [
      "import { layer, legacy, Order } from '@test/lib';",
      'export const usesLegacy = legacy();',
      'export const usesOrder = Order.natural;',
      'export const usesLayer = layer;',
    ].join('\n'),
    'app/direct.ts': ["import { legacy } from '../lib/impl';", 'export const direct = legacy();'].join('\n'),
    'app/barrel.ts': ["import { fresh } from '../lib/index';", 'export const viaBarrel = fresh;'].join('\n'),
  };

  const local = (iri: string) =>
    decodeURIComponent(iri.replace(/^https:\/\/dxos\.org\/(deus\/file\/|deus\/module\/|vocab\/deus#)/, ''));

  const run = (names: readonly string[]) =>
    Effect.gen(function* () {
      for (const [path, source] of Object.entries(sources)) {
        yield* Effect.promise(async () => {
          await mkdir(dirname(join(root, path)), { recursive: true });
          await writeFile(join(root, path), source);
        });
      }
      const resolve = createResolver(root);
      const store = yield* Store.Store;
      for (const path of Object.keys(sources).filter((path) => path.endsWith('.ts'))) {
        yield* store.putDocument(
          analyzeTypeScript({ root, path, source: sources[path], mtime: 1, resolve, packageOf: () => '@test/lib' }),
        );
      }
      const reasoners = (yield* Reasoner.load(Reasoner.BUNDLED_DIR)).filter((reasoner) =>
        names.includes(reasoner.name),
      );
      yield* Reasoner.run(reasoners);
      return store;
    });

  test('every reference through barrels, aliases, namespaces and bare specifiers resolves', async () => {
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* run([ReferenceResolution.NAME]);
        const quads = yield* store.match(
          undefined,
          undefined,
          undefined,
          Ontology.passGraphIri(ReferenceResolution.NAME),
        );
        return quads
          .map((quad) => `${local(quad.subject.value)} ${local(quad.predicate.value)} ${local(quad.object.value)}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(root, '.store-pass'))), Effect.scoped),
    );
    expect(facts).toEqual([
      // A namespace member under a bare specifier.
      '@test/lib#Order.natural resolvesTo lib/order.ts#natural',
      // An alias of an alias.
      '@test/lib#layer resolvesTo lib/services/source.ts#sourceLayer',
      '@test/lib#legacy resolvesTo lib/impl.ts#legacy',
      // Through the `export *` barrel, and each alias whether or not anything references it.
      'lib/index.ts#fresh resolvesTo lib/impl.ts#fresh',
      'lib/index.ts#layer resolvesTo lib/services/source.ts#sourceLayer',
      'lib/index.ts#legacy resolvesTo lib/impl.ts#legacy',
      'lib/services/index.ts#sourceLayer resolvesTo lib/services/source.ts#sourceLayer',
    ]);
  });

  test('a deprecated declaration used through a barrel is a use of the declaration', async () => {
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* run([ReferenceResolution.NAME, '67-usage']);
        const quads = yield* store.derived('67-usage');
        return quads
          .map((quad) => `${local(quad.subject.value)} ${local(quad.predicate.value)} ${local(quad.object.value)}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(root, '.store-usage'))), Effect.scoped),
    );
    expect(facts).toEqual([
      'app/direct.ts#direct usesDeprecated lib/impl.ts#legacy',
      'app/use.ts#usesLegacy usesDeprecated lib/impl.ts#legacy',
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
  desc: Creates an \`X.Document\` with \`helper\`.
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
        for (const name of ['30-compute', '65-packages', '70-specs', '80-gaps']) {
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
    // The mention `X.Document` is the canonical name of `Document`, published as a namespace; `helper`
    // has none, so its declared name is what an importer writes.
    expect(having('describes')).toEqual(
      expect.arrayContaining(['op:create describes Document', 'op:create describes helper']),
    );
    expect(having('covers')).toEqual(['scenario:T-1 covers req:F-1.1', 'test:QA-1 covers feat:F-1']);
    expect(having('includesTest')).toEqual(['suite:smoke includesTest test:QA-1']);
    expect(having('automatedBy')).toEqual(['test:QA-1 automatedBy basic.spec.ts']);
    expect(having('matchesGlob')).toEqual([`ops.ts matchesGlob glob:${PLUGIN}/src/ops.ts`]);

    expect(having('phantom')).toEqual(['op:ghost phantom true', 'type:Phantom phantom true']);
    expect(having('unspecified')).toEqual(['Orphan unspecified true']);
    expect(having('undocumented')).toEqual(['Orphan undocumented true', 'view undocumented true']);
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
