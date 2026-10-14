//
// Copyright 2026 DXOS.org
//

// The runtime of modules written by `deus build --js` (D97, docs/spec/JS.mdl). `deus build`
// copies this file next to the module it writes, so it has no imports and runs in Node and in
// browsers as it is. Value equality, order and `show` follow the TypeScript kernel
// (src/kernel/machine.ts), so a program prints the same on both.

//
// Values.
//

/** A constructor application: `type` is the type's hash (or builtin IRI), `tag` its index. */
export class Con {
  constructor(type, tag, fields) {
    this.type = type;
    this.tag = tag;
    this.fields = fields;
  }
}

/** A mutable cell (`Ref`). */
export class Cell {
  constructor(value) {
    this.value = value;
  }
}

/** `Dict` and `MutMap`: a `Map` keyed by text or integer. */
export class Table {
  constructor(map, mutable) {
    this.map = map;
    this.mutable = mutable;
  }
}

/** A defect: the program is wrong. `trace` names the DEUS definitions on the stack, innermost first. */
export class DeusDefect extends Error {
  constructor(message) {
    super(message);
    this.name = 'DeusDefect';
  }
}

/** `IO.exit n`, unwinding to the export that was called. */
export class DeusExit extends Error {
  constructor(code) {
    super(`exit ${code}`);
    this.name = 'DeusExit';
    this.code = code;
  }
}

export const NIL = new Con('#List', 0, []);
export const NONE = new Con('#Option', 0, []);
export const cons = (head, tail) => new Con('#List', 1, [head, tail]);
export const some = (value) => new Con('#Option', 1, [value]);
export const pair = (a, b) => new Con('#Pair', 0, [a, b]);

/** A DEUS list from a JavaScript array. */
export const list = (items) => {
  let out = NIL;
  for (let i = items.length - 1; i >= 0; i--) {
    out = cons(items[i], out);
  }
  return out;
};

/** A JavaScript array from a DEUS list. */
export const array = (value) => {
  const out = [];
  while (value instanceof Con && value.type === '#List' && value.tag === 1) {
    out.push(value.fields[0]);
    value = value.fields[1];
  }
  return out;
};

const nullaries = new Map();

/** The shared value of a nullary constructor. */
export const con0 = (type, tag) => {
  const key = `${type}/${tag}`;
  let value = nullaries.get(key);
  if (value === undefined) {
    value = new Con(type, tag, []);
    nullaries.set(key, value);
  }
  return value;
};

/** Gives a compiled function its DEUS name, which stack traces show. */
export const named = (fn, name) => {
  Object.defineProperty(fn, 'name', { value: name });
  return fn;
};

/** A definition that is not a function: evaluated once, on first use. */
export const lazy = (name, compute) => {
  let state = 0;
  let value;
  return named(() => {
    if (state === 2) {
      return value;
    }
    if (state === 1) {
      throw new DeusDefect(`${name} needs its own value while it is being evaluated`);
    }
    state = 1;
    try {
      value = compute();
    } catch (err) {
      state = 0;
      throw err;
    }
    state = 2;
    return value;
  }, name);
};

//
// Application.
//

const PAPS = [
  (f, a) => () => f(...a),
  (f, a) => (x) => f(...a, x),
  (f, a) => (x, y) => f(...a, x, y),
  (f, a) => (x, y, z) => f(...a, x, y, z),
  (f, a) => (x, y, z, w) => f(...a, x, y, z, w),
];

/** A function of `arity` arguments that calls `fn` with all of them. */
export const fixed = (arity, fn) => {
  if (arity < PAPS.length) {
    return PAPS[arity](fn, []);
  }
  const out = (...args) => fn(...args);
  Object.defineProperty(out, 'length', { value: arity });
  return out;
};

/** Applies `f` to `args` as Core does: fewer arguments than its arity make a partial application. */
export const ap = (f, ...args) => {
  while (true) {
    if (typeof f !== 'function') {
      throw new DeusDefect(`cannot apply ${show(f)}`);
    }
    const arity = f.length;
    if (args.length === arity) {
      return f(...args);
    }
    if (args.length < arity) {
      const missing = arity - args.length;
      const taken = args;
      return missing < PAPS.length ? PAPS[missing](f, taken) : fixed(missing, (...rest) => f(...taken, ...rest));
    }
    f = f(...args.slice(0, arity));
    args = args.slice(arity);
  }
};

