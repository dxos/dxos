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
    await writeFile(join(src, 'extra.ts'), 'export const extra = 1;\n');
    await writeFile(join(src, 'named.ts'), 'export const thing = 1;\nexport const hidden = 2;\n');
    // An app publishes nothing; the tree shows it by the modules at the top of its `src/`.
    await mkdir(join(root, 'packages', 'app', 'src'), { recursive: true });
    await writeFile(join(root, 'packages', 'app', 'package.json'), JSON.stringify({ name: '@fixture/app' }));
    await writeFile(join(root, 'packages', 'app', 'src', 'main.ts'), 'export const run = () => 1;\n');
    await writeFile(join(root, 'packages', 'app', 'src', 'main.test.ts'), 'export const check = 1;\n');
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

  test("a package's entries carry the subpath keys its manifest declares, without its own package.json", async ({
    expect,
  }) => {
    expect(await childrenOf(`pkg:${pkg}`)).toEqual(['.', './Thing']);
  });

  test('a package that publishes nothing shows the modules at the top of its src, tests left out', async ({
    expect,
  }) => {
    const app = Ontology.packageIri('@fixture/app').value;
    expect(await childrenOf(`pkg:${app}`)).toEqual(['src/main.ts']);
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
  });

  test("a namespace's children are its module's exports", async ({ expect }) => {
    expect(await childrenOf(`sym:${symbol('index.ts', 'Obj')}`)).toEqual(['Any', 'make']);
  });

  test('several ids resolve in one call, an unknown one to no children', async ({ expect }) => {
    const results = await withTree((tree) => tree.children(['dir:packages', 'sym:bogus', `pkg:${pkg}`]));
    expect(results.map((result) => [result.id, result.children.length])).toEqual([
      ['dir:packages', 2],
      ['sym:bogus', 0],
      [`pkg:${pkg}`, 2],
    ]);
  });

  test('search returns the path the tree reveals a symbol by', async ({ expect }) => {
    const hits = await withTree((tree) => tree.search('mak'));
    expect(hits[0]?.path).toEqual([
      'repo:fixture/repo',
      'dir:packages',
      `pkg:${pkg}`,
      `mod:${file('Obj.ts')}`,
      `sym:${symbol('Obj.ts', 'make')}`,
    ]);
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
