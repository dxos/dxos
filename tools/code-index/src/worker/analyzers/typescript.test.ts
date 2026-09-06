//
// Copyright 2026 DXOS.org
//

import { parseSync } from 'oxc-parser';
import { describe, expect, test } from 'vitest';

import * as Ontology from '../../Ontology.ts';
import { type AnalyzeContext } from './common.ts';
import { analyzeTypeScript } from './typescript.ts';

const SOURCE = `/**
 * The store service.
 * Second line of the summary.
 *
 * @deprecated use NewStore
 */
export class Store extends Context.Service<Store, Api>()('code-index/Store') {}

export interface Api extends Base { readonly dir: string; run(input: Input): Effect.Effect<void> }

const DEFAULT = 1;

const make = (dir: string) => Layer.succeed(Store, {} as Api);

const doRun = (input: Input) => Effect.succeed(input);

export const layer = (dir: string): Layer.Layer<Store, StoreError> => Layer.unwrap(make(dir));

export const live = Layer.effect(Store, make('.'));

export const handler = Normalize.pipe(Operation.withHandler(() => 1), Other.decorate);

export const Document = Schema.Struct({ title: Schema.String, nested: { deep: { deeper: { deepest: 1 } } } }).pipe(
  Type.Obj({ typename: 'x', version: '1' }),
);

const internal: Config = load();

export type Alias = Result<Store>;

export function run(input: Input, count = DEFAULT): Effect.Effect<Result<Store>> { return doRun(input as any); }

export class Widget { #secret = 1; private hidden(): void {} public shown: string = 'a'; method(a: number): number { return a + helper(); } }

export namespace Helpers {
  export const StubbedLayer = Layer.succeed(Store, {} as Api);

  const hidden = 1;
}

export class Registry {
  static layerEmpty = Layer.succeed(Store, {} as Api);
  static #secret = 2;
  instanceField = 3;
}

export default Layer.succeed(Store, {} as Api);

export * from './everything.ts';
export { pick } from './picked.ts';
export * as Missing from 'not-a-real-module';
`;

const IMPORTS = `import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { Type } from '@dxos/echo';
import * as Operation from '@dxos/compute/Operation';
import type { Input } from './input.ts';
import { StoreError } from './errors.ts';
import { type Config, load } from './config.ts';
import { Normalize } from './normalize.ts';
import { Other } from 'other-lib';
import './side-effect.ts';
`;

const RESOLVED: Record<string, string> = {
  './input.ts': '/repo/src/input.ts',
  './errors.ts': '/repo/src/errors.ts',
  './config.ts': '/repo/src/config.ts',
  './normalize.ts': '/repo/src/normalize.ts',
  './everything.ts': '/repo/src/everything.ts',
  './picked.ts': '/repo/src/picked.ts',
  './side-effect.ts': '/repo/src/side-effect.ts',
  '@dxos/echo': '/repo/packages/echo/src/index.ts',
  '@dxos/compute/Operation': '/repo/packages/compute/src/Operation.ts',
  'effect': '/repo/node_modules/effect/index.js',
  'other-lib': '/repo/node_modules/other-lib/index.js',
};

const context: AnalyzeContext = {
  root: '/repo',
  path: 'src/Store.ts',
  source: IMPORTS + SOURCE,
  mtime: 7,
  resolve: (_from, specifier) => RESOLVED[specifier],
  packageOf: () => '@dxos/code-index',
};

const document = analyzeTypeScript(context);
const symbol = (name: string) => {
  const found = document.declares.find((candidate) => candidate.name === name);
  if (!found) {
    throw new Error(`no symbol ${name}`);
  }
  return found;
};
const member2 = (specifier: string, path: string) => Ontology.memberIri(specifier, path).value;
const file = (path: string) => Ontology.fileIri(path).value;
const sym = (path: string, name: string) => Ontology.symbolIri(path, name).value;

