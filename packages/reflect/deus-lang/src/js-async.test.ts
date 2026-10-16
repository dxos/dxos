//
// Copyright 2026 DXOS.org
//

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';

const { root, scratch, file, deus } = cliHarness('js-async-');

// The js target's `Js.Async` (task 41714c0d): definitions that wait compile to `async` functions, which the Worker's
// R2, D1 and fetch bindings need.
describe('Js.Async on the js target', () => {
  test('waits for promises and keeps each call under its own handlers', { timeout: 240_000 }, async ({ expect }) => {
    process.env.DEUS_HOME = root;
    const c = ['--codebase', join(scratch, 'codebase')];
    expect(deus('init', ...c).code).toBe(0);
    const source = [
      'namespace Wait',
      'ability Tag where',
      '  tag : Unit -> Text',
      '/-- `n`, after `n` milliseconds. -/',
      'def later : Int -> Js := Js.import "./later.mjs" "later"',
      'def twice (n : Int) : {Js.Async} Int := Js.toInt (Js.Async.await (later n)) * 2',
      'def sum (xs : List Int) : {Js.Async} Int :=',
      '  match xs with',
      '  | [] => 0',
      '  | x :: rest => twice x + sum rest',
      'def waitThenTag (n : Int) : {Js.Async, Tag} Text :=',
      '  let _ := Js.Async.await (later n)',
      '  Tag.tag () ++ "/" ++ Int.toText (twice 1)',
      'def tagged (name : Text) (n : Int) : {Js.Async} Text :=',
      '  handle waitThenTag n with',
      '  | Tag.tag u -> k => k name',
      'def viaLambda (n : Int) : {Js.Async} Int :=',
      '  let f := fun m => twice m + 1',
      '  f n',
      'def adder (n : Int) : {Js.Async} (Int -> Int) :=',
      '  let m := Js.toInt (Js.Async.await (later n))',
      '  fun x => x + m',
      'def overApplied (n : Int) : {Js.Async} Int := adder n 10',
      'def pure (xs : List Int) : {Js.Async} List Int := List.map (fun x => x + twice 0) xs',
      'end Wait',
      '',
    ].join('\n');
    const added = deus('add', join(root, 'platform/js/js.deus'), file('wait.deus', source), ...c);
    expect(added.stderr).toBe('');
    file('later.mjs', 'export const later = (n) => new Promise((resolve) => setTimeout(() => resolve(n), n));\n');
    const out = join(scratch, 'wait.mjs');
    const built = deus(
      'build',
      'Wait.sum',
      'Wait.tagged',
      'Wait.viaLambda',
      'Wait.overApplied',
      '-o',
      out,
      '--js',
      ...c,
    );
    expect(built.stderr).toBe('');
    expect(built.code).toBe(0);

    const wait = await import(pathToFileURL(out).href);
    expect(await wait.sum([5, 1, 3])).toBe(18);
    // Calls interleave in both orders: each reads its own handler only if its handlers come back after every await,
    // and a handler that waits leaves nothing behind for the next call.
    expect(await Promise.all([wait.tagged('a', 30), wait.tagged('b', 5)])).toEqual(['a/2', 'b/2']);
    expect(await Promise.all([wait.tagged('a', 5), wait.tagged('b', 30)])).toEqual(['a/2', 'b/2']);
    expect(await wait.viaLambda(4)).toBe(9);
    // `adder n` waits and returns a function, which is applied to 10 once the wait is over.
    expect(await wait.overApplied(5)).toBe(15);

    // A lambda that waits handed to a function that does not would get promises back, so it is refused.
    const refused = deus('build', 'Wait.pure', '-o', join(scratch, 'pure.mjs'), '--js', ...c);
    expect(refused.code).not.toBe(0);
    expect(refused.stderr).toContain('passes a lambda that waits to List.map');
  });
});
