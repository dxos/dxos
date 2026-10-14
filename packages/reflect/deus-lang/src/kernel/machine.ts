//
// Copyright 2026 DXOS.org
//

import { type Sexp, Str, print } from './sexp.ts';

//
// Values.
//

/** A constructor application; `Bool` is a JS boolean and `Unit` is {@link UNIT}. */
export class Con {
  readonly type: string;
  readonly tag: number;
  readonly fields: Value[];

  constructor(type: string, tag: number, fields: Value[]) {
    this.type = type;
    this.tag = tag;
    this.fields = fields;
  }
}

export type Env = { value: Value; next: Env } | null;

export class Closure {
  readonly lam: LamTerm;
  readonly env: Env;

  constructor(lam: LamTerm, env: Env) {
    this.lam = lam;
    this.env = env;
  }
}

/** Something that becomes a call once it has `arity` arguments. */
export type Callable = Prim | ConFn | OpFn;

export class Prim {
  readonly name: string;
  readonly arity: number;
  readonly fn: (args: Value[], machine: Machine) => Value;
  /** Replaces the machine's control with a term to evaluate (e.g. `Code.run`) instead of returning a value. */
  readonly control?: (args: Value[], machine: Machine) => Term;

  constructor(
    name: string,
    arity: number,
    fn: (args: Value[], machine: Machine) => Value,
    control?: (args: Value[], machine: Machine) => Term,
  ) {
    this.name = name;
    this.arity = arity;
    this.fn = fn;
    this.control = control;
  }
}

export class ConFn {
  readonly type: string;
  readonly tag: number;
  readonly arity: number;

  constructor(type: string, tag: number, arity: number) {
    this.type = type;
    this.tag = tag;
    this.arity = arity;
  }
}

export class OpFn {
  readonly ability: string;
  readonly index: number;
  readonly arity: number;

  constructor(ability: string, index: number, arity: number) {
    this.ability = ability;
    this.index = index;
    this.arity = arity;
  }
}

export class Pap {
  readonly fn: Closure | Callable;
  readonly args: Value[];

  constructor(fn: Closure | Callable, args: Value[]) {
    this.fn = fn;
    this.args = args;
  }
}

/** A mutable cell (`Ref.new`); compared by identity. */
export class Cell {
  value: Value;

  constructor(value: Value) {
    this.value = value;
  }
}

/** A captured, re-entrant stack segment (deep handler included). */
export class Continuation {
  readonly frames: Frame[];

  constructor(frames: Frame[]) {
    this.frames = frames;
  }
}

export type Value = number | string | boolean | Con | Closure | Callable | Pap | Continuation | Cell;

export const UNIT = new Con('#Unit', 0, []);
export const NIL = new Con('#List', 0, []);
export const NONE = new Con('#Option', 0, []);
export const cons = (head: Value, tail: Value): Con => new Con('#List', 1, [head, tail]);
export const some = (value: Value): Con => new Con('#Option', 1, [value]);
export const pair = (first: Value, second: Value): Con => new Con('#Pair', 0, [first, second]);

export const listFrom = (values: Value[]): Value => {
  let out: Value = NIL;
  for (let i = values.length - 1; i >= 0; i--) {
    out = cons(values[i], out);
  }
  return out;
};

export const listTo = (list: Value): Value[] => {
  const out: Value[] = [];
  let cell = list;
  while (cell instanceof Con && cell.tag === 1) {
    out.push(cell.fields[0]);
    cell = cell.fields[1];
  }
  return out;
};

/**
 * A defect: the DEUS program is wrong (failed match, division by zero, `defect "…"`). The machine
 * turns it into a request on the built-in `#Defect` ability so a boundary handler can observe it.
 */
export class DeusDefect extends Error {}

/** A panic: the kernel itself is broken (an invariant of the image or the machine failed). */
export class DeusPanic extends Error {}

/** The built-in ability that carries defects; operation 0 takes the message. */
export const DEFECT = '#Defect';