/** A constructor as a function of its fields. */
export const conFn = (type, tag, arity) => fixed(arity, (...fields) => new Con(type, tag, fields));

/** An operation as a function of its arguments. */
export const opFn = (ability, index, arity) => fixed(arity, (...args) => perform(ability, index, args));

//
// Handlers (docs/spec/JS.mdl#handlers): a stack of frames. A resumptive clause runs where the
// request is made, outside its handler; an abortive one unwinds to its `handle` by exception.
//

const RESUME = 0;
const ABORT = 1;
export { ABORT, RESUME };

let handlers = null;

class Abort {
  constructor(frame, clause, args) {
    this.frame = frame;
    this.clause = clause;
    this.args = args;
  }
}

/**
 * Evaluates `body` under a handler. `clauses` are `[abilityHash, index, kind, fn]`; `ret` maps the
 * body's value, or is null.
 */
export const handle = (clauses, ret, body) => {
  const saved = handlers;
  const frame = { clauses, next: saved };
  handlers = frame;
  let value;
  try {
    value = body();
  } catch (err) {
    handlers = saved;
    if (err instanceof Abort && err.frame === frame) {
      return err.clause[3](...err.args);
    }
    if (!(err instanceof Abort) && !(err instanceof DeusExit)) {
      const clause = clauses.find((c) => c[0] === '#Defect' && c[1] === 0);
      if (clause) {
        return clause[3](defectMessage(err), undefined);
      }
    }
    throw err;
  } finally {
    handlers = saved;
  }
  return ret === null ? value : ret(value);
};

const defectMessage = (err) =>
  err instanceof DeusDefect ? err.message : err instanceof Error ? `${err.name}: ${err.message}` : String(err);

/** Performs operation `index` of `ability` with `args`. */
export const perform = (ability, index, args) => {
  for (let frame = handlers; frame !== null; frame = frame.next) {
    for (const clause of frame.clauses) {
      if (clause[1] === index && clause[0] === ability) {
        if (clause[2] === ABORT) {
          throw new Abort(frame, clause, args);
        }
        const saved = handlers;
        handlers = frame.next;
        try {
          return clause[3](...args, undefined);
        } finally {
          handlers = saved;
        }
      }
    }
  }
  return host(ability, index, args);
};

/** Abilities the module uses: hash to IRI and operation names, written by the compiler. */
const abilities = new Map();

export const ability = (hash, iri, ops) => {
  abilities.set(hash, { iri, ops });
};

const provided = new Map();

/**
 * Answers an ability no DEUS handler catches: `impl` has one function per operation name, called with
 * the operation's arguments as DEUS values.
 */
export const provide = (iri, impl) => {
  provided.set(iri, impl);
};

const host = (ability, index, args) => {
  if (ability === '#IO') {
    return io(index, args);
  }
  if (ability === '#Defect') {
    throw new DeusDefect(args[0]);
  }
  const known = abilities.get(ability);
  const impl = known && provided.get(known.iri);
  const op = impl && impl[known.ops[index]];
  if (typeof op === 'function') {
    return op(...args);
  }
  throw new DeusDefect(`unhandled ability ${known ? known.iri : ability} operation ${index}`);
};

const nodeProcess = globalThis.process;
const started = Date.now();

const write = (stream, chunk) => {
  if (nodeProcess?.[stream]?.write) {
    nodeProcess[stream].write(chunk);
  } else {
    (stream === 'stdout' ? console.log : console.error)(chunk.replace(/\n$/, ''));
  }
};

const io = (index, args) => {
  switch (index) {
    case 0:
      write('stdout', args[0]);
      return undefined;
    case 1:
      write('stderr', args[0]);
      return undefined;
    case 9:
      throw new DeusExit(args[0]);
    case 10:
      return (Date.now() - started) | 0;
    case 13: {
      const value = nodeProcess?.env?.[args[0]];
      return value === undefined ? NONE : some(value);
    }
    case 15:
      return `${BigInt(Date.now()) * 1000000n}`;
    default:
      throw new DeusDefect(`IO operation ${index} is not available on the js target`);
  }
};

//
// Equality, order, show.
//