describe('typescript analyzer', () => {
  test('file node carries its package and parses clean', () => {
    expect(document.parseError).toBeUndefined();
    expect(document.inPackage).toEqual(Ontology.packageIri('@dxos/code-index').value);
    expect(document.language).toEqual('typescript');
  });

  test('imports split into value, type-only and external', () => {
    expect(document.imports).toEqual(
      expect.arrayContaining([file('src/config.ts'), file('src/normalize.ts'), file('src/side-effect.ts')]),
    );
    // `input.ts` is `import type`; `errors.ts` is a value import whose binding is only ever used in
    // a type position, so it is erased at runtime just the same.
    expect(document.importsType).toEqual([file('src/input.ts'), file('src/errors.ts')]);
    expect(document.imports).not.toContain(file('src/input.ts'));
    expect(document.imports).not.toContain(file('src/errors.ts'));
    // Workspace packages resolve inside the repo and are files; `effect` resolves to node_modules.
    expect(document.imports).toContain(file('packages/echo/src/index.ts'));
    expect(document.importsModule).toEqual(
      expect.arrayContaining(['effect/Context', 'effect/Layer', 'other-lib', 'not-a-real-module']),
    );
  });

  test('re-exports are edges to the re-exported files', () => {
    expect(document.reexports).toEqual([file('src/everything.ts'), file('src/picked.ts')]);
  });

  test('a class extending a curried call records the callee as a member IRI', () => {
    expect(symbol('Store').extends).toEqual([member2('effect/Context', 'Service')]);
    expect(symbol('Store').kind).toEqual('class');
  });

  test('an interface extends its heritage', () => {
    expect(symbol('Api').extends).toEqual([]);
    expect(symbol('Api').apiDependsOn).toEqual(
      expect.arrayContaining([file('src/input.ts').replace(/$/, '#Input'), member2('effect/Effect', 'Effect')]),
    );
  });

  test('constructedBy and argument come from the initializer call', () => {
    expect(symbol('live').constructedBy).toEqual([member2('effect/Layer', 'effect')]);
    expect(symbol('live').argument).toEqual([sym('src/Store.ts', 'Store')]);
  });

  test('a pipe rooted in a reference is derivedFrom it, and each stage is pipedThrough', () => {
    const handler = symbol('handler');
    expect(handler.derivedFrom).toEqual([sym('src/normalize.ts', 'Normalize')]);
    expect(handler.constructedBy).toEqual([]);
    expect(handler.pipedThrough).toEqual([
      member2('@dxos/compute/Operation', 'withHandler'),
      sym('packages/compute/src/Operation.ts', 'withHandler'),
      member2('other-lib', 'Other.decorate'),
    ]);
  });

  test('a workspace import records both addressings', () => {
    const schema = symbol('Document');
    expect(schema.constructedBy).toEqual([member2('effect/Schema', 'Struct')]);
    expect(schema.pipedThrough).toEqual(
      expect.arrayContaining([member2('@dxos/echo', 'Type.Obj'), sym('packages/echo/src/index.ts', 'Type')]),
    );
  });

  test('type positions are API, value positions are implementation', () => {
    const layer = symbol('layer');
    expect(layer.apiDependsOn).toEqual(
      expect.arrayContaining([
        member2('effect/Layer', 'Layer'),
        sym('src/Store.ts', 'Store'),
        sym('src/errors.ts', 'StoreError'),
      ]),
    );
    expect(layer.implDependsOn).toEqual(
      expect.arrayContaining([member2('effect/Layer', 'unwrap'), sym('src/Store.ts', 'make')]),
    );
    expect(layer.implDependsOn).not.toContain(sym('src/Store.ts', 'Store'));

    const run = symbol('run');
    expect(run.apiDependsOn).toEqual(
      expect.arrayContaining([sym('src/input.ts', 'Input'), member2('effect/Effect', 'Effect')]),
    );
    expect(run.implDependsOn).toEqual(
      expect.arrayContaining([sym('src/Store.ts', 'doRun'), sym('src/Store.ts', 'DEFAULT')]),
    );
  });

  test('a type-only import used in a type position keeps the import type-only', () => {
    expect(symbol('internal').apiDependsOn).toEqual([sym('src/config.ts', 'Config')]);
    expect(symbol('internal').implDependsOn).toEqual([sym('src/config.ts', 'load')]);
    expect(symbol('internal').exported).toBe(false);
  });

  test('unresolved references are counted, globals are not', () => {
    // make, doRun, DEFAULT, helper, Base, Result, Api… — referenced but neither imported nor
    // declared in this file. A gauge, not an exact contract; it must stay a small fraction of the
    // references the file makes.
    expect(document.unresolvedReferences).toBeGreaterThan(0);
    expect(document.unresolvedReferences).toBeLessThan(20);
  });

  test('doc summary and deprecation come from the leading JSDoc', () => {
    expect(symbol('Store').doc).toEqual('The store service. Second line of the summary.');
    expect(symbol('Store').deprecated).toBe(true);
    expect(symbol('layer').doc).toBeUndefined();
    expect(symbol('layer').deprecated).toBeUndefined();
  });

  test('snippets abbreviate implementation and stay valid TypeScript', () => {
    expect(symbol('layer').snippet).toEqual(
      'export const layer = (dir: string): Layer.Layer<Store, StoreError> => { /*...*/ };',
    );
    expect(symbol('run').snippet).toEqual(
      'export function run(input: Input, count = DEFAULT): Effect.Effect<Result<Store>> { /*...*/ }',
    );
    expect(symbol('internal').snippet).toEqual('declare const internal: Config;');
    expect(symbol('Widget').snippet).not.toContain('#secret');
    expect(symbol('Widget').snippet).not.toContain('hidden');
    expect(symbol('Widget').snippet).toContain("public shown: string = 'a'");
    expect(symbol('Widget').snippet).toContain('method(a: number): number { /*...*/ }');
    expect(symbol('Store').snippet).toEqual(
      "export class Store extends Context.Service<Store, Api>()('code-index/Store') {}",
    );
    // Depth-3 literal kept, depth-4 collapsed.
    expect(symbol('Document').snippet).toContain('title: Schema.String');
    expect(symbol('Document').snippet).toContain('deeper: { /*...*/ }');

    for (const declared of document.declares) {
      const reparsed = parseSync('snippet.ts', declared.snippet ?? '');
      expect(
        reparsed.errors.map((error) => error.message),
        declared.name,
      ).toEqual([]);
    }
  });

  test('namespace members and initialized statics are declarations of their own', () => {
    const member = symbol('Helpers.StubbedLayer');
    expect(member).toMatchObject({ kind: 'variable', exported: true });
    expect(member.constructedBy).toEqual([member2('effect/Layer', 'succeed')]);
    expect(member.snippet).toEqual('export const StubbedLayer = Layer.succeed(Store, {} as Api);');
    // A namespace's non-exported member is still a declaration, just not one that leaves the module.
    expect(symbol('Helpers.hidden').exported).toBe(false);

    const statik = symbol('Registry.layerEmpty');
    expect(statik.constructedBy).toEqual([member2('effect/Layer', 'succeed')]);
    expect(statik.argument).toEqual([sym('src/Store.ts', 'Store')]);
    // A class member only parses inside a class; the snippet carries the header that says so.
    expect(statik.snippet).toEqual('class Registry {\n  static layerEmpty = Layer.succeed(Store, {} as Api);\n}');
    // Private statics and instance fields are not module-level declarations.
    expect(document.declares.map((declared) => declared.name)).not.toContain('Registry.#secret');
    expect(document.declares.map((declared) => declared.name)).not.toContain('Registry.instanceField');
  });

  test('a default-exported expression is a declaration with construction', () => {
    // `export default Capability.makeModule(…)` binds no name, but it declares a value all the same.
    expect(symbol('default')).toMatchObject({ kind: 'variable', exported: true });
    expect(symbol('default').constructedBy).toEqual([member2('effect/Layer', 'succeed')]);
    expect(symbol('default').argument).toEqual([sym('src/Store.ts', 'Store')]);
  });

  test('a parse failure still yields a file node', () => {
    const broken = analyzeTypeScript({ ...context, path: 'src/e.ts', source: 'const = ;\n' });
    expect(broken.parseError?.length).toBeGreaterThan(0);
    expect(broken.path).toEqual('src/e.ts');
  });
});