//
// Terms.
//

const VAR = 0;
const CONST = 1;
const REF = 2;
const LAM = 3;
const APP = 4;
const LET = 5;
const SEQ = 6;
const LETREC = 7;
const IF = 8;
const MATCH = 9;
const HANDLE = 10;

export type LamTerm = { t: typeof LAM; n: number; body: Term };
type Clause = { arity: number; body: Term };
type Case = { pat: Pat; guard: Term | null; body: Term };

export type Term =
  | { t: typeof VAR; i: number }
  | { t: typeof CONST; v: Value }
  | { t: typeof REF; h: string }
  | LamTerm
  | { t: typeof APP; f: Term; args: Term[] }
  | { t: typeof LET; v: Term; b: Term }
  | { t: typeof SEQ; a: Term; b: Term }
  | { t: typeof LETREC; vs: LamTerm[]; b: Term }
  | { t: typeof IF; c: Term; th: Term; el: Term }
  | { t: typeof MATCH; s: Term; cases: Case[] }
  | { t: typeof HANDLE; b: Term; ret: Term | null; clauses: Map<string, Clause> };

/** A reference to a global definition. */
export const refTerm = (hash: string): Term => ({ t: REF, h: hash });

const P_ANY = 0;
const P_VAR = 1;
const P_AS = 2;
const P_LIT = 3;
const P_CON = 4;

type Pat =
  | { k: typeof P_ANY }
  | { k: typeof P_VAR }
  | { k: typeof P_AS; p: Pat }
  | { k: typeof P_LIT; v: number | string }
  | { k: typeof P_CON; type: string; tag: number; ps: Pat[] };

const str = (form: Sexp): string => {
  if (form instanceof Str) {
    return form.value;
  }
  throw new Error(`core: expected string, got ${print(form)}`);
};

const int = (form: Sexp): number => {
  if (typeof form === 'number') {
    return form;
  }
  throw new Error(`core: expected int, got ${print(form)}`);
};

const list = (form: Sexp): Sexp[] => {
  if (Array.isArray(form)) {
    return form;
  }
  throw new Error(`core: expected list, got ${print(form)}`);
};

const conValue = (type: string, tag: number, arity: number): Value => {
  if (arity > 0) {
    return new ConFn(type, tag, arity);
  }
  if (type === '#Bool') {
    return tag === 1;
  }
  if (type === '#Unit') {
    return UNIT;
  }
  if (type === '#List') {
    return NIL;
  }
  if (type === '#Option') {
    return NONE;
  }
  return new Con(type, tag, []);
};

const compilePat = (form: Sexp): Pat => {
  const parts = list(form);
  switch (parts[0]) {
    case 'pany':
      return { k: P_ANY };
    case 'pvar':
      return { k: P_VAR };
    case 'pas':
      return { k: P_AS, p: compilePat(parts[1]) };
    case 'pint':
      return { k: P_LIT, v: int(parts[1]) };
    case 'ptext':
      return { k: P_LIT, v: str(parts[1]) };
    case 'pcon':
      return { k: P_CON, type: str(parts[1]), tag: int(parts[2]), ps: parts.slice(3).map(compilePat) };
    default:
      throw new Error(`core: unknown pattern ${print(form)}`);
  }
};

