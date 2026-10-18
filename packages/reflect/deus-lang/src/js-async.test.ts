//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
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
      'def doubled (xs : List Int) : {Js.Async} List Int := List.map (fun x => twice x) xs',
      'def through (f : Int -> {Js.Async} Int) (xs : List Int) : {Js.Async} List Int := List.map f xs',
      'def viaVariable (xs : List Int) : {Js.Async} List Int := through (fun x => twice x + 1) xs',
      'def partial (u : Unit) : {Js.Async} (List Int -> List Int) := List.map (fun x => twice x)',
      'def byName (xs : List Int) : {Js.Async} List Int := List.map twice xs',
      'def applyFst (p : (Int -> {e} Int, Int)) : {e} Int := fst p (snd p)',
      'def viaPair (n : Int) : {Js.Async} Int := applyFst (fun x => twice x, n) + 1',
      'def both (n : Int) : {Js.Async} Int :=',
      '  let get := fun m => later m',
      '  let p := get n',
      '  let q := get n',
      '  Js.toInt (Js.Async.await p) + Js.toInt (Js.Async.await q)',
      'def waitTwice (n : Int) : {Js.Async, Tag} Text :=',
      '  let _ := Js.Async.await (later 5)',
      '  let _ := Js.Async.await (later n)',
      '  Tag.tag ()',
      'def heldA (u : Unit) : {Js.Async} Text :=',
      '  handle waitTwice 60 with',
      '  | Tag.tag v -> k => k "secret-of-A"',
      'def bareTag (u : Unit) : {Tag} Text := Tag.tag ()',
      'def countDoubled (xs : List Int) : {Js.Async} Int := List.length (doubled xs)',
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
      'Wait.doubled',
      'Wait.viaVariable',
      'Wait.byName',
      'Wait.viaPair',
      'Wait.both',
      'Wait.heldA',
      'Wait.bareTag',
      'Wait.countDoubled',
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

    // A function that takes a callback (List.map) gets a waiting variant when the callback may wait: a lambda that
    // waits, or a variable that may hold one.
    expect(await wait.doubled([1, 2, 3])).toEqual([2, 4, 6]);
    expect(await wait.viaVariable([1, 2])).toEqual([3, 5]);

    // An async definition passed by name, and a callback inside a pair, reach waiting variants too.
    expect(await wait.byName([1, 2])).toEqual([2, 4]);
    expect(await wait.viaPair(3)).toBe(7);
    // A local bound to a lambda that does not wait is called without await, so its promises run side by side.
    const started = Date.now();
    expect(await wait.both(150)).toBe(300);
    expect(Date.now() - started).toBeLessThan(280);
    // A call from JavaScript starts under no handlers, even while another call waits under one.
    const held = wait.heldA();
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(() => wait.bareTag()).toThrow(/unhandled ability/);
    expect(await held).toBe('secret-of-A');
    // An async call made whole inside another call's argument is awaited there; it passes no waiting function on.
    expect(await wait.countDoubled([1, 2, 3])).toBe(3);

    // Applied only in part, the variant would not be awaited, so that is refused.
    const refused = deus('build', 'Wait.partial', '-o', join(scratch, 'partial.mjs'), '--js', ...c);
    expect(refused.code).not.toBe(0);
    expect(refused.stderr).toContain('passes a function that may wait to List.map');

    // Two roots with one last name would make a module JavaScript refuses to load.
    const clash = deus('build', 'Wait.sum', 'Wait.sum', '-o', join(scratch, 'clash.mjs'), '--js', ...c);
    expect(clash.stderr).toContain('Wait.sum and Wait.sum would both be exported as sum');
  });

  // D320: a primitive given all its arguments is called directly, so `JsGen.directArity` must match the runtime's.
  test('calls primitives directly with the arity the runtime gives them', { timeout: 240_000 }, async ({ expect }) => {
    process.env.DEUS_HOME = root;
    const c = ['--codebase', join(scratch, 'prims')];
    expect(deus('init', ...c).code).toBe(0);
    const source = [
      'namespace Prims',
      'def all (u : Unit) : Text :=',
      '  let s := "  a,b,c  "',
      '  let t := Text.trim s',
      '  let r := Ref.new 1',
      '  let _ := Ref.set r (Ref.get r + Text.length t)',
      '  let m := MutMap.new ()',
      '  let _ := MutMap.set m "k" 2',
      '  let _ := MutMap.set m "j" 3',
      '  let _ := MutMap.delete m "j"',
      '  let d := Dict.fromList [("x", 1), ("y", 2)]',
      '  Text.concat [',
      '    Text.join "|" (Text.split t ","), " ", Text.slice t 1 3, " ", Int.toText (Text.code t 0), " ",',
      '    Int.toText (Text.indexOf t "c" 0), " ", Text.fromCode 65, Text.fromCodes [66, 67], " ", show (Text.utf8 "é"),',
      '    " ", show (Int.fromText "12"), " ", show (compare "a" "b"), " ", Int.toText (Ref.get r), " ",',
      '    show (MutMap.get m "k"), " ", show (MutMap.has m "j"), " ", Int.toText (MutMap.size m), " ", show (MutMap.keys m),',
      '    " ", show (Dict.lookup "y" d), " ", show (Dict.contains "z" d), " ", Int.toText (Dict.size d), " ",',
      '    show (Dict.keys d), " ", Text.take 8 (Text.sha256 "abc"), " ", "<" ++ t, t ++ ">"]',
      'end Prims',
      '',
    ].join('\n');
    expect(deus('add', file('prims.deus', source), ...c).stderr).toBe('');
    const out = join(scratch, 'prims-out', 'prims.mjs');
    const built = deus('build', 'Prims.all', '-o', out, '--js', ...c);
    expect(built.stderr).toBe('');
    const code = readFileSync(out, 'utf8');
    expect(code).not.toContain('rt.ap(rt.prims');
    expect(code).toContain('("<" + t)');
    const prims = await import(pathToFileURL(out).href);
    expect(prims.all()).toBe(
      'a|b|c ,b 97 4 ABC [195, 169] (some 12) -1 6 (some 2) false 1 ["k"] (some 2) false 2 ["x", "y"] ba7816bf <a,b,ca,b,c>',
    );
  });

  // Task 86d7b02a: with no checkout under $DEUS_HOME, the codebase's embedded copy of the runtime is written out.
  test('builds from the codebase alone, with the runtime it embeds', { timeout: 240_000 }, ({ expect }) => {
    process.env.DEUS_HOME = root;
    const c = ['--codebase', join(scratch, 'alone')];
    expect(deus('init', ...c).code).toBe(0);
    expect(deus('add', file('one.deus', 'def one (u : Unit) : Int := 1\n'), ...c).code).toBe(0);
    expect(
      deus('embed', file('runtime.mjs', '// the embedded runtime\n'), '--as', 'JsGen.runtimeText', ...c).code,
    ).toBe(0);
    const home = process.env.DEUS_HOME;
    process.env.DEUS_HOME = join(scratch, 'no-checkout');
    try {
      const out = join(scratch, 'alone-out', 'one.mjs');
      const built = deus('build', 'one', '-o', out, '--js', ...c);
      expect(built.stderr).toBe('');
      expect(readFileSync(join(scratch, 'alone-out', 'deus-runtime.mjs'), 'utf8')).toBe('// the embedded runtime\n');
    } finally {
      process.env.DEUS_HOME = home;
    }
  });
});
