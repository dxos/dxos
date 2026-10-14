//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, test } from 'vitest';

import { SEED_PATH } from '../kernel/main.ts';
import { runImage } from '../kernel/run.ts';

const root = join(import.meta.dirname, '../..');
const seed = readFileSync(SEED_PATH, 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'deus-bindings-'));

const deus = (...args: string[]) => {
  let stdout = '';
  let stderr = '';
  const { code } = runImage(seed, {
    args,
    stdout: (chunk) => {
      stdout += chunk;
    },
    stderr: (chunk) => {
      stderr += chunk;
    },
  });
  return { code, stdout, stderr };
};

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe('deus bindings', () => {
  test('TypeScript calls DEUS functions and answers their abilities', { timeout: 180_000 }, async ({ expect }) => {
    // The CLI finds the runtime and the wasm kernel through DEUS_HOME, as bin/deus.mjs sets it.
    process.env.DEUS_HOME = root;
    const c = ['--codebase', join(scratch, 'codebase')];
    expect(deus('init', ...c).code).toBe(0);
    expect(deus('add', join(root, 'examples/geometry.deus'), ...c).code).toBe(0);
    const out = join(scratch, 'out');
    const generated = deus('bindings', 'Geometry', '-o', out, '--json', ...c);
    expect(generated.stderr).toBe(
      'warning: not exported: Geometry.firstOf: polymorphic in t2; only monomorphic functions are exported\n',
    );
    expect(generated.code).toBe(0);
    expect(JSON.parse(generated.stdout).exported).toHaveLength(11);

    // The module type-checks under the strictest settings a consumer might use.
    const tsc = spawnSync(
      join(root, 'node_modules/.bin/tsc'),
      [
        '--noEmit',
        '--strict',
        '--noUncheckedIndexedAccess',
        '--exactOptionalPropertyTypes',
        '--noImplicitReturns',
        '--noUnusedLocals',
        '--noUnusedParameters',
        '--allowImportingTsExtensions',
        '--target',
        'esnext',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--lib',
        'esnext,dom',
        '--types',
        '',
        'geometry.ts',
      ],
      // Outside the package, so no tsconfig.json applies: these flags are the whole configuration.
      { cwd: out, encoding: 'utf8' },
    );
    expect(tsc.stdout).toBe('');
    expect(tsc.status).toBe(0);

    const { load, DeusDefect } = await import(join(out, 'geometry.ts'));
    const logged: string[] = [];
    const printed: string[] = [];
    const geometry = await load(
      readFileSync(join(out, 'deus_kernel.wasm')),
      {
        Log: {
          // Handlers may be asynchronous: the run waits on the kernel's suspended stack.
          info: async (line: string) => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            logged.push(line);
          },
        },
        Throw: {
          throw_: (reason: string) => {
            throw new Error(`DEUS threw: ${reason}`);
          },
        },
      },
      { print: (line: string) => printed.push(line) },
    );

    const shapes = [
      { $tag: 'circle', r: 2 },
      { $tag: 'rect', w: 3, h: 4 },
    ];
    expect(await geometry.area(shapes[0])).toBe(12);
    expect(await geometry.total(shapes)).toBe(24);
    expect(logged).toEqual(['summing 2 shapes']);
    expect(await geometry.stats(shapes)).toEqual([2, 12, 12]);
    expect(await geometry.move({ x: 1, y: 2 }, 10, 20)).toEqual({ x: 11, y: 22 });
    expect(
      await geometry.lookup(
        [
          ['a', 1],
          ['b', 2],
        ],
        'b',
      ),
    ).toBe(2);
    expect(await geometry.lookup([], 'z')).toBeUndefined();
    expect(await geometry.paint('blue')).toBe('#00f');

    // A generic type crosses with its parameter's codec; the tree comes back as nested objects.
    let tree = { $tag: 'leaf' };
    for (const value of [5, 2, 8, 1]) {
      tree = await geometry.insert(tree, value);
    }
    expect(await geometry.sorted(tree)).toEqual([1, 2, 5, 8]);
    expect(tree).toMatchObject({ $tag: 'node', value: 5, left: { $tag: 'node', value: 2 } });

    expect(await geometry.ratio(7, 2)).toBe(3);
    await expect(geometry.ratio(1, 0)).rejects.toThrow('DEUS threw: division by zero');
    expect(await geometry.greet()).toBe('greeted');
    expect(printed).toEqual(['hello from DEUS\n']);

    // Calls overlap: each takes its own kernel instance.
    expect(await Promise.all([geometry.area({ $tag: 'rect', w: 2, h: 5 }), geometry.total([])])).toEqual([10, 0]);
    expect(await geometry.mean([1, 2, 6])).toBe(3);
    await expect(geometry.mean([])).rejects.toBeInstanceOf(DeusDefect);
  });
});