/** Compiles one canonical Core term (see docs/CORE.md) into the machine's representation. */
export const compileTerm = (form: Sexp, prims: Map<string, Prim>): Term => {
  const go = (form: Sexp): Term => compileTerm(form, prims);
  const parts = list(form);
  switch (parts[0]) {
    case 'var':
      return { t: VAR, i: int(parts[1]) };
    case 'ref':
      return { t: REF, h: str(parts[1]) };
    case 'int':
      return { t: CONST, v: int(parts[1]) };
    case 'text':
      return { t: CONST, v: str(parts[1]) };
    case 'lam': {
      // Nested unary lambdas become one n-ary lambda; currying is preserved by `apply`.
      let n = 1;
      let body = parts[1];
      while (Array.isArray(body) && body[0] === 'lam') {
        n++;
        body = body[1];
      }
      return { t: LAM, n, body: go(body) };
    }
    case 'app':
      return { t: APP, f: go(parts[1]), args: parts.slice(2).map(go) };
    case 'let':
      return { t: LET, v: go(parts[1]), b: go(parts[2]) };
    case 'seq':
      return { t: SEQ, a: go(parts[1]), b: go(parts[2]) };
    case 'letrec': {
      const vs: LamTerm[] = [];
      for (const binding of list(parts[1])) {
        const v = go(binding);
        if (v.t !== LAM) {
          throw new Error('core: letrec binds lambdas only');
        }
        vs.push(v);
      }
      return { t: LETREC, vs, b: go(parts[2]) };
    }
    case 'if':
      return { t: IF, c: go(parts[1]), th: go(parts[2]), el: go(parts[3]) };
    case 'con':
      return { t: CONST, v: conValue(str(parts[1]), int(parts[2]), int(parts[3])) };
    case 'op':
      return { t: CONST, v: new OpFn(str(parts[1]), int(parts[2]), int(parts[3])) };
    case 'prim': {
      const name = str(parts[1]);
      const prim = prims.get(name);
      if (!prim) {
        throw new Error(`core: unknown primitive ${name}`);
      }
      return { t: CONST, v: prim };
    }
    case 'match':
      return {
        t: MATCH,
        s: go(parts[1]),
        cases: parts.slice(2).map((form) => {
          const c = list(form);
          return c[0] === 'gcase'
            ? { pat: compilePat(c[1]), guard: go(c[2]), body: go(c[3]) }
            : { pat: compilePat(c[1]), guard: null, body: go(c[2]) };
        }),
      };
    case 'handle': {
      let ret: Term | null = null;
      const clauses = new Map<string, Clause>();
      for (const form of parts.slice(2)) {
        const c = list(form);
        if (c[0] === 'ret') {
          ret = go(c[1]);
        } else {
          clauses.set(`${str(c[1])}/${int(c[2])}`, { arity: int(c[3]), body: go(c[4]) });
        }
      }
      return { t: HANDLE, b: go(parts[1]), ret, clauses };
    }
    default:
      throw new Error(`core: unknown term ${print(form).slice(0, 80)}`);
  }
};

//
// Frames.
//

const F_APP = 0;
const F_LET = 1;
const F_SEQ = 2;
const F_IF = 3;
const F_MATCH = 4;
const F_HANDLE = 5;
const F_GLOBAL = 6;
const F_REST = 7;
const F_GUARD = 8;

export type Frame =
  | { k: typeof F_APP; term: Extract<Term, { t: typeof APP }>; env: Env; fn: Value | undefined; args: Value[] }
  | { k: typeof F_LET; b: Term; env: Env }
  | { k: typeof F_SEQ; b: Term; env: Env }
  | { k: typeof F_IF; th: Term; el: Term; env: Env }
  | { k: typeof F_MATCH; cases: Case[]; env: Env }
  | { k: typeof F_HANDLE; h: Extract<Term, { t: typeof HANDLE }>; env: Env }
  | { k: typeof F_GLOBAL; g: Global }
  | { k: typeof F_REST; args: Value[] }
  | { k: typeof F_GUARD; value: Value; cases: Case[]; index: number; bound: Env; env: Env };

const cloneFrame = (frame: Frame): Frame => (frame.k === F_APP ? { ...frame, args: frame.args.slice() } : frame);

type Global = { form: Sexp; term: Term | null; value: Value | undefined; evaluating: boolean };

