//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import { EffectEx } from '@dxos/effect';

import * as Indexer from '../Indexer.ts';
import * as Ontology from '../Ontology.ts';
import * as ReferenceResolution from '../ReferenceResolution.ts';
import * as Store from '../Store.ts';

const git = (root: string, ...args: string[]) => promisify(execFile)('git', args, { cwd: root });

/** The Indexer suite's fixture, plus a second `a` so a bare name can be ambiguous. */
export const writeFixture = async (root: string): Promise<void> => {
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@test/fixture', version: '1.0.0' }));
  await writeFile(join(root, 'src', 'a.ts'), "import { b } from './b';\nexport const a = b;\n");
  await writeFile(join(root, 'src', 'b.ts'), "import { c } from './c';\nexport const b = c;\n");
  await writeFile(join(root, 'src', 'c.ts'), "import * as Effect from 'effect';\nexport const c = Effect.succeed;\n");
  await writeFile(join(root, 'src', 'd.ts'), 'export const a = 2;\n');
  await git(root, 'init', '--quiet');
};

const REASONERS = [
  {
    name: 'test',
    rules: `
    @prefix deus: <${Ontology.PREFIX}>.
    { ?a deus:imports ?b } => { ?a deus:importsTestFile ?b }.
  `,
  },
  // The keys `describe` resolves besides paths and names, which the fixture's plain code cannot conclude.
  {
    name: 'names',
    rules: `
    @prefix deus: <${Ontology.PREFIX}>.
    { ?s deus:name "c"; deus:kind "variable" } => { ?s deus:canonicalName "Ns.c"; deus:operationKey "org.test.operation.c" }.
    { ?s deus:name "b"; deus:kind "variable" } => { ?s deus:echoTypename "org.test.type.b"; deus:pluginId "org.test.plugin.b" }.
    { ?f deus:path "src/d.ts"; deus:declares ?s } => { ?s deus:packagePublic true }.
  `,
  },
];

/** Indexes the fixture through the ordinary read-write store, which is closed again before any reader opens it. */
export const indexFixture = (root: string, dir: string) =>
  EffectEx.runPromise(
    Effect.scoped(Effect.provide(Indexer.run({ root, workers: 1, reasoners: REASONERS }), Store.layer(dir))),
  );

/** Two packages whose uses of one declaration go through a star barrel, a namespace and an alias. */
export const writeUsageFixture = async (root: string): Promise<void> => {
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: '@test/root', version: '1.0.0', private: true }),
    'packages/lib/package.json': JSON.stringify({ name: '@test/lib', version: '1.0.0' }),
    'packages/lib/src/impl.ts': '/** @deprecated Use fresh. */\nexport const legacy = () => 1;\n',
    'packages/lib/src/order.ts': 'export const natural = 1;\n',
    'packages/lib/src/index.ts':
      "export * from './impl.ts';\nexport * as Order from './order.ts';\nexport { legacy as old } from './impl.ts';\n",
    'packages/lib/src/direct.ts': "import { legacy } from './impl.ts';\nexport const local = legacy();\n",
    'packages/app/package.json': JSON.stringify({ name: '@test/app', version: '1.0.0' }),
    'packages/app/src/use.ts': [
      "import { legacy, Order } from '../../lib/src/index.ts';",
      'export const usesLegacy = legacy();',
      'export const usesOrder = Order.natural;',
      'export const typed = (): ReturnType<typeof legacy> => 1;',
      '',
    ].join('\n'),
    'packages/app/src/use.test.ts':
      "import { legacy } from '../../lib/src/index.ts';\nexport const tested = legacy();\n",
    'packages/app/src/use.stories.tsx': "import { old } from '../../lib/src/index.ts';\nexport const Story = old();\n",
    // Another `legacy`, so a bare name is ambiguous.
    'packages/app/src/other.ts': 'export const legacy = 2;\n',
  };
  for (const [path, source] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), source);
  }
  await git(root, 'init', '--quiet');
};

/** Indexes the usage fixture with the reference pass, the one reasoner `usages` needs. */
export const indexUsageFixture = (root: string, dir: string) =>
  EffectEx.runPromise(
    Effect.scoped(
      Effect.provide(
        Indexer.run({
          root,
          workers: 1,
          reasoners: [{ name: ReferenceResolution.NAME, derive: ReferenceResolution.derive }],
        }),
        Store.layer(dir),
      ),
    ),
  );
