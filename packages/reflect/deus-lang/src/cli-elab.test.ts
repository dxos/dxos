//
// Copyright 2026 DXOS.org
//

import { join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';

const { root, scratch, file, deus } = cliHarness('cli-elab-');

// The types a notation is stored as, which the toolchain's codebase has and a fresh one does not.
const notationTypes = `inductive Syntax.Part @"urn:deus:syntax:Part" where
  | lit (text : Text)
  | hole (index : Int) (category : Text) (prec : Int) (repeat : Text)
  | again (index : Int)
structure Syntax.Notation a @"urn:deus:syntax:Notation" where
  category : Text
  precedence : Int
  parts : List Syntax.Part
  expansion : a
`;

const elaborators = `namespace Unroll
def double (n : Int) : Int := n * 2

/-- \`f\` applied \`k\` times to \`x\`, as Core. -/
def applied (k : Int) (f : Sexp) (x : Sexp) : Sexp := if k <= 0 then x else Sexp.list [Sexp.sym "app", f, applied (k - 1) f x]

/-- \`times!(k, f, x)\`: \`f\` applied \`k\` times to \`x\`, unrolled while the use compiles. -/
@[elab]
notation times := "times!(" k:num ", " f ", " x ")" =>
  match k with
  | Sexp.list [Sexp.sym "int", Sexp.int n] => if n > 100 then throw "times! unrolls at most 100 calls" else applied n f x
  | _ => throw "times! takes a number"

/-- \`twice!(x)\`: \`Unroll.double\` named in the term the elaborator makes, resolved where it is used. -/
@[elab]
notation twice := "twice!(" x ")" => Sexp.list [Sexp.sym "app", Sexp.list [Sexp.sym "name", Sexp.str "Unroll.double"], x]
end Unroll
`;

// Syntax.Spec R-10: an elaborator is a DEUS function from a use's hole terms to the term the use stores, run by the compiler.
describe('elaborators', () => {
  test('an elaborator computes the term a use stores', { timeout: 120_000 }, ({ expect }) => {
    // `init` finds the builtins and prelude through DEUS_HOME, as bin/deus.mjs sets it.
    process.env.DEUS_HOME = root;
    const c = ['--codebase', join(scratch, 'codebase')];
    expect(deus('init', ...c).code).toBe(0);
    // Elaborators build Core as `Sexp`, the toolchain's own type, which a codebase adds like any file.
    expect(deus('add', join(root, 'deus/sexp.deus'), ...c).code).toBe(0);
    expect(deus('add', file('notation.deus', notationTypes), ...c).code).toBe(0);

    const sameBatch = deus(
      'add',
      file('same.deus', `${elaborators}namespace Unroll\ndef early : Int := twice!(1)\nend Unroll\n`),
      ...c,
    );
    expect(sameBatch.code).not.toBe(0);
    expect(sameBatch.stderr).toContain('add it before the code that uses it');

    expect(deus('add', file('elab.deus', elaborators), ...c).code).toBe(0);
    const uses = `namespace Unroll
def eight : Int := times!(3, double, 1)
def eightPlain : Int := double (double (double 1))
def four : Int := twice!(2)
end Unroll
`;
    const added = deus('add', file('uses.deus', uses), ...c);
    expect(added.stderr).toBe('');
    expect(added.code).toBe(0);
    expect(deus('eval', 'Unroll.eight', ...c).stdout.trim()).toBe('8');
    expect(deus('eval', 'Unroll.four', ...c).stdout.trim()).toBe('4');
    // The stored term is the elaborator's output, so it has the hash of the same term written out.
    const hashOf = (name: string) => /#([0-9a-f]+)/.exec(deus('view', name, ...c).stdout)?.[1];
    expect(hashOf('Unroll.eight')).toBe(hashOf('Unroll.eightPlain'));

    const refused = deus(
      'add',
      file('big.deus', 'namespace Unroll\ndef big : Int := times!(500, double, 1)\nend Unroll\n'),
      ...c,
    );
    expect(refused.code).not.toBe(0);
    expect(refused.stderr).toContain('times! unrolls at most 100 calls');
  });
});