const bind = (pat: Pat, value: Value, env: Env): Env | undefined => {
  switch (pat.k) {
    case P_ANY:
      return env;
    case P_VAR:
      return { value, next: env };
    case P_AS:
      return bind(pat.p, value, { value, next: env });
    case P_LIT:
      return value === pat.v ? env : undefined;
    case P_CON: {
      if (typeof value === 'boolean') {
        return value === (pat.tag === 1) ? env : undefined;
      }
      if (!(value instanceof Con) || value.tag !== pat.tag || value.type !== pat.type) {
        return undefined;
      }
      let out: Env | undefined = env;
      for (let i = 0; i < pat.ps.length; i++) {
        out = bind(pat.ps[i], value.fields[i], out);
        if (out === undefined) {
          return undefined;
        }
      }
      return out;
    }
  }
};

/** Handles requests for abilities no DEUS handler caught (the built-in `IO`). */
export type HostHandler = (ability: string, index: number, args: Value[]) => Value;

/** CEK machine with an explicit frame stack; effects capture stack segments as continuations. */
export class Machine {
  readonly globals = new Map<string, Global>();
  steps = 0;

  readonly prims: Map<string, Prim>;
  readonly host: HostHandler;

  constructor(prims: Map<string, Prim>, host: HostHandler) {
    this.prims = prims;
    this.host = host;
  }

  /** Registers every `(def "hash" term)` form; other forms are ignored by the kernel. */
  load(forms: Sexp[]): void {
    for (const form of forms) {
      if (Array.isArray(form) && form[0] === 'def') {
        const hash = str(form[1]);
        if (!this.globals.has(hash)) {
          this.globals.set(hash, { form: form[2], term: null, value: undefined, evaluating: false });
        }
      }
    }
  }

  /** Evaluates the global `hash` applied to `args`. */
  call(hash: string, args: Value[]): Value {
    const term: Term = { t: REF, h: hash };
    return this.run(args.length === 0 ? term : { t: APP, f: term, args: args.map((v) => ({ t: CONST, v })) }, null);
  }

