//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';

import {
  Cell,
  Con,
  DeusDefect,
  DeusPanic,
  HashTable,
  Machine,
  NIL,
  NONE,
  Prim,
  type Value,
  compare,
  equal,
  listFrom,
  listTo,
  refTerm,
  show,
  some,
} from './machine.ts';
import { type Sexp, Str, print, readAll } from './sexp.ts';

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

/** A data value back as Core, so the DEUS printer can show it with names; functions are opaque. */
const quoteValue = (value: Value): Sexp => {
  if (typeof value === 'number') {
    return ['int', value];
  }
  if (typeof value === 'string') {
    return ['text', new Str(value)];
  }
  if (typeof value === 'boolean') {
    return ['con', new Str('#Bool'), value ? 1 : 0, 0];
  }
  if (value instanceof Con) {
    const con: Sexp = ['con', new Str(value.type), value.tag, value.fields.length];
    return value.fields.length === 0 ? con : ['app', con, ...value.fields.map(quoteValue)];
  }
  return ['prim', new Str('<function>')];
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
    return (int(a) % int(b)) | 0;
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
  def('implies', 2, ([a, b]) => a !== true || b === true);

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
  def('Text.fromCodes', 1, ([codes]) => {
    // Chunked because spreading a long list into one call overflows V8's argument limit.
    const values = listTo(codes).map(int);
    let out = '';
    for (let start = 0; start < values.length; start += 8192) {
      out += String.fromCharCode(...values.slice(start, start + 8192));
    }
    return out;
  });
  def('Text.utf8', 1, ([s]) => listFrom(Array.from(Buffer.from(text(s), 'utf8'))));

  def('Ref.new', 1, ([v]) => new Cell(v));
  def('Ref.get', 1, ([cell]) => {
    if (!(cell instanceof Cell)) {
      throw new DeusDefect(`expected Ref, got ${show(cell)}`);
    }
    return cell.value;
  });
  def('Ref.set', 2, ([cell, v]) => {
    if (!(cell instanceof Cell)) {
      throw new DeusDefect(`expected Ref, got ${show(cell)}`);
    }
    cell.value = v;
    return new Con('#Unit', 0, []);
  });

  const key = (value: Value): string | number => {
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }
    throw new DeusDefect(`hash map keys are Text or Int, got ${show(value)}`);
  };
  const table = (value: Value, mutable: boolean): Map<string | number, Value> => {
    if (!(value instanceof HashTable) || value.mutable !== mutable) {
      throw new DeusDefect(`expected ${mutable ? 'MutMap' : 'Dict'}, got ${show(value)}`);
    }
    return value.map;
  };
  const optional = (value: Value | undefined): Value => (value === undefined ? NONE : some(value));

  // Dict: built once from pairs (later keys win), then only read, so it stays pure.
  def('Dict.fromList', 1, ([pairs]) => {
    const map = new Map<string | number, Value>();
    for (const item of listTo(pairs)) {
      if (item instanceof Con && item.fields.length === 2) {
        map.set(key(item.fields[0]), item.fields[1]);
      }
    }
    return new HashTable(map, false);
  });
  def('Dict.lookup', 2, ([k, d]) => optional(table(d, false).get(key(k))));
  def('Dict.contains', 2, ([k, d]) => table(d, false).has(key(k)));
  def('Dict.size', 1, ([d]) => table(d, false).size);
  def('Dict.keys', 1, ([d]) => listFrom([...table(d, false).keys()]));

  // MutMap: a mutable hash map, like Ref (not rolled back on multi-shot resumption).
  def('MutMap.new', 1, () => new HashTable(new Map(), true));
  def('MutMap.get', 2, ([m, k]) => optional(table(m, true).get(key(k))));
  def('MutMap.has', 2, ([m, k]) => table(m, true).has(key(k)));
  def('MutMap.set', 3, ([m, k, v]) => {
    table(m, true).set(key(k), v);
    return new Con('#Unit', 0, []);
  });
  def('MutMap.delete', 2, ([m, k]) => {
    table(m, true).delete(key(k));
    return new Con('#Unit', 0, []);
  });
  def('MutMap.size', 1, ([m]) => table(m, true).size);
  def('MutMap.keys', 1, ([m]) => listFrom([...table(m, true).keys()]));

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
    let forms;
    try {
      forms = readAll(text(source));
    } catch (err) {
      throw new DeusPanic(`Code.load: ${err instanceof Error ? err.message : String(err)}`);
    }
    machine.load(forms);
    return new Con('#Unit', 0, []);
  });
  def('Code.quote', 1, ([v]) => print(quoteValue(v)));
  def('Code.has', 1, ([hash], machine) => machine.globals.has(text(hash)));
  def('Code.steps', 1, (_args, machine) => machine.steps);
  def('Code.defectTrace', 1, (_args, machine) => listFrom(machine.defectTrace));
  prims.set(
    'Code.run',
    new Prim(
      'Code.run',
      1,
      () => NIL,
      ([hash]) => refTerm(text(hash)),
    ),
  );

  return prims;
};
