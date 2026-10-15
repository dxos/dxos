//
// Copyright 2026 DXOS.org
//

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';

const { root, scratch, file, deus } = cliHarness('cli-native-');

// The C, wasm and executable back ends: the slowest CLI tests, in a file of their own so they run in parallel with the rest.
describe('deus CLI native back ends', () => {
  test('compiles first-order functions to wasm that agree with the interpreter', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'wasm')];
    deus('init', '--empty', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    const source = [
      'def gcd (a : Int) (b : Int) : Int := if b == 0 then a else gcd b (a % b)',
      'def sumTo (n : Int) (acc : Int) : Int := if n == 0 then acc else sumTo (n - 1) (acc + n)',
      'def collatz (n : Int) (steps : Int) : Int :=',
      '  let half := n / 2',
      '  if n == 1 then steps else if n % 2 == 0 then collatz half (steps + 1) else collatz (3 * n + 1) (steps + 1)',
      'def inRange (n : Int) : Bool := not (n < 2) && n != 9',
      'def shout (t : Text) : Text := t ++ "!"',
      '',
    ].join('\n');
    deus('add', file('nums.deus', source), ...c);
    const call = (name: string, ...args: number[]) => {
      const out = join(scratch, `${name}.wasm`);
      expect(deus('build', name, '-o', out, '--wasm', ...c).code).toBe(0);
      const exports = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(readFileSync(out)))).exports;
      const fn = exports[name.split('.').pop() ?? name];
      return typeof fn === 'function' ? fn(...args) : undefined;
    };
    // A million-deep recursion runs in constant stack (`return_call`) and wraps at 32 bits.
    for (const [name, args] of [
      ['gcd', [1071, 462]],
      ['sumTo', [1_000_000, 0]],
      ['collatz', [27, 0]],
    ] as const) {
      expect(String(call(name, ...args))).toBe(deus('eval', `${name} ${args.join(' ')}`, ...c).stdout.trim());
    }
    expect([call('inRange', 7), call('inRange', 9)]).toEqual([1, 0]);

    // Algebraic data (D56): the sorting example itself, with lists on the module's heap.
    deus('add', join(root, 'examples/sort.deus'), ...c);
    deus(
      'add',
      file(
        'lists.deus',
        [
          'def build (n : Int) : List Int := if n == 0 then [] else n :: build (n - 1)',
          'def total (xs : List Int) : Int := match xs with',
          '  | [] => 0',
          '  | x :: rest => x + total rest',
          'def sortedSum (n : Int) : Int := if Sort.sorted (Sort.isort (build n)) then total (Sort.isort (build n)) else 0 - 1',
          '',
        ].join('\n'),
      ),
      ...c,
    );
    expect(String(call('sortedSum', 300))).toBe(deus('eval', 'sortedSum 300', ...c).stdout.trim());

    // The pure `Array` (D96): compiled code copies where an old array is still read, and writes in
    // place where it is not, so every aliasing case gives the kernel's answer.
    deus('add', join(root, 'examples/aliasing.deus'), ...c);
    expect(String(call('Aliasing.all', 3))).toBe(deus('eval', 'Aliasing.all 3', ...c).stdout.trim());
    expect(String(call('Aliasing.chain', 100_000))).toBe('704982704');

    const refused = deus('build', 'shout', '-o', join(scratch, 'shout.wasm'), '--wasm', ...c);
    expect([refused.code, refused.stderr]).toEqual([1, 'deus: the primitive append is outside the wasm subset\n']);

    // `==` on data calls a generated equality function per type (D100), not an address compare; a long
    // list compares in constant stack.
    deus(
      'add',
      file(
        'same.deus',
        [
          'inductive Tree (a : Type) where',
          '  | leaf',
          '  | node (l : Tree a) (v : a) (r : Tree a)',
          'def grow (n : Int) (k : Int) : Tree Int := if n == 0 then Tree.leaf else Tree.node (grow (n - 1) k) (n * k) (grow (n - 1) k)',
          'def sameTree (n : Int) (k : Int) : Bool := grow n 1 == grow n k',
          'def upto (n : Int) (acc : List Int) : List Int := if n == 0 then acc else upto (n - 1) (n :: acc)',
          'def sameList (n : Int) (k : Int) : Bool := upto n [] != upto k []',
          'def sameNested (x : Int) (y : Int) : Bool := some (some x) == some (if y == 0 then none else some y)',
          'def less (x : Int) : Bool := some x < some x',
          '',
        ].join('\n'),
      ),
      ...c,
    );
    for (const [name, args] of [
      ['sameTree', [4, 1]],
      ['sameTree', [4, 2]],
      ['sameList', [100_000, 100_000]],
      ['sameList', [5, 6]],
      ['sameNested', [3, 3]],
      ['sameNested', [3, 0]],
      ['sameNested', [3, 4]],
    ] as const) {
      expect(call(name, ...args) === 1 ? 'true' : 'false').toBe(
        deus('eval', `${name} ${args.join(' ')}`, ...c).stdout.trim(),
      );
    }
    const ordered = deus('build', 'less', '-o', join(scratch, 'less.wasm'), '--wasm', ...c);
    expect([ordered.code, ordered.stderr]).toEqual([
      1,
      'deus: lt on constructed values is outside the wasm subset, which has no structural order: (app (prim "lt") (app (con "#Option" 1 1) (var 0)) (app (con "#Option" 1 1) (var 0)))\n',
    ]);
  });

  test.skipIf(spawnSync('cc', ['--version']).status !== 0)(
    'compiles first-order functions to C that agree with the interpreter',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'c')];
      deus('init', '--empty', ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
      deus('add', join(root, 'examples/bench.deus'), join(root, 'examples/sorting.deus'), ...c);
      deus(
        'add',
        join(root, 'examples/closures.deus'),
        join(root, 'examples/texts.deus'),
        join(root, 'examples/structural.deus'),
        join(root, 'examples/tables.deus'),
        join(root, 'examples/rendered.deus'),
        join(root, 'examples/handled.deus'),
        join(root, 'examples/constants.deus'),
        ...c,
      );
      // Definitions that differ only in their annotations share a hash: its stored scheme fits both
      // (D116), and their comparisons are decided at run time.
      deus(
        'add',
        file(
          'shared.deus',
          [
            'def beforeInt (x : Int) (y : Int) : Bool := x < y',
            'def beforeText (x : Text) (y : Text) : Bool := x < y',
            'def useInt (n : Int) : Int := if beforeInt n 3 then 1 else 0',
            'def useText (n : Int) : Int := if beforeText (Int.toText n) "3" then 1 else 0',
            '',
          ].join('\n'),
        ),
        ...c,
      );
      expect(deus('view', 'beforeText', ...c).stdout).toContain('-- : a -> a -> Bool\n');
      for (const name of ['useInt', 'useText']) {
        expect(deus('build', name, '-o', join(scratch, name), '--c', ...c).code).toBe(0);
        for (const n of [2, 5]) {
          expect(spawnSync(join(scratch, name), [String(n)], { encoding: 'utf8' }).stdout).toBe(
            deus('eval', `${name} ${n}`, ...c).stdout,
          );
        }
      }
      // Mutual recursion, tail loops, data on the heap, nullary constructors, 32-bit wrapping,
      // arrays and refs. Reference counting frees every block by the end of the run (D86).
      for (const [name, args] of [
        ['Bench.fib', [20]],
        ['Bench.collatz', [1000]],
        ['Bench.trees', [2]],
        ['Bench.queens', [6]],
        ['Sorting.benchMerge', [300, 7]],
        ['Sorting.benchQuick', [300, 7]],
        ['Sorting.benchHeap', [300, 7]],
        ['Sorting.benchArray', [300, 7]],
        // Closures, partial application and lambda-lifted prelude letrecs (D111).
        ['Closures.closureLoop', [20, 0]],
        ['Closures.hofLoop', [5, 200, 0]],
        // Text, `++` on lists, and a Text result printed as the interpreter shows it (D115).
        ['Texts.all', [30]],
        ['Texts.shown', [5]],
        // Structural equality and order of data (D117).
        ['Structural.structural', [200]],
        // Dict, MutMap and Map (D119).
        ['Tables.all', [1000]],
        // show, Text.utf8, Text.fromCodes and Text.sha256 (D120).
        ['Rendered.digestLine', [40]],
        // Handlers whose clauses resume in tail position or abort (D124).
        ['Handled.handledAll', [20]],
        // Constants computed once, and constructors and operations as values (D125).
        ['Constants.constantsAll', [20]],
      ] as const) {
        const out = join(scratch, name);
        expect(deus('build', name, '-o', out, '--c', ...c).code).toBe(0);
        const run = spawnSync(out, args.map(String), {
          encoding: 'utf8',
          env: { ...process.env, DEUS_HEAP_STATS: '1' },
        });
        expect(run.stdout).toBe(deus('eval', `${name} ${args.join(' ')}`, ...c).stdout);
        expect(run.stderr).toContain(', 0 live,');
      }
      deus('add', join(root, 'examples/aliasing.deus'), ...c);
      expect(deus('build', 'Aliasing.all', '-o', join(scratch, 'aliasing'), '--c', ...c).code).toBe(0);
      // Pure `Array.set` (D96) writes in place at a count of one and copies a shared array.
      const aliasing = spawnSync(join(scratch, 'aliasing'), ['3'], {
        encoding: 'utf8',
        env: { ...process.env, DEUS_HEAP_STATS: '1' },
      });
      expect(aliasing.stdout).toBe(deus('eval', 'Aliasing.all 3', ...c).stdout);
      expect(aliasing.stderr).toContain(', 0 live,');
      deus('add', file('wrap.deus', 'def wrap (n : Int) : Int := n * 65536 * 65536 + n * 2147483647\n'), ...c);
      expect(deus('build', 'wrap', '-o', join(scratch, 'wrap'), '--c', ...c).code).toBe(0);
      expect(spawnSync(join(scratch, 'wrap'), ['3'], { encoding: 'utf8' }).stdout).toBe(
        deus('eval', 'wrap 3', ...c).stdout,
      );

      // A freed block over 256 words is reused, so a loop over fresh 1000-item arrays allocates one.
      deus(
        'add',
        file(
          'big.deus',
          [
            'def fill (a : Array Int) (i : Int) : Array Int := if i == Array.length a then a else fill (Array.set a i i) (i + 1)',
            'def big (i : Int) (acc : Int) : Int := if i == 0 then acc else big (i - 1) (acc + Array.get (fill (Array.make 1000 0) 0) 999)',
            '',
          ].join('\n'),
        ),
        ...c,
      );
      expect(deus('build', 'big', '-o', join(scratch, 'big'), '--c', ...c).code).toBe(0);
      const big = spawnSync(join(scratch, 'big'), ['100', '0'], {
        encoding: 'utf8',
        env: { ...process.env, DEUS_HEAP_STATS: '1' },
      });
      expect(big.stdout).toBe(deus('eval', 'big 100 0', ...c).stdout);
      expect(big.stderr).toContain('heap: 1002 words bumped, 0 live');

      // A self tail call is a jump, so a million-deep loop runs in constant stack.
      deus(
        'add',
        file('loop.deus', 'def loop (n : Int) (acc : Int) : Int := if n == 0 then acc else loop (n - 1) (acc + n)\n'),
        ...c,
      );
      expect(deus('build', 'loop', '-o', join(scratch, 'loop.c'), '--c', ...c).code).toBe(0);
      expect(readFileSync(join(scratch, 'loop.c'), 'utf8')).toContain('goto top;');

      const refused = deus('build', 'Text.length', '-o', join(scratch, 'length'), '--c', ...c);
      expect(refused.code).toBe(1);
      expect(refused.stderr).toContain('length is a primitive, not a definition the C back end compiles');

      // A clause that resumes other than in tail position needs a captured continuation (D124).
      deus(
        'add',
        file(
          'resumes.deus',
          'def resumes (n : Int) : Int :=\n  handle Handled.metered n 0 with\n  | Handled.Meter.advance x -> k => k x + 1\n',
        ),
        ...c,
      );
      const resumes = deus('build', 'resumes', '-o', join(scratch, 'resumes'), '--c', ...c);
      expect(resumes.code).toBe(1);
      expect(resumes.stderr).toContain('a handler that resumes other than in tail position is outside the C subset');
    },
  );

  test.skipIf(spawnSync('clang', ['--target=wasm32', '-print-prog-name=wasm-ld']).status !== 0)(
    'compiles the C back end to wasm with reference counting',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'c-wasm')];
      deus('init', '--empty', ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
      deus('add', join(root, 'examples/bench.deus'), join(root, 'examples/sorting.deus'), ...c);
      deus(
        'add',
        join(root, 'examples/closures.deus'),
        join(root, 'examples/texts.deus'),
        join(root, 'examples/structural.deus'),
        join(root, 'examples/tables.deus'),
        join(root, 'examples/rendered.deus'),
        join(root, 'examples/handled.deus'),
        join(root, 'examples/constants.deus'),
        ...c,
      );
      for (const [name, args] of [
        ['Closures.hofLoop', [5, 200, 0]],
        ['Texts.all', [30]],
        ['Structural.structural', [200]],
        ['Tables.all', [1000]],
        ['Rendered.digestBytes', [40]],
        ['Handled.handledAll', [20]],
        ['Constants.constantsAll', [20]],
        ['Bench.trees', [2]],
        ['Bench.queens', [6]],
        ['Sorting.benchMerge', [300, 7]],
        ['Sorting.benchArray', [300, 7]],
      ] as const) {
        const out = join(scratch, `${name}.wasm`);
        expect(deus('build', name, '-o', out, '--c', ...c).code).toBe(0);
        const instance = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(readFileSync(out))));
        const run = instance.exports[name.split('.')[1]];
        const live = instance.exports.deus_live;
        if (typeof run !== 'function' || typeof live !== 'function') {
          throw new Error(`${name}.wasm does not export ${name} and deus_live`);
        }
        expect(`${run(...args)}\n`).toBe(deus('eval', `${name} ${args.join(' ')}`, ...c).stdout);
        expect(live()).toBe(0);
      }
    },
  );

  test.skipIf(spawnSync('cc', ['--version']).status !== 0)(
    'builds a command whose IO the C runtime performs, as the interpreter does',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'command')];
      deus('init', '--empty', ...c);
      deus(
        'add',
        join(root, 'deus/builtins.deus'),
        join(root, 'deus/prelude.deus'),
        join(root, 'examples/command.deus'),
        ...c,
      );
      const out = join(scratch, 'command-native');
      expect(deus('build', 'Command.main', '-o', out, '--c', ...c).code).toBe(0);
      const text = file('words.txt', 'the cat\nthe dog and the bird\n\tA cat é\n');
      for (const args of [
        ['count', text],
        ['freq', text, '3'],
        ['roundtrip', join(scratch, 'roundtrip')],
        ['quiet', '12'],
        ['exec'],
        ['caught', 'word'],
        ['defect', 'word'],
        ['count', join(scratch, 'missing.txt')],
        [],
      ]) {
        const native = spawnSync(out, args, { encoding: 'utf8', env: { ...process.env, DEUS_HEAP_STATS: '1' } });
        const interpreted = deus('run', ...c, 'Command.main', ...args);
        expect([native.status, native.stdout]).toEqual([interpreted.code, interpreted.stdout]);
        // A native defect names no definitions, so the interpreter's trace lines are left out.
        expect(native.stderr.replace(/heap: .*\n/, '')).toBe(interpreted.stderr.replace(/^ +at .*\n/gm, ''));
        if (native.status === 0) {
          expect(native.stderr).toContain(', 0 live,');
        }
      }
    },
  );

  test.skipIf(spawnSync('cc', ['--version']).status !== 0)(
    'builds the compiler natively, and it writes the seed image',
    { timeout: 240_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'compiler')];
      deus('init', '--empty', ...c);
      expect(deus('add', join(root, 'deus'), join(root, 'examples/compiler.deus'), ...c).code).toBe(0);
      const out = join(scratch, 'deusc');
      expect(deus('build', 'NativeCompiler.main', '-o', out, '--c', ...c).code).toBe(0);
      const image = join(scratch, 'native.image');
      const run = spawnSync(out, [image, join(root, 'deus')], {
        encoding: 'utf8',
        env: { ...process.env, DEUS_HEAP_STATS: '1' },
      });
      expect(run.status).toBe(0);
      expect(run.stderr).toContain(', 0 live,');
      expect(readFileSync(image, 'utf8')).toBe(readFileSync(join(root, 'seed/deus.image'), 'utf8'));
    },
  );

  test.skipIf(spawnSync('cc', ['--version']).status !== 0)(
    'builds the deus CLI natively, which writes the same codebase',
    { timeout: 400_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'cli-source')];
      deus('init', '--empty', ...c);
      expect(deus('add', join(root, 'deus'), ...c).code).toBe(0);
      const native = join(scratch, 'deus-native');
      expect(deus('build', 'Cli.main', '-o', native, '--c', ...c).code).toBe(0);
      const target = ['--codebase', join(scratch, 'cli-target')];
      const run = (...args: string[]) =>
        spawnSync(native, args, { encoding: 'utf8', env: { ...process.env, DEUS_HOME: root } });
      expect(run('init', '--empty', ...target).status).toBe(0);
      const added = run(
        'add',
        join(root, 'examples/structural.deus'),
        join(root, 'deus/builtins.deus'),
        join(root, 'deus/prelude.deus'),
        ...target,
      );
      expect(added.status).toBe(0);
      expect(deus('view', 'Structural.structural', ...target).stdout).toBe(
        run('view', 'Structural.structural', ...target).stdout,
      );
      // The interpreter in the C runtime (D143) runs what the kernels run: tests, and expressions printed by their types.
      expect(run('test', ...target).stdout).toBe('  ✓ Structural.structuralSmall\n1 passed, 0 failed\n');
      for (const source of ['1 + 1', '[1 == 1, false]', 'Option.some ((), "a")', 'Structural.structural']) {
        expect(run('eval', source, ...target).stdout).toBe(deus('eval', source, ...target).stdout);
      }
      const cost = run('eval', 'Code.cost (fun _ => 1)', ...target);
      expect([cost.status, cost.stderr]).toEqual([
        70,
        "defect: Code.steps and Code.cost count the kernels' machine steps, which the native interpreter does not count\n",
      ]);
    },
  );

  test(
    'serves web handlers from a standalone native server',
    { timeout: 240_000 },
    async ({ expect, onTestFinished }) => {
      process.env.DEUS_HOME = root;
      const c = ['--codebase', join(scratch, 'server')];
      deus('init', '--empty', ...c);
      const sources = [
        'deus/builtins.deus',
        'deus/prelude.deus',
        'platform/web.deus',
        'examples/notes.deus',
        'examples/tally.deus',
      ];
      expect(deus('add', ...sources.map((path) => join(root, path)), ...c).code).toBe(0);
      // The server reports on stderr when it listens and when an alarm fires; the test waits on those lines.
      const start = async (handler: string) => {
        const binary = join(scratch, handler);
        expect(deus('build', handler, '-o', binary, '--server', ...c).code).toBe(0);
        const port = String(20_000 + Math.floor(Math.random() * 20_000));
        const server = spawn(binary, [], {
          env: { ...process.env, PORT: port, DEUS_DATA: join(scratch, `${handler}-data`) },
        });
        onTestFinished(() => {
          server.kill();
        });
        let log = '';
        const waiters: { line: string; resolve: () => void }[] = [];
        server.stderr.on('data', (chunk: Buffer) => {
          log += chunk.toString();
          for (const waiter of waiters.filter((waiter) => log.includes(waiter.line))) {
            waiters.splice(waiters.indexOf(waiter), 1);
            waiter.resolve();
          }
        });
        const logged = (line: string) =>
          new Promise<void>((resolve) => (log.includes(line) ? resolve() : waiters.push({ line, resolve })));
        await logged('serving on');
        return { url: `http://127.0.0.1:${port}`, logged };
      };
      const request = async (url: string, init?: RequestInit) => {
        const response = await fetch(url, init);
        return [response.status, await response.text(), response.headers.get('content-type')] as const;
      };

      const { url: notes } = await start('Notes.serve');
      expect(await request(`${notes}/notes/greet?actor=me`, { method: 'PUT', body: 'hello' })).toEqual([
        201,
        'stored greet',
        'text/plain; charset=utf-8',
      ]);
      expect(await request(`${notes}/notes/greet?actor=me`)).toEqual([200, 'hello', 'text/plain; charset=utf-8']);
      expect((await request(`${notes}/notes/greet?actor=you`))[0]).toBe(404);
      expect(await request(`${notes}/?actor=me`)).toEqual([
        200,
        '<!doctype html><title>Notes</title><h1>Notes</h1><ul><li><a href="/notes/greet">greet</a></li></ul>',
        'text/html; charset=utf-8',
      ]);

      // Objects call each other by name, and an alarm arrives later as a request.
      const { url: tally, logged } = await start('Tally.serve');
      expect((await request(`${tally}/add?actor=a`, { method: 'POST' }))[1]).toBe('count 1, total 1');
      expect((await request(`${tally}/add?actor=b`, { method: 'POST' }))[1]).toBe('count 1, total 2');
      expect((await request(`${tally}/remind?actor=c`, { method: 'POST' }))[1]).toBe('reminder set');
      await logged('alarm fired for c');
      expect((await request(`${tally}/reminded?actor=c`))[1]).toBe('yes');
    },
  );

  test('builds a standalone executable', { timeout: 180_000 }, ({ expect }) => {
    process.env.DEUS_HOME = root;
    process.env.DEUS_NODE = process.execPath;
    const c = ['--codebase', join(scratch, 'binary')];
    deus('init', '--empty', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    const source = join(scratch, 'hello.deus');
    writeFileSync(source, 'def main (u : Unit) : {IO} Unit := IO.print ("hello " ++ Text.join "," (IO.args ()))\n');
    deus('add', source, ...c);
    const binary = join(scratch, 'hello');
    const build = deus('build', 'main', '-o', binary, ...c);
    expect(build.stderr).toBe('');
    expect(build.code).toBe(0);
    const run = spawnSync(binary, ['a', 'b'], { cwd: tmpdir(), encoding: 'utf8' });
    expect([run.status, run.stdout]).toEqual([0, 'hello a,b']);
  });
});