  run(start: Term, startEnv: Env): Value {
    const stack: Frame[] = [];
    let term: Term = start;
    let env: Env = startEnv;
    let value: Value = UNIT;
    // true: evaluate `term` in `env`; false: return `value` to the top frame.
    let evaluating = true;
    let steps = this.steps;

    const lookup = (i: number): Value => {
      let e = env;
      while (e !== null) {
        if (i === 0) {
          return e.value;
        }
        e = e.next;
        i--;
      }
      throw new DeusPanic('unbound variable');
    };

    // Sets up the machine to apply `fn` to `args`; returns true if the result is in `value`.
    const apply = (fn: Value, args: Value[]): boolean => {
      while (true) {
        if (fn instanceof Closure) {
          const n = fn.lam.n;
          if (args.length < n) {
            value = new Pap(fn, args);
            return true;
          }
          let e = fn.env;
          for (let i = 0; i < n; i++) {
            e = { value: args[i], next: e };
          }
          if (args.length > n) {
            stack.push({ k: F_REST, args: args.slice(n) });
          }
          term = fn.lam.body;
          env = e;
          return false;
        }
        if (fn instanceof Pap) {
          args = fn.args.concat(args);
          fn = fn.fn;
          continue;
        }
        if (fn instanceof Prim) {
          if (args.length < fn.arity) {
            value = new Pap(fn, args);
            return true;
          }
          const rest = args.length > fn.arity ? args.slice(fn.arity) : null;
          const own = rest ? args.slice(0, fn.arity) : args;
          if (fn.control) {
            if (rest) {
              stack.push({ k: F_REST, args: rest });
            }
            this.steps = steps;
            term = fn.control(own, this);
            env = null;
            return false;
          }
          this.steps = steps;
          const result = fn.fn(own, this);
          if (rest) {
            fn = result;
            args = rest;
            continue;
          }
          value = result;
          return true;
        }
        if (fn instanceof ConFn) {
          if (args.length < fn.arity) {
            value = new Pap(fn, args);
            return true;
          }
          value =
            fn.type === '#Pair' && fn.arity === 2
              ? pair(args[0], args[1])
              : new Con(fn.type, fn.tag, args.slice(0, fn.arity));
          if (args.length > fn.arity) {
            throw new DeusDefect('constructor applied to too many arguments');
          }
          return true;
        }
        if (fn instanceof OpFn) {
          if (args.length < fn.arity) {
            value = new Pap(fn, args);
            return true;
          }
          if (args.length > fn.arity) {
            stack.push({ k: F_REST, args: args.slice(fn.arity) });
          }
          return perform(fn, args.slice(0, fn.arity));
        }
        if (fn instanceof Continuation) {
          if (args.length > 1) {
            stack.push({ k: F_REST, args: args.slice(1) });
          }
          for (const frame of fn.frames) {
            stack.push(cloneFrame(frame));
          }
          value = args[0];
          return true;
        }
        throw new DeusDefect(`cannot apply ${show(fn)}`);
      }
    };

    const perform = (op: OpFn, args: Value[]): boolean => {
      if (handleRequest(`${op.ability}/${op.index}`, args)) {
        return false;
      }
      this.steps = steps;
      value = this.host(op.ability, op.index, args);
      return true;
    };

    // Transfers control to the innermost handler clause for `key`; false if none is installed.
    const handleRequest = (key: string, args: Value[]): boolean => {
      for (let i = stack.length - 1; i >= 0; i--) {
        const frame = stack[i];
        if (frame.k === F_HANDLE) {
          const clause = frame.h.clauses.get(key);
          if (clause) {
            const k = new Continuation(stack.slice(i));
            stack.length = i;
            let e = frame.env;
            for (const arg of args) {
              e = { value: arg, next: e };
            }
            env = { value: k, next: e };
            term = clause.body;
            return true;
          }
        }
      }
      return false;
    };

    const loop = (): Value => {
      while (true) {
        if (evaluating) {
          steps++;
          switch (term.t) {
            case VAR:
              value = lookup(term.i);
              evaluating = false;
              break;
            case CONST:
              value = term.v;
              evaluating = false;
              break;
            case REF: {
              const global = this.globals.get(term.h);
              if (!global) {
                throw new DeusPanic(`unknown definition ${term.h}`);
              }
              if (global.value !== undefined) {
                value = global.value;
                evaluating = false;
                break;
              }
              if (!global.term) {
                global.term = compileTerm(global.form, this.prims);
              }
              if (global.term.t === LAM) {
                global.value = new Closure(global.term, null);
                value = global.value;
                evaluating = false;
                break;
              }
              if (global.evaluating) {
                throw new DeusDefect(`definition ${term.h} depends on its own value`);
              }
              global.evaluating = true;
              stack.push({ k: F_GLOBAL, g: global });
              term = global.term;
              env = null;
              break;
            }
            case LAM:
              value = new Closure(term, env);
              evaluating = false;
              break;
            case APP: {
              // Fast path: every operand is a variable or constant, so no frame is needed.
              const f = term.f;
              if (f.t === CONST || f.t === VAR) {
                const operands = term.args;
                let simple = true;
                for (let i = 0; i < operands.length; i++) {
                  const operand = operands[i];
                  if (operand.t !== VAR && operand.t !== CONST) {
                    simple = false;
                    break;
                  }
                }
                if (simple) {
                  const args: Value[] = new Array(operands.length);
                  for (let i = 0; i < operands.length; i++) {
                    const operand = operands[i];
                    args[i] = operand.t === VAR ? lookup(operand.i) : operand.t === CONST ? operand.v : UNIT;
                  }
                  evaluating = !apply(f.t === VAR ? lookup(f.i) : f.v, args);
                  break;
                }
              }
              stack.push({ k: F_APP, term, env, fn: undefined, args: [] });
              term = term.f;
              break;
            }
            case LET:
              stack.push({ k: F_LET, b: term.b, env });
              term = term.v;
              break;
            case SEQ:
              stack.push({ k: F_SEQ, b: term.b, env });
              term = term.a;
              break;
            case LETREC: {
              const cells: { value: Value; next: Env }[] = [];
              let e = env;
              for (let i = 0; i < term.vs.length; i++) {
                const cell = { value: UNIT as Value, next: e };
                cells.push(cell);
                e = cell;
              }
              for (let i = 0; i < term.vs.length; i++) {
                cells[i].value = new Closure(term.vs[i], e);
              }
              env = e;
              term = term.b;
              break;
            }
            case IF:
              stack.push({ k: F_IF, th: term.th, el: term.el, env });
              term = term.c;
              break;
            case MATCH:
              stack.push({ k: F_MATCH, cases: term.cases, env });
              term = term.s;
              break;
            case HANDLE:
              stack.push({ k: F_HANDLE, h: term, env });
              term = term.b;
              break;
          }
          continue;
        }

        const frame = stack.pop();
        if (!frame) {
          this.steps = steps;
          return value;
        }
        switch (frame.k) {
          case F_APP: {
            if (frame.fn === undefined) {
              frame.fn = value;
            } else {
              frame.args.push(value);
            }
            if (frame.args.length < frame.term.args.length) {
              stack.push(frame);
              term = frame.term.args[frame.args.length];
              env = frame.env;
              evaluating = true;
            } else {
              evaluating = !apply(frame.fn, frame.args);
            }
            break;
          }
          case F_LET:
            env = { value, next: frame.env };
            term = frame.b;
            evaluating = true;
            break;
          case F_SEQ:
            env = frame.env;
            term = frame.b;
            evaluating = true;
            break;
          case F_IF:
            env = frame.env;
            term = value === true ? frame.th : frame.el;
            evaluating = true;
            break;
          case F_MATCH:
          case F_GUARD: {
            const cases = frame.cases;
            const scrutinee = frame.k === F_GUARD ? frame.value : value;
            let i = frame.k === F_GUARD ? frame.index : 0;
            if (frame.k === F_GUARD) {
              if (value === true) {
                env = frame.bound;
                term = cases[i].body;
                evaluating = true;
                break;
              }
              i++;
            }
            const base = frame.env;
            let matched = false;
            for (; i < cases.length; i++) {
              const bound = bind(cases[i].pat, scrutinee, base);
              if (bound !== undefined) {
                const guard = cases[i].guard;
                if (guard) {
                  stack.push({ k: F_GUARD, value: scrutinee, cases, index: i, bound, env: base });
                  env = bound;
                  term = guard;
                } else {
                  env = bound;
                  term = cases[i].body;
                }
                matched = true;
                break;
              }
            }
            if (!matched) {
              throw new DeusDefect(`no match for ${show(scrutinee)}`);
            }
            evaluating = true;
            break;
          }
          case F_HANDLE:
            if (frame.h.ret) {
              env = { value, next: frame.env };
              term = frame.h.ret;
              evaluating = true;
            }
            break;
          case F_GLOBAL:
            frame.g.value = value;
            frame.g.evaluating = false;
            break;
          case F_REST:
            evaluating = !apply(value, frame.args);
            break;
        }
      }
    };

    while (true) {
      try {
        return loop();
      } catch (err) {
        // A defect becomes a `#Defect` request so a boundary handler (e.g. the test runner) sees it.
        if (err instanceof DeusDefect && handleRequest(`${DEFECT}/0`, [err.message])) {
          evaluating = true;
          continue;
        }
        this.steps = steps;
        throw err;
      }
    }
  }
}

/** Structural equality over data; functions are never equal. */
export const equal = (a: Value, b: Value): boolean => {
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

const rank = (value: Value): number =>
  typeof value === 'boolean'
    ? 0
    : typeof value === 'number'
      ? 1
      : typeof value === 'string'
        ? 2
        : value instanceof Con
          ? 3
          : 4;

/** Total structural order: -1, 0 or 1. */
export const compare = (a: Value, b: Value): number => {
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

/** Debug rendering of a value. */
export const show = (value: Value): string => {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value instanceof Con) {
    if (value.type === '#List') {
      return '[' + listTo(value).map(show).join(', ') + ']';
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
