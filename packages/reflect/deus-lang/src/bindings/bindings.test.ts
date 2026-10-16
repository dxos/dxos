//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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

// A consumer of the generated module, type-checked under strict settings and then run. Each
// `@ts-expect-error` must be needed, so the declarations are as tight as they claim.
const consumer = `
import {
  area, configure, DeusDefect, DeusThrow, firstOf, greet, insert, load, lookup, mean, move, paint, ratio,
  applier, handOut, scaledAreas, scaler, Shape, Shapes, sorted, stats, total, Tree, type Point,
} from './geometry.js';
import { int, text } from './deus-runtime.js';

export const run = async (logged: string[], printed: string[]) => {
  // No setup: the first call loads deus_kernel.wasm next to the module.
  const circle = await area(Shape.circle(2));
  // @ts-expect-error a Shape has no square.
  void Shape.square;
  // @ts-expect-error a radius is a number.
  void Shape.circle('2');
  const unconfigured = await total([]).catch((error: unknown) => (error instanceof Error ? error.message : ''));

  configure({
    handlers: {
      Log: {
        // Handlers may be asynchronous: the run waits on the kernel's suspended stack.
        info: async (line) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          logged.push(line);
        },
      },
    },
    io: { print: (line) => void printed.push(line) },
  });
  const shapes = [Shape.circle(2), Shape.rect(3, 4)];
  const point: Point = await move({ x: 1, y: 2 }, 10, 20);

  // A generic type crosses with its parameter's codec; the tree comes back as nested objects.
  let tree: Tree<number> = Tree.leaf;
  for (const value of [5, 2, 8, 1]) {
    tree = await insert(tree, value);
  }
  const thrown = await ratio(1, 0).catch((error: unknown) => (error instanceof DeusThrow ? error.value : error));
  const defect = await mean([]).catch((error: unknown) => error instanceof DeusDefect);

  // A separate instance answers Throw itself.
  const own = await load({
    handlers: {
      Log: { info: () => {} },
      Throw: {
        throw: (reason) => {
          throw new Error(\`DEUS threw: \${reason}\`);
        },
      },
    },
  });
  const answered = await own.ratio(1, 0).catch((error: unknown) => (error instanceof Error ? error.message : ''));

  return {
    circle,
    unconfigured,
    total: await total(shapes),
    stats: await stats(shapes),
    point,
    found: await lookup([['a', 1], ['b', 2]], 'b'),
    missing: await lookup([], 'z'),
    paint: await paint('blue'),
    sorted: await sorted(tree),
    tree,
    ratio: await ratio(7, 2),
    thrown,
    answered,
    greet: await greet(),
    // Calls overlap: each takes its own kernel instance.
    overlapping: await Promise.all([area(Shape.rect(2, 5)), total([]), own.area(Shape.circle(1))]),
    scaled: await Shapes.scale(3, Shape.rect(1, 2)),
    mean: await mean([1, 2, 6]),
    defect,
    // A polymorphic function takes the codec of each type variable first, as a generic type does.
    first: await firstOf(int, [7, 8]),
    none: await firstOf(text, []),
    // @ts-expect-error a list of numbers is no list of text.
    wrong: await firstOf(text, [1]).catch(() => 'refused'),
    // A TypeScript function crosses into DEUS; an asynchronous one suspends the run on each call.
    scaledAreas: await scaledAreas(async (value) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return value * 10;
    }, shapes),
    // @ts-expect-error the function takes a number.
    wrongCallback: await scaledAreas((value: string) => value.length, shapes).catch(() => 'refused'),
    // A DEUS function comes out as an asynchronous function, and passed back it is the same function again.
    tripled: await (await scaler(3))(5),
    scaledByDeus: await scaledAreas(await scaler(2), shapes),
    // A callback receives a DEUS function. Its run waits for the callback, so calling it there fails at once
    // instead of hanging; kept, it runs once the run is over.
    reentrant: await handOut(async (f) => f(21)).catch((error: Error) => error.message),
    handedOut: await (async () => {
      let kept: ((value: number) => Promise<number>) | undefined;
      await handOut((f) => {
        kept = f;
        return 0;
      });
      return kept?.(21);
    })(),
    // Functions are numbered per instance, so one from another instance is refused, not confused.
    crossed: await (await applier(7))(await scaler(100)).catch((error: Error) => error.message),
  };
};
`;

describe('deus bindings', () => {
  test('TypeScript calls DEUS functions and answers their abilities', { timeout: 180_000 }, async ({ expect }) => {
    // The CLI finds the runtime and the wasm kernel through DEUS_HOME, as bin/deus.mjs sets it.
    process.env.DEUS_HOME = root;
    const c = ['--codebase', join(scratch, 'codebase')];
    expect(deus('init', ...c).code).toBe(0);
    expect(deus('add', join(root, 'examples/geometry.deus'), ...c).code).toBe(0);
    const out = join(scratch, 'out');
    const generated = deus('bindings', 'Geometry', '-o', out, '--json', ...c);
    expect(generated.stderr).toBe('');
    expect(generated.code).toBe(0);
    const report = JSON.parse(generated.stdout);
    expect(report.exported).toHaveLength(19);
    expect(report.types).toBe(join(out, 'geometry.d.ts'));
    expect(readFileSync(join(out, 'geometry.d.ts'), 'utf8')).toContain(
      'export declare function area(s: Shape): Promise<number>;',
    );
    // The CLI copies the runtime beside the module rather than importing it.
    expect(readFileSync(join(out, 'deus-runtime.js'), 'utf8')).toBe(
      readFileSync(resolve(import.meta.dirname, 'deus-runtime.js'), 'utf8'),
    );

    writeFileSync(join(out, 'consumer.ts'), consumer);
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
        'consumer.ts',
      ],
      // Outside the package, so no tsconfig.json applies: these flags are the whole configuration.
      { cwd: out, encoding: 'utf8' },
    );
    expect(tsc.stdout).toBe('');
    expect(tsc.status).toBe(0);

    const logged: string[] = [];
    const printed: string[] = [];
    const { run } = await import(join(out, 'consumer.ts'));
    expect(await run(logged, printed)).toEqual({
      circle: 12,
      unconfigured: 'no handler for Geometry.Log: pass handlers.Log to configure() or load()',
      total: 24,
      stats: [2, 12, 12],
      point: { x: 11, y: 22 },
      found: 2,
      missing: undefined,
      paint: '#00f',
      sorted: [1, 2, 5, 8],
      tree: expect.objectContaining({
        $tag: 'node',
        value: 5,
        left: expect.objectContaining({ $tag: 'node', value: 2 }),
      }),
      ratio: 3,
      thrown: 'division by zero',
      answered: 'DEUS threw: division by zero',
      greet: 'greeted',
      overlapping: [10, 0, 3],
      scaled: { $tag: 'rect', w: 3, h: 6 },
      mean: 3,
      defect: true,
      first: 7,
      none: undefined,
      wrong: expect.anything(),
      scaledAreas: [120, 120],
      wrongCallback: expect.anything(),
      tripled: 15,
      scaledByDeus: [24, 24],
      handedOut: 42,
      reentrant: expect.stringContaining('waiting for a callback of its own run'),
      crossed: expect.stringContaining('another instance'),
    });
    expect(logged).toEqual(['summing 2 shapes', 'summing 0 shapes']);
    expect(printed).toEqual(['hello from DEUS\n']);
  });
});
