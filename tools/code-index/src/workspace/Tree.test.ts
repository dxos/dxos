//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Indexer from '../Indexer.ts';
import * as Ontology from '../Ontology.ts';
import * as Reasoner from '../Reasoner.ts';
import * as Store from '../Store.ts';
import * as Protocol from './Protocol.ts';
import * as Search from './Search.ts';
import * as Tree from './Tree.ts';

/**
 * The repository tree over a real index of a one-package workspace: directories down to the
 * package, its entrypoints by the subpath keys its manifest declares, and each entry's exports.
 */

const git = (root: string, ...args: string[]) => promisify(execFile)('git', args, { cwd: root });

describe('Tree', () => {
  let root: string;
  let dir: string;

  const pkg = Ontology.packageIri('@fixture/lib').value;
  const file = (path: string) => Ontology.fileIri(`packages/lib/src/${path}`).value;
  const symbol = (path: string, name: string) => Ontology.symbolIri(`packages/lib/src/${path}`, name).value;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-tree-'));
    dir = join(root, 'node_modules', '.code-index');
    const src = join(root, 'packages', 'lib', 'src');
    await mkdir(src, { recursive: true });
    await writeFile(
      join(root, 'packages', 'lib', 'package.json'),
      JSON.stringify({
        name: '@fixture/lib',
        exports: {
          '.': { source: './src/index.ts' },
          './Thing': { source: './src/Obj.ts' },
          './package.json': './package.json',
        },
      }),
    );
    await writeFile(
      join(src, 'index.ts'),
      [
        "export * as Obj from './Obj.ts';",
        "export * from './extra.ts';",
        "export { thing } from './named.ts';",
        '',
      ].join('\n'),
    );
    await writeFile(
      join(src, 'Obj.ts'),
      ['/** Makes one. */', 'export const make = () => {', '  return 1;', '};', '', 'export interface Any {}', ''].join(
        '\n',
      ),
    );
    // Its default export is its own: `export *` from index.ts does not carry it.
    await writeFile(join(src, 'extra.ts'), 'export const extra = 1;\nexport default class Extra {}\n');
    await writeFile(join(src, 'named.ts'), 'export const thing = 1;\nexport const hidden = 2;\n');
    // An app publishes nothing, and its service sits where no entry reaches; the tree shows both through `src`.
    await mkdir(join(root, 'packages', 'app', 'src', 'services'), { recursive: true });
    await writeFile(join(root, 'packages', 'app', 'package.json'), JSON.stringify({ name: '@fixture/app' }));
    await writeFile(join(root, 'packages', 'app', 'src', 'main.ts'), 'export const run = () => 1;\n');
    await writeFile(join(root, 'packages', 'app', 'src', 'main.test.ts'), 'export const check = 1;\n');
    await writeFile(
      join(root, 'packages', 'app', 'src', 'services', 'Sandbox.ts'),
      'export class SandboxService {}\nconst secret = 1;\n',
    );
    // A route segment, the kind of folder name a path filter of word characters would refuse.
    await mkdir(join(root, 'packages', 'app', 'src', 'routes', '[id]'), { recursive: true });
    await writeFile(join(root, 'packages', 'app', 'src', 'routes', '[id]', 'page.ts'), 'export const page = 1;\n');
    await git(root, 'init', '--quiet');
    await git(root, 'remote', 'add', 'origin', 'git@github.com:fixture/repo.git');
    // The bundled rules derive `publishedBy` and `packagePublic`, which the tree and search read.
    await EffectEx.runPromise(
      Effect.scoped(
        Effect.provide(
          Effect.flatMap(Reasoner.load(Reasoner.BUNDLED_DIR), (reasoners) =>
            Indexer.run({ root, workers: 1, reasoners }),
          ),
          Store.layer(dir),
        ),
      ),
    );
  }, 120_000);

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const withTree = <A, E>(body: (tree: Effect.Success<ReturnType<typeof Tree.make>>) => Effect.Effect<A, E>) =>
    EffectEx.runPromise(
      Effect.scoped(
        Effect.provide(
          Effect.flatMap(Store.Store, (store) => Effect.flatMap(Tree.make(store, root), body)),
          Store.layer(dir),
        ),
      ),
    );

  const withSearch = <A, E>(body: (search: ReturnType<typeof Search.make>) => Effect.Effect<A, E>) =>
    EffectEx.runPromise(
      Effect.scoped(
        Effect.provide(
          Effect.flatMap(Store.Store, (store) => body(Search.make(store))),
          Store.layer(dir),
        ),
      ),
    );

  const appFile = (path: string) => Ontology.fileIri(`packages/app/src/${path}`).value;
  const appSymbol = (path: string, name: string) => Ontology.symbolIri(`packages/app/src/${path}`, name).value;

  const childrenOf = (id: string) =>
    withTree((tree) => tree.children([id])).then(([result]) => result.children.map((node) => node.label));

  test('the root holds the GitHub repository, and directories lead to the package', async ({ expect }) => {
    expect(await childrenOf(Protocol.TREE_ROOT)).toEqual(['fixture/repo']);
    expect(await childrenOf('repo:fixture/repo')).toEqual(['packages']);
    const [packages] = await withTree((tree) => tree.children(['dir:packages']));
    expect(packages.children).toEqual([
      expect.objectContaining({ label: '@fixture/app', kind: 'package', detail: 'app' }),
      expect.objectContaining({ id: `pkg:${pkg}`, label: '@fixture/lib', kind: 'package', detail: 'lib' }),
    ]);
  });

  test("a package's entries are named as module files, the root one first and marked, then its src", async ({
    expect,
  }) => {
    const [entries] = await withTree((tree) => tree.children([`pkg:${pkg}`]));
    expect(entries.children.map((node) => [node.label, node.kind, node.detail])).toEqual([
      ['./index.ts', 'entry', '<root>'],
      ['./Obj.ts', 'entry', undefined],
      ['src', 'folder', undefined],
    ]);
  });

  test("a package's src is a file tree of its modules, folders first and tests left out", async ({ expect }) => {
    const app = Ontology.packageIri('@fixture/app').value;
    expect(await childrenOf(`pkg:${app}`)).toEqual(['src']);
    const [src] = await withTree((tree) => tree.children(['src:packages/app/src']));
    expect(src.children.map((node) => [node.label, node.kind])).toEqual([
      ['routes', 'folder'],
      ['services', 'folder'],
      ['main.ts', 'file'],
    ]);
    expect(await childrenOf('src:packages/app/src/services')).toEqual(['Sandbox.ts']);
    expect(await childrenOf(`mod:${appFile('services/Sandbox.ts')}`)).toEqual(['SandboxService']);
    expect(await childrenOf('src:packages/app/src/routes')).toEqual(['[id]']);
    expect(await childrenOf('src:packages/app/src/routes/[id]')).toEqual(['page.ts']);
  });

  test('an entry lists its exports, splicing in a bare export * but not a named re-export source', async ({
    expect,
  }) => {
    const [entry] = await withTree((tree) => tree.children([`mod:${file('index.ts')}`]));
    expect(entry.children.map((node) => [node.label, node.kind])).toEqual([
      ['Obj', 'namespace'],
      ['extra', 'symbol'],
      ['thing', 'symbol'],
    ]);
    // The module that declares a default export still lists it.
    expect(await childrenOf(`mod:${file('extra.ts')}`)).toContain('Extra');
  });

  test("a namespace's children are its module's exports", async ({ expect }) => {
    expect(await childrenOf(`sym:${symbol('index.ts', 'Obj')}`)).toEqual(['Any', 'make']);
  });

  test('several ids resolve in one call, an unknown one to no children', async ({ expect }) => {
    const results = await withTree((tree) => tree.children(['dir:packages', 'sym:bogus', `pkg:${pkg}`]));
    expect(results.map((result) => [result.id, result.children.length])).toEqual([
      ['dir:packages', 2],
      ['sym:bogus', 0],
      [`pkg:${pkg}`, 3],
    ]);
  });

  test('locate places a symbol under the entry that exposes it', async ({ expect }) => {
    const above = ['repo:fixture/repo', 'dir:packages', `pkg:${pkg}`];
    expect(await withTree((tree) => tree.locate(`sym:${symbol('Obj.ts', 'make')}`))).toEqual([
      ...above,
      `mod:${file('Obj.ts')}`,
      `sym:${symbol('Obj.ts', 'make')}`,
    ]);
    // Exported but reached by no entry: its place is its module in `src`.
    expect(await withTree((tree) => tree.locate(`sym:${symbol('named.ts', 'hidden')}`))).toEqual([
      ...above,
      'src:packages/lib/src',
      `mod:${file('named.ts')}`,
      `sym:${symbol('named.ts', 'hidden')}`,
    ]);
  });

  test('locate reaches a service no entry exposes, and stops at the module for what it does not export', async ({
    expect,
  }) => {
    const app = Ontology.packageIri('@fixture/app').value;
    const module = `mod:${appFile('services/Sandbox.ts')}`;
    const above = [
      'repo:fixture/repo',
      'dir:packages',
      `pkg:${app}`,
      'src:packages/app/src',
      'src:packages/app/src/services',
    ];
    expect(await withTree((tree) => tree.locate(`sym:${appSymbol('services/Sandbox.ts', 'SandboxService')}`))).toEqual([
      ...above,
      module,
      `sym:${appSymbol('services/Sandbox.ts', 'SandboxService')}`,
    ]);
    expect(await withTree((tree) => tree.locate(`sym:${appSymbol('services/Sandbox.ts', 'secret')}`))).toEqual([
      ...above,
      module,
    ]);
    expect(await withTree((tree) => tree.locate('sym:bogus'))).toBeUndefined();
  });

  test('search finds what no entry exports, by declaration or by file name', async ({ expect }) => {
    const hits = await withSearch((search) => search.search('sandbox'));
    expect(hits.map((hit) => [hit.node.label, hit.node.kind])).toEqual([
      ['Sandbox.ts', 'file'],
      ['SandboxService', 'symbol'],
    ]);
  });

  test('search ranks an exact name first, and published declarations ahead of internal ones', async ({ expect }) => {
    const hits = await withSearch((search) => search.search('make'));
    expect(hits[0]?.node).toMatchObject({ label: 'make', kind: 'symbol', detail: 'variable' });
    // Both contain `n` mid-name, so they share a tier: the published `thing` goes ahead of the internal `hidden`.
    const labels = (await withSearch((search) => search.search('n'))).map((hit) => hit.node.label);
    expect(labels).toContain('hidden');
    expect(labels.indexOf('thing')).toBeLessThan(labels.indexOf('hidden'));
  });

  test("a symbol's source is its declaration with the comment above it", async ({ expect }) => {
    const source = await withTree((tree) => tree.source(`sym:${symbol('Obj.ts', 'make')}`));
    expect(source).toMatchObject({
      path: 'packages/lib/src/Obj.ts',
      line: 1,
      code: '/** Makes one. */\nexport const make = () => {\n  return 1;\n};',
      truncated: false,
    });
    expect(await withTree((tree) => tree.source('dir:packages'))).toBeUndefined();
  });
});
