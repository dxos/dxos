//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';

import { Con, DeusDefect, Machine, NIL, NONE, Prim, type Value, compare, equal, listFrom, listTo, refTerm, show, some } from './machine.ts';
import { readAll } from './sexp.ts';

const int = (value: Value): number => {
  if (typeof value !== 'number') {
    throw new DeusDefect(`expected Int, got ${show(value)}`);
  }
  return value;
};

const text = (value: Value): string => {
  if (typeof value !== 'string') {
    throw new DeusDefect(`expected Text, got ${show(value)}`);
  }
  return value;
};

const append = (a: Value, b: Value): Value => {
  if (typeof a === 'string' && typeof b === 'string') {
    return a + b;
  }
  if (b === NIL) {
    return a;
  }
  const items = listTo(a);
  let out = b;
  for (let i = items.length - 1; i >= 0; i--) {
    out = new Con('#List', 1, [items[i], out]);
  }
  return out;
};

const parseInt32 = (value: string): Value => (/^-?[0-9]+$/.test(value) ? some(Number(value) | 0) : NONE);

/**
 * The primitive table. Names are part of Core (`(prim "Int.add")`) and are mirrored by the
 * DEUS front-end's builtin namespace (deus/builtins.deus); keep both in sync.
 */
export const createPrims = (): Map<string, Prim> => {
  const prims = new Map<string, Prim>();
  const def = (name: string, arity: number, fn: (args: Value[], machine: Machine) => Value) =>
    prims.set(name, new Prim(name, arity, fn));

  def('Int.add', 2, ([a, b]) => (int(a) + int(b)) | 0);
  def('Int.sub', 2, ([a, b]) => (int(a) - int(b)) | 0);
  def('Int.mul', 2, ([a, b]) => Math.imul(int(a), int(b)));
  def('Int.div', 2, ([a, b]) => {
    if (int(b) === 0) {
      throw new DeusDefect('division by zero');
    }
    return (int(a) / int(b)) | 0;
  });
  def('Int.mod', 2, ([a, b]) => {
    if (int(b) === 0) {
      throw new DeusDefect('division by zero');
    }
    return int(a) % int(b) | 0;
  });
  def('Int.neg', 1, ([a]) => -int(a) | 0);
  def('Int.and', 2, ([a, b]) => int(a) & int(b));
  def('Int.or', 2, ([a, b]) => int(a) | int(b));
  def('Int.xor', 2, ([a, b]) => int(a) ^ int(b));
  def('Int.shl', 2, ([a, b]) => int(a) << int(b));
  def('Int.shr', 2, ([a, b]) => int(a) >> int(b));
  def('Int.ushr', 2, ([a, b]) => (int(a) >>> int(b)) | 0);
  def('Int.toText', 1, ([a]) => String(int(a)));
  def('Int.fromText', 1, ([a]) => parseInt32(text(a)));

  def('eq', 2, ([a, b]) => equal(a, b));
  def('neq', 2, ([a, b]) => !equal(a, b));
  def('compare', 2, ([a, b]) => compare(a, b));
  def('lt', 2, ([a, b]) => (typeof a === 'number' && typeof b === 'number' ? a < b : compare(a, b) < 0));
  def('le', 2, ([a, b]) => (typeof a === 'number' && typeof b === 'number' ? a <= b : compare(a, b) <= 0));
  def('gt', 2, ([a, b]) => (typeof a === 'number' && typeof b === 'number' ? a > b : compare(a, b) > 0));
  def('ge', 2, ([a, b]) => (typeof a === 'number' && typeof b === 'number' ? a >= b : compare(a, b) >= 0));
  def('append', 2, ([a, b]) => append(a, b));

  def('Text.length', 1, ([s]) => text(s).length);
  def('Text.code', 2, ([s, i]) => {
    const value = text(s);
    const index = int(i);
    return index >= 0 && index < value.length ? value.charCodeAt(index) : -1;
  });
  def('Text.slice', 3, ([s, i, j]) => text(s).slice(int(i), int(j)));
  def('Text.fromCode', 1, ([c]) => String.fromCharCode(int(c)));
  def('Text.concat', 1, ([parts]) => listTo(parts).map(text).join(''));
  def('Text.join', 2, ([sep, parts]) => listTo(parts).map(text).join(text(sep)));
  def('Text.split', 2, ([s, sep]) => listFrom(text(s).split(text(sep))));
  def('Text.indexOf', 3, ([s, sub, from]) => text(s).indexOf(text(sub), int(from)));
  def('Text.trim', 1, ([s]) => text(s).trim());
  def('Text.sha256', 1, ([s]) => createHash('sha256').update(text(s), 'utf8').digest('hex'));
  def('Text.fromCodes', 1, ([codes]) => String.fromCharCode(...listTo(codes).map(int)));
  def('Text.utf8', 1, ([s]) => listFrom(Array.from(Buffer.from(text(s), 'utf8'))));

  def('show', 1, ([v]) => show(v));
  def('trace', 2, ([label, v]) => {
    process.stderr.write(`trace ${text(label)}: ${show(v)}\n`);
    return v;
  });
  def('defect', 1, ([message]) => {
    throw new DeusDefect(text(message));
  });

  // Reflection: the DEUS CLI loads compiled definitions into this same machine and runs them, so
  // user programs share the caller's handlers (including IO).
  def('Code.load', 1, ([source], machine) => {
    machine.load(readAll(text(source)));
    return new Con('#Unit', 0, []);
  });
  def('Code.has', 1, ([hash], machine) => machine.globals.has(text(hash)));
  def('Code.steps', 1, (_args, machine) => machine.steps);
  prims.set(
    'Code.run',
    new Prim('Code.run', 1, () => NIL, ([hash]) => refTerm(text(hash))),
  );

  return prims;
};
