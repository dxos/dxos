//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Declarations from './Declarations.ts';
import { indexUsageFixture } from './mcp/fixture.ts';
import * as Ontology from './Ontology.ts';
import * as Store from './Store.ts';
import * as Log from './workspace/Log.ts';
import * as Sandbox from './workspace/Sandbox.ts';

/**
 * The chat agent once answered "which package defines proxyFetchLegacy?" with a test file's `vi.fn()`
 * double, because its query took the first of three same-named declarations. The fixture has the
 * exported definition plus a test double and a story local that sort ahead of it by path.
 */
const FILES: Record<string, string> = {
  'package.json': JSON.stringify({ name: '@test/root', version: '1.0.0', private: true }),
  'packages/edge/package.json': JSON.stringify({ name: '@test/edge-client', version: '1.0.0' }),
  'packages/edge/src/cors-proxy.ts': 'export const proxyFetchLegacy = async () => 1;\n',
  'packages/edge/src/order.ts': 'export const natural = 1;\n',
  'packages/edge/src/index.ts': "export * from './cors-proxy.ts';\nexport * as Order from './order.ts';\n",
  'packages/edge/src/use.ts':
    "import { proxyFetchLegacy } from './index.ts';\nexport const fetched = proxyFetchLegacy();\n",
  'packages/commerce/package.json': JSON.stringify({ name: '@test/commerce', version: '1.0.0' }),
  'packages/commerce/src/render.test.ts':
    "const proxyFetchLegacy = vi.fn();\ndescribe('render', () => proxyFetchLegacy());\n",
  'packages/commerce/src/render.stories.tsx':
    'const proxyFetchLegacy = () => 2;\nexport const Story = proxyFetchLegacy();\n',
  'packages/widget/package.json': JSON.stringify({ name: '@test/widget', version: '1.0.0' }),
  'packages/widget/src/index.ts': "export { Thing } from './thing.ts';\n",
  'packages/widget/src/thing.ts': 'export class Thing {}\n',
};

const EXPORTED = Ontology.symbolIri('packages/edge/src/cors-proxy.ts', 'proxyFetchLegacy').value;
const THING = Ontology.symbolIri('packages/widget/src/thing.ts', 'Thing').value;

describe('Declarations', () => {
  let root: string;
  let dir: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-declarations-'));
    dir = join(root, 'node_modules', '.code-index');
    for (const [path, source] of Object.entries(FILES)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), source);
    }
    await promisify(execFile)('git', ['init', '--quiet'], { cwd: root });
    await indexUsageFixture(root, dir);
  }, 60_000);

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const find = (name: string, options?: { limit?: number }) =>
    EffectEx.runPromise(
      Effect.scoped(
        Effect.provide(
          Effect.gen(function* () {
            return yield* Declarations.find(yield* Store.Store, name, options);
          }),
          Store.layer(dir),
        ),
      ),
    );

  test('the exported declaration ranks ahead of a same-named test double and story local', async ({ expect }) => {
    const found = await find('proxyFetchLegacy');
    expect(found.map(({ path, exported, role, package: pkg }) => ({ path, exported, role, pkg }))).toEqual([
      { path: 'packages/edge/src/cors-proxy.ts', exported: true, role: 'impl', pkg: '@test/edge-client' },
      { path: 'packages/commerce/src/render.stories.tsx', exported: false, role: 'story', pkg: '@test/commerce' },
      { path: 'packages/commerce/src/render.test.ts', exported: false, role: 'test', pkg: '@test/commerce' },
    ]);
    expect(found[0].iri).toBe(EXPORTED);
  });

  test('the store ranks before it limits, so a capped lookup still keeps the definition', async ({ expect }) => {
    const [only, ...rest] = await find('proxyFetchLegacy', { limit: 1 });
    expect(only.iri).toBe(EXPORTED);
    expect(rest).toEqual([]);
  });

  test('a barrel re-export that sorts ahead of the definition does not take the only slot', async ({ expect }) => {
    const [only, ...rest] = await find('Thing', { limit: 1 });
    expect(only?.iri).toBe(THING);
    expect(rest).toEqual([]);
  });

  test('a dotted name falls back to its last segment, and an unknown name finds nothing', async ({ expect }) => {
    const [natural] = await find('Order.natural');
    expect(natural.path).toBe('packages/edge/src/order.ts');
    expect(await find('noSuchThing')).toEqual([]);
  });

  // The snippet runs under Bun; without it there is nothing to test rather than something broken.
  test.skipIf(Sandbox.interpreter() === undefined)(
    'a sandbox snippet reaches both helpers through `symbols`',
    async ({ expect }) => {
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          const log = yield* Log.Log;
          yield* log.createProject({ id: 'declarations' });
          const sandbox = yield* Sandbox.Sandbox;
          return yield* sandbox.run({
            projectId: 'declarations',
            code: [
              "const [definition] = await symbols.declarations('proxyFetchLegacy');",
              "const used = await symbols.usages('proxyFetchLegacy', { includeTests: false });",
              'return { package: definition.package, declaration: used.declaration, users: used.total.symbols };',
            ].join('\n'),
            timeoutMs: 30_000,
          });
        }).pipe(
          Effect.provide(Layer.provideMerge(Sandbox.layer, Layer.merge(Store.layer(dir), Log.layer(dir)))),
          Effect.scoped,
        ),
      );
      expect(result.ok).toBe(true);
      expect(JSON.parse(result.output)).toEqual({ package: '@test/edge-client', declaration: EXPORTED, users: 1 });
    },
  );
});