/** Structural equality over data; functions are never equal. */
export const equal = (a, b) => {
  while (true) {
    if (a === b) {
      return true;
    }
    if (!(a instanceof Con) || !(b instanceof Con)) {
      return false;
    }
    if (a.tag !== b.tag || a.type !== b.type || a.fields.length !== b.fields.length) {
      return false;
    }
    const n = a.fields.length;
    if (n === 0) {
      return true;
    }
    for (let i = 0; i < n - 1; i++) {
      if (!equal(a.fields[i], b.fields[i])) {
        return false;
      }
    }
    a = a.fields[n - 1];
    b = b.fields[n - 1];
  }
};

const rank = (value) =>
  typeof value === 'boolean'
    ? 0
    : typeof value === 'number'
      ? 1
      : typeof value === 'string'
        ? 2
        : value instanceof Con || value === undefined
          ? 3
          : 4;

/** Total structural order: -1, 0 or 1. */
export const compare = (a, b) => {
  while (true) {
    if (a === b) {
      return 0;
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a < b ? -1 : 1;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a ? 1 : -1;
    }
    if (a instanceof Con && b instanceof Con) {
      if (a.tag !== b.tag) {
        return a.tag < b.tag ? -1 : 1;
      }
      const n = Math.min(a.fields.length, b.fields.length);
      if (n === 0) {
        return a.fields.length - b.fields.length;
      }
      for (let i = 0; i < n - 1; i++) {
        const c = compare(a.fields[i], b.fields[i]);
        if (c !== 0) {
          return c;
        }
      }
      a = a.fields[n - 1];
      b = b.fields[n - 1];
      continue;
    }
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) {
      return ra < rb ? -1 : 1;
    }
    throw new DeusDefect('cannot compare functions');
  }
};

/** Debug rendering of a value, as the kernels' `show`. */
export const show = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value === undefined) {
    return '()';
  }
  if (value instanceof Con) {
    if (value.type === '#List') {
      return '[' + array(value).map(show).join(', ') + ']';
    }
    if (value.type === '#Unit') {
      return '()';
    }
    if (value.type === '#Pair') {
      return `(${show(value.fields[0])}, ${show(value.fields[1])})`;
    }
    if (value.type === '#Option') {
      return value.tag === 0 ? 'none' : `(some ${show(value.fields[0])})`;
    }
    const name = `${value.type.slice(0, 8)}#${value.tag}`;
    return value.fields.length === 0 ? name : `(${name} ${value.fields.map(show).join(' ')})`;
  }
  return '<function>';
};

const quoteText = (text) => {
  let out = '"';
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 34) {
      out += '\\"';
    } else if (c === 92) {
      out += '\\\\';
    } else if (c === 10) {
      out += '\\n';
    } else if (c === 9) {
      out += '\\t';
    } else if (c === 13) {
      out += '\\r';
    } else if (c < 32 || c === 127) {
      out += '\\u' + c.toString(16).padStart(4, '0');
    } else {
      out += text[i];
    }
  }
  return out + '"';
};

/** A data value as canonical Core text, as `Code.quote` writes it; a function is `(prim "<function>")`. */
export const quote = (value) => {
  if (typeof value === 'number') {
    return `(int ${value})`;
  }
  if (typeof value === 'string') {
    return `(text ${quoteText(value)})`;
  }
  if (typeof value === 'boolean') {
    return `(con "#Bool" ${value ? 1 : 0} 0)`;
  }
  if (value === undefined) {
    return '(con "#Unit" 0 0)';
  }
  if (value instanceof Con) {
    const head = `(con ${quoteText(value.type)} ${value.tag} ${value.fields.length})`;
    return value.fields.length === 0 ? head : `(app ${head} ${value.fields.map(quote).join(' ')})`;
  }
  return '(prim "<function>")';
};

//
// Primitives. Inline arithmetic is emitted by the compiler; these are the rest, by Core name.
//

const int = (value) => {
  if (typeof value !== 'number') {
    throw new DeusDefect(`expected Int, got ${show(value)}`);
  }
  return value;
};

const text = (value) => {
  if (typeof value !== 'string') {
    throw new DeusDefect(`expected Text, got ${show(value)}`);
  }
  return value;
};

export const div = (a, b) => {
  if (b === 0) {
    throw new DeusDefect('division by zero');
  }
  return (a / b) | 0;
};

export const mod = (a, b) => {
  if (b === 0) {
    throw new DeusDefect('division by zero');
  }
  return (a % b) | 0;
};

export const nomatch = (value) => {
  throw new DeusDefect(`no match for ${show(value)}`);
};

