//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Indexer from '../Indexer.ts';
import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';

const git = (root: string, ...args: string[]) => promisify(execFile)('git', args, { cwd: root });

/** The Indexer suite's fixture, plus a second `a` so a bare name can be ambiguous. */
export const writeFixture = async (root: string): Promise<void> => {
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@test/fixture', version: '1.0.0' }));
  await writeFile(join(root, 'src', 'a.ts'), "import { b } from './b';\nexport const a = b;\n");
  await writeFile(join(root, 'src', 'b.ts'), "import { c } from './c';\nexport const b = c;\n");
  await writeFile(join(root, 'src', 'c.ts'), "import * as Effect from 'effect';\nexport const c = Effect;\n");
  await writeFile(join(root, 'src', 'd.ts'), 'export const a = 2;\n');
  await git(root, 'init', '--quiet');
};

const REASONER = {
  name: 'test',
  rules: `
    @prefix deus: <${Ontology.PREFIX}>.
    { ?a deus:imports ?b } => { ?a deus:importsTestFile ?b }.
  `,
};

/** Indexes the fixture through the ordinary read-write store, which is closed again before any reader opens it. */
export const indexFixture = (root: string, dir: string) =>
  EffectEx.runPromise(
    Effect.scoped(Effect.provide(Indexer.run({ root, workers: 1, reasoners: [REASONER] }), Store.layer(dir))),
  );