const append = (a, b) => {
  if (typeof a === 'string' && typeof b === 'string') {
    return a + b;
  }
  if (b === NIL) {
    return a;
  }
  const items = array(a);
  let out = b;
  for (let i = items.length - 1; i >= 0; i--) {
    out = cons(items[i], out);
  }
  return out;
};

const cell = (value) => {
  if (!(value instanceof Cell)) {
    throw new DeusDefect(`expected Ref, got ${show(value)}`);
  }
  return value;
};

const vector = (value, index, name) => {
  if (!Array.isArray(value)) {
    throw new DeusDefect(`expected Array, got ${show(value)}`);
  }
  if (index < 0 || index >= value.length) {
    throw new DeusDefect(`${name}: index ${index} out of bounds 0 .. ${value.length}`);
  }
  return value;
};

const key = (value) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  throw new DeusDefect(`hash map keys are Text or Int, got ${show(value)}`);
};

const table = (value, mutable) => {
  if (!(value instanceof Table) || value.mutable !== mutable) {
    throw new DeusDefect(`expected ${mutable ? 'MutMap' : 'Dict'}, got ${show(value)}`);
  }
  return value.map;
};

const optional = (value) => (value === undefined ? NONE : some(value));

const fromCodes = (codes) => {
  const units = [];
  for (const value of array(codes).map(int)) {
    if (value < 0 || value > 0x10ffff) {
      throw new DeusDefect(`Text.fromCodes: ${value} is not a code point`);
    }
    if (value > 0xffff) {
      units.push(0xd800 + ((value - 0x10000) >> 10), 0xdc00 + ((value - 0x10000) & 0x3ff));
    } else {
      units.push(value);
    }
  }
  let out = '';
  for (let start = 0; start < units.length; start += 8192) {
    out += String.fromCharCode(...units.slice(start, start + 8192));
  }
  return out;
};

const utf8 = (s) => Array.from(new TextEncoder().encode(s.replace(/[\ud800-\udfff]/g, (c, i, all) => c)));

// SHA-256 over UTF-8, synchronous so it runs where `crypto.subtle` (async) is all there is.
const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
]);

const sha256 = (s) => {
  const bytes = new TextEncoder().encode(s);
  const length = bytes.length;
  const padded = new Uint8Array(((length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(length / 0x20000000));
  view.setUint32(padded.length - 4, length << 3);
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('');
};

const prim = (arity, fn) => fixed(arity, fn);

/** Every primitive by its Core name, as a function of its arity. */
export const prims = {
  'Int.add': prim(2, (a, b) => (int(a) + int(b)) | 0),
  'Int.sub': prim(2, (a, b) => (int(a) - int(b)) | 0),
  'Int.mul': prim(2, (a, b) => Math.imul(int(a), int(b))),
  'Int.div': prim(2, (a, b) => div(int(a), int(b))),
  'Int.mod': prim(2, (a, b) => mod(int(a), int(b))),
  'Int.neg': prim(1, (a) => -int(a) | 0),
  'Int.and': prim(2, (a, b) => int(a) & int(b)),
  'Int.or': prim(2, (a, b) => int(a) | int(b)),
  'Int.xor': prim(2, (a, b) => int(a) ^ int(b)),
  'Int.shl': prim(2, (a, b) => int(a) << int(b)),
  'Int.shr': prim(2, (a, b) => int(a) >> int(b)),
  'Int.ushr': prim(2, (a, b) => (int(a) >>> int(b)) | 0),
  'Int.toText': prim(1, (a) => String(int(a))),
  'Int.fromText': prim(1, (a) => (/^-?[0-9]+$/.test(text(a)) ? some(Number(a) | 0) : NONE)),
  'eq': prim(2, (a, b) => equal(a, b)),
  'neq': prim(2, (a, b) => !equal(a, b)),
  'compare': prim(2, (a, b) => compare(a, b)),
  'lt': prim(2, (a, b) => (typeof a === 'number' && typeof b === 'number' ? a < b : compare(a, b) < 0)),
  'le': prim(2, (a, b) => (typeof a === 'number' && typeof b === 'number' ? a <= b : compare(a, b) <= 0)),
  'gt': prim(2, (a, b) => (typeof a === 'number' && typeof b === 'number' ? a > b : compare(a, b) > 0)),
  'ge': prim(2, (a, b) => (typeof a === 'number' && typeof b === 'number' ? a >= b : compare(a, b) >= 0)),
  'append': prim(2, append),
  'implies': prim(2, (a, b) => a !== true || b === true),
  'Text.length': prim(1, (s) => text(s).length),
  'Text.code': prim(2, (s, i) => (int(i) >= 0 && i < text(s).length ? s.charCodeAt(i) : -1)),
  'Text.slice': prim(3, (s, i, j) => text(s).slice(int(i), int(j))),
  'Text.fromCode': prim(1, (c) => String.fromCharCode(int(c))),
  'Text.fromCodes': prim(1, fromCodes),
  'Text.concat': prim(1, (parts) => array(parts).map(text).join('')),
  'Text.join': prim(2, (sep, parts) => array(parts).map(text).join(text(sep))),
  'Text.split': prim(2, (s, sep) => list(text(s).split(text(sep)))),
  'Text.indexOf': prim(3, (s, sub, from) => text(s).indexOf(text(sub), int(from))),
  'Text.trim': prim(1, (s) => text(s).trim()),
  'Text.sha256': prim(1, (s) => sha256(text(s))),
  'Text.utf8': prim(1, (s) => list(utf8(text(s)))),
  'show': prim(1, show),
  'trace': prim(2, (label, value) => {
    write('stderr', `trace ${text(label)}: ${show(value)}\n`);
    return value;
  }),
  'defect': prim(1, (message) => {
    throw new DeusDefect(text(message));
  }),
  'Ref.new': prim(1, (value) => new Cell(value)),
  'Ref.get': prim(1, (r) => cell(r).value),
  'Ref.set': prim(2, (r, value) => {
    cell(r).value = value;
    return undefined;
  }),
  'Array.make': prim(2, (n, value) => {
    if (int(n) < 0) {
      throw new DeusDefect(`Array.make: negative length ${n}`);
    }
    return new Array(n).fill(value);
  }),
  'Array.length': prim(1, (a) => vector(a, 0, 'Array.length').length),
  'Array.get': prim(2, (a, i) => vector(a, int(i), 'Array.get')[i]),
  'Array.set': prim(3, (a, i, value) => {
    vector(a, int(i), 'Array.set')[i] = value;
    return undefined;
  }),
  'Dict.fromList': prim(1, (pairs) => {
    const map = new Map();
    for (const item of array(pairs)) {
      map.set(key(item.fields[0]), item.fields[1]);
    }
    return new Table(map, false);
  }),
  'Dict.lookup': prim(2, (k, d) => optional(table(d, false).get(key(k)))),
  'Dict.contains': prim(2, (k, d) => table(d, false).has(key(k))),
  'Dict.size': prim(1, (d) => table(d, false).size),
  'Dict.keys': prim(1, (d) => list([...table(d, false).keys()])),
  'MutMap.new': prim(1, () => new Table(new Map(), true)),
  'MutMap.get': prim(2, (m, k) => optional(table(m, true).get(key(k)))),
  'MutMap.has': prim(2, (m, k) => table(m, true).has(key(k))),
  'MutMap.set': prim(3, (m, k, value) => {
    table(m, true).set(key(k), value);
    return undefined;
  }),
  'MutMap.delete': prim(2, (m, k) => {
    table(m, true).delete(key(k));
    return undefined;
  }),
  'MutMap.size': prim(1, (m) => table(m, true).size),
  'MutMap.keys': prim(1, (m) => list([...table(m, true).keys()])),
};

// `Array.length` checks index 0, which an empty array fails; give it its own check.
prims['Array.length'] = prim(1, (a) => {
  if (!Array.isArray(a)) {
    throw new DeusDefect(`expected Array, got ${show(a)}`);
  }
  return a.length;
});

//
// Codecs (docs/spec/JS.mdl#foreign-imports): descriptors the compiler writes from DEUS types.
//
//   ['int'] ['text'] ['bool'] ['unit'] ['raw']
//   ['list', d] ['option', d] ['tuple', [d…]] ['struct', typeHash, ['field'…], [d…]] ['fn', [d…], d]
//

/** A DEUS value as JavaScript. */
export const toJs = (desc, value) => {
  switch (desc[0]) {
    case 'unit':
      return undefined;
    case 'list':
      return array(value).map((item) => toJs(desc[1], item));
    case 'option':
      return value.tag === 0 ? undefined : toJs(desc[1], value.fields[0]);
    case 'tuple': {
      const out = [];
      let rest = value;
      desc[1].forEach((item, i) => {
        if (i === desc[1].length - 1) {
          out.push(toJs(item, rest));
        } else {
          out.push(toJs(item, rest.fields[0]));
          rest = rest.fields[1];
        }
      });
      return out;
    }
    case 'struct': {
      const out = {};
      desc[2].forEach((field, i) => {
        out[field] = toJs(desc[3][i], value.fields[i]);
      });
      return out;
    }
    case 'fn': {
      const [, params, result] = desc;
      return fixed(params.length, (...args) =>
        toJs(result, ap(value, ...params.map((param, i) => fromJs(param, args[i])))),
      );
    }
    default:
      return value;
  }
};

/** A JavaScript value as DEUS. */
export const fromJs = (desc, value) => {
  switch (desc[0]) {
    case 'int':
      return Number(value) | 0;
    case 'text':
      return typeof value === 'string' ? value : String(value ?? '');
    case 'bool':
      return Boolean(value);
    case 'unit':
      return undefined;
    case 'list':
      return list(Array.from(value ?? [], (item) => fromJs(desc[1], item)));
    case 'option':
      return value === undefined || value === null ? NONE : some(fromJs(desc[1], value));
    case 'tuple': {
      const items = desc[1].map((item, i) => fromJs(item, value[i]));
      let out = items[items.length - 1];
      for (let i = items.length - 2; i >= 0; i--) {
        out = pair(items[i], out);
      }
      return out;
    }
    case 'struct':
      return new Con(
        desc[1],
        0,
        desc[2].map((field, i) => fromJs(desc[3][i], value?.[field])),
      );
    case 'fn': {
      const [, params, result] = desc;
      if (typeof value !== 'function') {
        throw new DeusDefect(`expected a JavaScript function, got ${typeof value}`);
      }
      return fixed(params.length, (...args) =>
        fromJs(result, value(...params.map((param, i) => toJs(param, args[i])))),
      );
    }
    default:
      return value;
  }
};

//
// Foreign imports and exports.
//

const resolve = (module, path) => {
  let owner = undefined;
  let value = module;
  for (const segment of path === '' ? [] : path.split('.')) {
    owner = value;
    value = value?.[segment];
  }
  return { owner, value };
};

/** A DEUS function of `params.length` arguments that calls `module.path` through codecs. */
export const importFn = (module, path, params, result, name) =>
  named(
    fixed(params.length, (...args) => {
      const { owner, value } = resolve(module, path);
      if (typeof value !== 'function') {
        throw new DeusDefect(`${path} is not a JavaScript function`);
      }
      return fromJs(
        result,
        value.apply(
          owner,
          params.map((param, i) => toJs(param, args[i])),
        ),
      );
    }),
    name,
  );

/** The value at `module.path`, read once through its codec. */
export const importValue = (module, path, desc, name) => lazy(name, () => fromJs(desc, resolve(module, path).value));

/** A JavaScript function for an exported DEUS function. */
export const exportFn = (fn, params, result) =>
  fixed(params.length, (...args) => toJs(result, fn(...params.map((param, i) => fromJs(param, args[i])))));

//
// The `Js` library's own imports (platform/js/js.deus): module "deus:runtime".
//

export const js = {
  get: (object, key) => object?.[key],
  set: (object, key, value) => {
    object[key] = value;
    return object;
  },
  call: (fn, args) => fn(...args),
  method: (object, key, args) => object[key](...args),
  construct: (ctor, args) => new ctor(...args),
  object: (pairs) => Object.fromEntries(pairs),
  array: (items) => items,
  identity: (value) => value,
  /** One identity per `Js` conversion, so each binding has its own path and so its own hash and codec. */
  as: Object.fromEntries(
    [
      'text',
      'int',
      'bool',
      'list',
      'fn0',
      'fn1',
      'fn',
      'fn2',
      'toText',
      'toInt',
      'toBool',
      'toList',
      'toOption',
      'wrap',
      'unwrap',
    ].map((name) => [name, (value) => value]),
  ),
  isNull: (value) => value === null || value === undefined,
  typeOf: (value) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value),
  stringify: (value) => JSON.stringify(value) ?? 'undefined',
  parse: (source) => JSON.parse(source),
  keys: (object) => Object.keys(object ?? {}),
  undefined: undefined,
  null: null,
  log: (value) => {
    console.log(value);
  },
  component: (name, fn) => {
    fn.displayName = name;
    return named(fn, name);
  },
};
