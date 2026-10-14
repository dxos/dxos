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

/** A mutable fixed-length array (`Array.make`, D79); compared by identity. */
export class Vector {
  readonly items: Value[];

  constructor(items: Value[]) {
    this.items = items;
  }
}

/** A hash map from primitive keys (Text or Int): `Dict` (built once, immutable) and `MutMap`. */
export class HashTable {
  readonly map: Map<string | number, Value>;
  readonly mutable: boolean;

  constructor(map: Map<string | number, Value>, mutable: boolean) {
    this.map = map;
    this.mutable = mutable;
  }
}

/** A captured, re-entrant stack segment (deep handler included). */
export class Continuation {
  readonly frames: Frame[];

  constructor(frames: Frame[]) {
    this.frames = frames;
  }
}

export type Value = number | string | boolean | Con | Closure | Callable | Pap | Continuation | Cell | HashTable | Vector;

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

/** The step budget ran out: a defect, but never a reason to replay, since a replay would spend more. */
export class StepBudget extends DeusDefect {}

/** Ends the run's budget, so a boundary that observes the defect can still finish its own work. */
export const exhaustBudget = (machine: Machine): StepBudget => {
  const budget = machine.maxSteps;
  machine.maxSteps = Infinity;
  return new StepBudget(`step budget of ${budget} exhausted`);
};

/** Thrown by compiled code that needs the machine (an operation, a handler, a continuation). */
class Deopt extends Error {}

/** One instance, so throwing it costs no stack capture. */
export const DEOPT = new Deopt('deoptimize');

/** A compiled lambda: its closure's environment and exactly its arity of arguments. */
export type JitFn = (env: Env, args: Value[]) => Value;

/** Compiles lambdas to JavaScript (`jit.ts`); null when a lambda needs the machine. */
export type Compiler = { compile: (lam: Term) => JitFn | null };

/** After this many deoptimizations a lambda stays on the machine. */
const DEOPT_LIMIT = 8;

/** The longest run of entries a lambda skips after deoptimizing. */
const BACKOFF_LIMIT = 1 << 16;

/** Whether an error thrown by compiled code makes the machine replay the call. */
export const isDeopt = (err: unknown): boolean =>
  err === DEOPT || (err instanceof DeusDefect && !(err instanceof StepBudget)) || err instanceof RangeError;

const DEOPTED: unique symbol = Symbol('deopted');

/** How many definitions a defect's stack trace lists. */
const TRACE_DEPTH = 32;

/** A panic: the kernel itself is broken (an invariant of the image or the machine failed). */
export class DeusPanic extends Error {}

/** The built-in ability that carries defects; operation 0 takes the message. */
export const DEFECT = '#Defect';

//
// Terms. Every node is one class with fixed fields, so the machine's property accesses stay
// monomorphic for V8; a child slot a variant does not use points back at the node itself.
//

export const VAR = 0;
export const CONST = 1;
export const REF = 2;
export const LAM = 3;
export const APP = 4;
export const LET = 5;
export const SEQ = 6;
export const LETREC = 7;
export const IF = 8;
export const MATCH = 9;
export const HANDLE = 10;

/** A loaded definition: its Core form, compiled lazily, and its value once evaluated. */
export class Global {
  readonly hash: string;
  readonly form: Sexp;
  term: Term | null = null;
  value: Value | undefined = undefined;

  constructor(hash: string, form: Sexp) {
    this.hash = hash;
    this.form = form;
  }
}

export class Term {
  readonly t: number;
  /** VAR: de Bruijn index; LAM: arity. */
  i = 0;
  /** CONST: the value. */
  v: Value = 0;
  /** REF: the hash, and the global once resolved. */
  h = '';
  g: Global | null = null;
  /** APP: function; LET: value; SEQ: first; IF: condition; MATCH: scrutinee; HANDLE, LAM: body. */
  a: Term;
  /** LET, SEQ, LETREC: body; IF: then. */
  b: Term;
  /** IF: else. */
  c: Term;
  /** HANDLE: the return clause. */
  ret: Term | null = null;
  /** APP: arguments; LETREC: the bound lambdas. */
  args: Term[] = [];
  cases: Case[] = [];
  clauses: Map<string, Clause> | null = null;
  /** APP: a saturated primitive or constructor call on quick operands. */
  q = false;
  /** The definition this term belongs to, for stack traces. */
  owner = '';
  /** LAM: its compiled JavaScript once tried (null: it needs the machine), and how often it deoptimized. */
  jit: JitFn | null | undefined = undefined;
  deopts = 0;
  /** LAM: entries still to skip after a deoptimization, and the current backoff window. */
  skip = 0;
  backoff = 0;
  /** LAM: the global it is the body of, or its index among a letrec's free variables, for self tail calls. */
  selfHash = '';
  selfIndex = -1;

  constructor(t: number) {
    this.t = t;
    this.a = this;
    this.b = this;
    this.c = this;
  }
}

/** Kept for callers that name the lambda variant; every term is a `Term`. */
export type LamTerm = Term;

export class Clause {
  readonly arity: number;
  readonly body: Term;

  constructor(arity: number, body: Term) {
    this.arity = arity;
    this.body = body;
  }
}

export class Case {
  readonly pat: Pattern;
  readonly guard: Term | null;
  readonly body: Term;

  constructor(pat: Pattern, guard: Term | null, body: Term) {
    this.pat = pat;
    this.guard = guard;
    this.body = body;
  }
}

export const P_ANY = 0;
export const P_VAR = 1;
export const P_AS = 2;
export const P_LIT = 3;
export const P_CON = 4;

export class Pattern {
  readonly k: number;
  /** P_AS: the inner pattern. */
  p: Pattern;
  /** P_LIT: the literal. */
  v: number | string = 0;
  /** P_CON: constructor and sub-patterns. */
  type = '';
  tag = 0;
  ps: Pattern[] = [];

  constructor(k: number) {
    this.k = k;
    this.p = this;
  }
}

const term = (t: number): Term => new Term(t);

/** Terms the machine can evaluate directly, without pushing frames. */
const isQuick = (node: Term): boolean => node.t === VAR || node.t === CONST || node.t === REF || node.q;

/** A reference to a global definition. */
export const refTerm = (hash: string): Term => {
  const node = term(REF);
  node.h = hash;
  return node;
};

const constTerm = (value: Value): Term => {
  const node = term(CONST);
  node.v = value;
  return node;
};

/** Signals that a quick evaluation needs the full machine (an unevaluated global). */
const SLOW: unique symbol = Symbol('slow');

export const lookupIn = (env: Env, index: number): Value => {
  let e = env;
  let i = index;
  while (e !== null) {
    if (i === 0) {
      return e.value;
    }
    e = e.next;
    i--;
  }
  throw new DeusPanic('unbound variable');
};

const str = (form: Sexp): string => {
  if (form instanceof Str) {
    return form.value;
  }
  throw new DeusPanic(`core: expected string, got ${print(form)}`);
};

const int = (form: Sexp): number => {
  if (typeof form === 'number') {
    return form;
  }
  throw new DeusPanic(`core: expected int, got ${print(form)}`);
};

const list = (form: Sexp): Sexp[] => {
  if (Array.isArray(form)) {
    return form;
  }
  throw new DeusPanic(`core: expected list, got ${print(form)}`);
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

const compilePat = (form: Sexp): Pattern => {
  const parts = list(form);
  switch (parts[0]) {
    case 'pany':
      return new Pattern(P_ANY);
    case 'pvar':
      return new Pattern(P_VAR);
    case 'pas': {
      const pat = new Pattern(P_AS);
      pat.p = compilePat(parts[1]);
      return pat;
    }
    case 'pint':
    case 'ptext': {
      const pat = new Pattern(P_LIT);
      pat.v = parts[0] === 'pint' ? int(parts[1]) : str(parts[1]);
      return pat;
    }
    case 'pcon': {
      const pat = new Pattern(P_CON);
      pat.type = str(parts[1]);
      pat.tag = int(parts[2]);
      pat.ps = parts.slice(3).map(compilePat);
      return pat;
    }
    default:
      throw new DeusPanic(`core: unknown pattern ${print(form)}`);
  }
};

/** Compiles one canonical Core term (see docs/spec/CORE.md) into the machine's representation. */
export const compileTerm = (form: Sexp, prims: Map<string, Prim>, owner = ''): Term => {
  const node = compileNode(form, prims, owner);
  node.owner = owner;
  return node;
};

const compileNode = (form: Sexp, prims: Map<string, Prim>, owner: string): Term => {
  const go = (form: Sexp): Term => compileTerm(form, prims, owner);
  const parts = list(form);
  switch (parts[0]) {
    case 'var': {
      const node = term(VAR);
      node.i = int(parts[1]);
      return node;
    }
    case 'ref':
      return refTerm(str(parts[1]));
    case 'int':
      return constTerm(int(parts[1]));
    case 'text':
      return constTerm(str(parts[1]));
    case 'lam': {
      // Nested unary lambdas become one n-ary lambda; currying is preserved by `apply`.
      let n = 1;
      let body = parts[1];
      while (Array.isArray(body) && body[0] === 'lam') {
        n++;
        body = body[1];
      }
      const node = term(LAM);
      node.i = n;
      node.a = go(body);
      return node;
    }
    case 'app': {
      const node = term(APP);
      node.a = go(parts[1]);
      node.args = parts.slice(2).map(go);
      // A saturated primitive or constructor call on quick operands evaluates without frames.
      const callee = node.a.t === CONST ? node.a.v : undefined;
      const saturated =
        (callee instanceof Prim && !callee.control && callee.arity === node.args.length) ||
        (callee instanceof ConFn && callee.arity === node.args.length);
      node.q = saturated && node.args.every(isQuick);
      return node;
    }
    case 'let':
    case 'seq': {
      const node = term(parts[0] === 'let' ? LET : SEQ);
      node.a = go(parts[1]);
      node.b = go(parts[2]);
      return node;
    }
    case 'letrec': {
      const node = term(LETREC);
      node.args = list(parts[1]).map((binding) => {
        const fn = go(binding);
        if (fn.t !== LAM) {
          throw new DeusPanic('core: letrec binds lambdas only');
        }
        return fn;
      });
      node.args.forEach((fn, index) => {
        fn.selfIndex = node.args.length - 1 - index;
      });
      node.b = go(parts[2]);
      return node;
    }
    case 'if': {
      const node = term(IF);
      node.a = go(parts[1]);
      node.b = go(parts[2]);
      node.c = go(parts[3]);
      return node;
    }
    case 'con':
      return constTerm(conValue(str(parts[1]), int(parts[2]), int(parts[3])));
    case 'op':
      return constTerm(new OpFn(str(parts[1]), int(parts[2]), int(parts[3])));
    case 'prim': {
      const name = str(parts[1]);
      const prim = prims.get(name);
      if (!prim) {
        throw new DeusPanic(`core: unknown primitive ${name}`);
      }
      return constTerm(prim);
    }
    case 'match': {
      const node = term(MATCH);
      node.a = go(parts[1]);
      node.cases = parts.slice(2).map((form) => {
        const c = list(form);
        return c[0] === 'gcase'
          ? new Case(compilePat(c[1]), go(c[2]), go(c[3]))
          : new Case(compilePat(c[1]), null, go(c[2]));
      });
      return node;
    }
    case 'handle': {
      const node = term(HANDLE);
      const clauses = new Map<string, Clause>();
      for (const form of parts.slice(2)) {
        const c = list(form);
        if (c[0] === 'ret') {
          node.ret = go(c[1]);
        } else {
          clauses.set(`${str(c[1])}/${int(c[2])}`, new Clause(int(c[3]), go(c[4])));
        }
      }
      node.a = go(parts[1]);
      node.clauses = clauses;
      return node;
    }
    default:
      throw new DeusPanic(`core: unknown term ${print(form).slice(0, 80)}`);
  }
};

//
// Frames: one class, as for terms.
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

const NO_GLOBAL = new Global('', 0);

export class Frame {
  readonly k: number;
  /** The term the frame belongs to (APP, LET, SEQ, IF, MATCH, HANDLE). */
  readonly term: Term;
  readonly env: Env;
  /** APP: the evaluated function, then arguments; REST: arguments still to apply. */
  fn: Value | undefined = undefined;
  args: Value[];
  /** GLOBAL: the definition being evaluated. */
  g: Global = NO_GLOBAL;
  /** GUARD: the scrutinee, the case being tried, and its bindings. */
  value: Value = 0;
  index = 0;
  bound: Env = null;

  constructor(k: number, node: Term, env: Env, args: Value[]) {
    this.k = k;
    this.term = node;
    this.env = env;
    this.args = args;
  }
}

const NO_ARGS: Value[] = [];

const cloneFrame = (frame: Frame): Frame => {
  if (frame.k !== F_APP) {
    return frame;
  }
  const copy = new Frame(F_APP, frame.term, frame.env, frame.args.slice());
  copy.fn = frame.fn;
  return copy;
};

const bind = (pat: Pattern, value: Value, env: Env): Env | undefined => {
  switch (pat.k) {
    case P_ANY:
      return env;
    case P_VAR:
      return { value, next: env };
    case P_AS:
      return bind(pat.p, value, { value, next: env });
    case P_LIT:
      return value === pat.v ? env : undefined;
    default: {
      if (typeof value === 'boolean') {
        return value === (pat.tag === 1) ? env : undefined;
      }
      if (!(value instanceof Con) || value.tag !== pat.tag || value.type !== pat.type) {
        return undefined;
      }
      const ps = pat.ps;
      const fields = value.fields;
      let out: Env | undefined = env;
      for (let i = 0; i < ps.length; i++) {
        const sub = ps[i];
        // Variables and wildcards are by far the most common sub-patterns: bind them inline.
        if (sub.k === P_VAR) {
          out = { value: fields[i], next: out };
        } else if (sub.k !== P_ANY) {
          out = bind(sub, fields[i], out);
          if (out === undefined) {
            return undefined;
          }
        }
      }
      return out;
    }
  }
};

/** Handles requests for abilities no DEUS handler caught (the built-in `IO`). */
export type HostHandler = (ability: string, index: number, args: Value[]) => Value;

/** Diagnostics a run opts into; the entry point decides them (`options.ts` reads them from the environment). */
export type MachineOptions = {
  /** Keep the most recently referenced definitions, to report them with a defect. */
  trace?: boolean;
  /** Count entries per definition. */
  profile?: boolean;
  /** Raise a defect past this many steps. */
  maxSteps?: number;
};

/** CEK machine with an explicit frame stack; effects capture stack segments as continuations. */
export class Machine {
  readonly globals = new Map<string, Global>();
  steps = 0;
  /** Recently referenced definitions, kept when `DEUS_TRACE` is set, for diagnosing defects. */
  trace: string[] | undefined;
  /** The definitions on the stack when the last defect was raised, innermost first. */
  defectTrace: string[] = [];
  /** A defect is raised past this many steps (`DEUS_MAX_STEPS`), so a runaway program cannot hang. */
  maxSteps: number;
  /** Entries per definition, kept when `DEUS_PROFILE` is set. */
  profile: Map<string, number> | undefined;
  /** Compiles lambdas to JavaScript; absent, everything runs on the machine. */
  compiler: Compiler | undefined = undefined;
  /** How many compiled calls are running, and undo actions for the mutations they made. */
  jitDepth = 0;
  readonly journal: (() => void)[] = [];
  /** Set once the deoptimization in flight is counted against the innermost lambda it left. */
  charged = false;

  readonly prims: Map<string, Prim>;
  readonly host: HostHandler;

  constructor(
    prims: Map<string, Prim>,
    host: HostHandler,
    { trace = false, profile = false, maxSteps = Infinity }: MachineOptions = {},
  ) {
    this.prims = prims;
    this.host = host;
    this.trace = trace ? [] : undefined;
    this.profile = profile ? new Map() : undefined;
    this.maxSteps = maxSteps;
  }

  /** Registers every `(def "hash" term)` form; other forms are ignored by the kernel. */
  load(forms: Sexp[]): void {
    for (const form of forms) {
      if (Array.isArray(form) && form[0] === 'def') {
        const hash = str(form[1]);
        if (!this.globals.has(hash)) {
          this.globals.set(hash, new Global(hash, form[2]));
        }
      }
    }
  }

  /** Evaluates the global `hash` applied to `args`. */
  call(hash: string, args: Value[]): Value {
    const ref = refTerm(hash);
    if (args.length === 0) {
      return this.run(ref, null);
    }
    const app = term(APP);
    app.a = ref;
    app.args = args.map(constTerm);
    return this.run(app, null);
  }

  /** The global a REF names, resolved once and cached on the term. */
  resolve(node: Term): Global {
    const cached = node.g;
    if (cached !== null) {
      return cached;
    }
    const global = this.globals.get(node.h);
    if (!global) {
      throw new DeusPanic(`unknown definition ${node.h}`);
    }
    node.g = global;
    return global;
  }

  /** A global's value if it can be had without evaluating (functions are values at once). */
  ready(global: Global): Value | undefined {
    if (global.value !== undefined) {
      return global.value;
    }
    if (!global.term) {
      global.term = compileTerm(global.form, this.prims, global.hash);
    }
    if (global.term.t === LAM) {
      global.term.selfHash = global.hash;
      global.value = new Closure(global.term, null);
      return global.value;
    }
    return undefined;
  }

  /** Evaluates a quick term directly, or returns SLOW when a global still needs evaluating. */
  quick(node: Term, env: Env): Value | typeof SLOW {
    switch (node.t) {
      case VAR:
        return lookupIn(env, node.i);
      case CONST:
        return node.v;
      case REF: {
        const value = this.ready(this.resolve(node));
        return value === undefined ? SLOW : value;
      }
      case APP: {
        if (!node.q) {
          return SLOW;
        }
        const callee = node.a.v;
        const operands = node.args;
        const args: Value[] = new Array(operands.length);
        for (let i = 0; i < operands.length; i++) {
          const v = this.quick(operands[i], env);
          if (v === SLOW) {
            return SLOW;
          }
          args[i] = v;
        }
        if (callee instanceof Prim) {
          return callee.fn(args, this);
        }
        if (callee instanceof ConFn) {
          return callee.type === '#Pair' && callee.arity === 2
            ? pair(args[0], args[1])
            : new Con(callee.type, callee.tag, args);
        }
        return SLOW;
      }
      default:
        return SLOW;
    }
  }

  /**
   * Runs a closure's compiled code. Compiled code never captures a continuation: when it needs
   * one (an operation, a defect, a deep JS stack) it throws, its mutations are undone and the
   * machine replays the call, so the result is the machine's.
   */
  enter(fn: Closure, args: Value[]): Value | typeof DEOPTED {
    const lam = fn.lam;
    let jit = lam.jit;
    if (jit === undefined && this.compiler) {
      jit = this.compiler.compile(lam);
      lam.jit = jit;
    }
    if (!jit) {
      return DEOPTED;
    }
    // Backoff after a deoptimization: the machine's replay of an entry must not re-enter
    // compiled code for the same lambda, or nested rethrows replay each level again (2^depth).
    if (lam.skip > 0) {
      lam.skip--;
      return DEOPTED;
    }
    // A callback already known to need the machine would make this call deoptimize too.
    for (const arg of args) {
      if (arg instanceof Closure && arg.lam.jit === null) {
        return DEOPTED;
      }
    }
    const mark = this.journal.length;
    this.jitDepth++;
    try {
      const result = jit(fn.env, args);
      lam.backoff >>= 1;
      return result;
    } catch (err) {
      if (isDeopt(err)) {
        this.rollback(mark);
        this.charge(lam);
        this.charged = false;
        lam.backoff = Math.min(lam.backoff * 2 || 1, BACKOFF_LIMIT);
        lam.skip = lam.backoff;
        return DEOPTED;
      }
      throw err;
    } finally {
      if (--this.jitDepth === 0) {
        this.journal.length = 0;
      }
    }
  }

  /**
   * Counts a deoptimization against `lam` unless an inner call already took it, so a callback
   * that performs an operation does not disable the higher-order function that called it.
   */
  charge(lam: Term): void {
    if (!this.charged) {
      this.charged = true;
      if (++lam.deopts > DEOPT_LIMIT) {
        lam.jit = null;
      }
    }
  }

  rollback(mark: number): void {
    while (this.journal.length > mark) {
      const undo = this.journal.pop();
      undo?.();
    }
  }

  /** Runs a closure on the machine for compiled code; an operation nothing inside handles deoptimizes. */
  runClosure(fn: Closure, args: Value[]): Value {
    let env = fn.env;
    for (const arg of args) {
      env = { value: arg, next: env };
    }
    return this.run(fn.lam.a, env, true);
  }

  run(start: Term, startEnv: Env, nested = false): Value {
    const stack: Frame[] = [];
    let node: Term = start;
    let env: Env = startEnv;
    let value: Value = UNIT;
    // true: evaluate `node` in `env`; false: return `value` to the top frame.
    let evaluating = true;
    let steps = this.steps;

    // Quick evaluation may call primitives that read the step count (`Code.steps`).
    const quickAt = (q: Term, at: Env): Value | typeof SLOW => {
      this.steps = steps;
      return this.quick(q, at);
    };

    // Sets up the machine to apply `fn` to `args`; returns true if the result is in `value`.
    const apply = (fn: Value, args: Value[]): boolean => {
      while (true) {
        if (fn instanceof Closure) {
          const n = fn.lam.i;
          if (args.length < n) {
            value = new Pap(fn, args);
            return true;
          }
          if (this.compiler && fn.lam.jit !== null) {
            this.steps = steps;
            const result = this.enter(fn, args.length === n ? args : args.slice(0, n));
            steps = this.steps;
            if (result !== DEOPTED) {
              if (args.length === n) {
                value = result;
                return true;
              }
              fn = result;
              args = args.slice(n);
              continue;
            }
          }
          let e = fn.env;
          for (let i = 0; i < n; i++) {
            e = { value: args[i], next: e };
          }
          if (args.length > n) {
            stack.push(new Frame(F_REST, fn.lam, null, args.slice(n)));
          }
          node = fn.lam.a;
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
          this.steps = steps;
          if (fn.control) {
            if (rest) {
              stack.push(new Frame(F_REST, start, null, rest));
            }
            node = fn.control(own, this);
            env = null;
            return false;
          }
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
          if (args.length > fn.arity) {
            throw new DeusDefect('constructor applied to too many arguments');
          }
          value = fn.type === '#Pair' && fn.arity === 2 ? pair(args[0], args[1]) : new Con(fn.type, fn.tag, args);
          return true;
        }
        if (fn instanceof OpFn) {
          if (args.length < fn.arity) {
            value = new Pap(fn, args);
            return true;
          }
          if (args.length > fn.arity) {
            stack.push(new Frame(F_REST, start, null, args.slice(fn.arity)));
          }
          return perform(fn, args.length > fn.arity ? args.slice(0, fn.arity) : args);
        }
        if (fn instanceof Continuation) {
          if (args.length > 1) {
            stack.push(new Frame(F_REST, start, null, args.slice(1)));
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
      if (nested) {
        // The handler is outside this run, in a continuation compiled code cannot capture.
        throw DEOPT;
      }
      this.steps = steps;
      value = this.host(op.ability, op.index, args);
      return true;
    };

    // Transfers control to the innermost handler clause for `key`; false if none is installed.
    // The index of the innermost frame that handles `key`, or -1.
    const handlerOf = (key: string): number => {
      for (let i = stack.length - 1; i >= 0; i--) {
        const frame = stack[i];
        if (frame.k === F_HANDLE && frame.term.clauses?.has(key)) {
          return i;
        }
      }
      return -1;
    };

    const handleRequest = (key: string, args: Value[]): boolean => {
      for (let i = stack.length - 1; i >= 0; i--) {
        const frame = stack[i];
        if (frame.k === F_HANDLE) {
          const clause = frame.term.clauses?.get(key);
          if (clause) {
            const k = new Continuation(stack.slice(i));
            stack.length = i;
            let e = frame.env;
            for (const arg of args) {
              e = { value: arg, next: e };
            }
            env = { value: k, next: e };
            node = clause.body;
            return true;
          }
        }
      }
      return false;
    };

    // Chooses the first case (from `from`) whose pattern matches; sets up its guard or body.
    const select = (match: Term, scrutinee: Value, base: Env, from: number): void => {
      const cases = match.cases;
      for (let i = from; i < cases.length; i++) {
        const bound = bind(cases[i].pat, scrutinee, base);
        if (bound !== undefined) {
          const guard = cases[i].guard;
          if (guard) {
            const frame = new Frame(F_GUARD, match, base, NO_ARGS);
            frame.value = scrutinee;
            frame.index = i;
            frame.bound = bound;
            stack.push(frame);
            node = guard;
          } else {
            node = cases[i].body;
          }
          env = bound;
          return;
        }
      }
      throw new DeusDefect(`no match for ${show(scrutinee)}`);
    };

    const loop = (): Value => {
      while (true) {
        if (evaluating) {
          if (++steps > this.maxSteps) {
            throw exhaustBudget(this);
          }
          switch (node.t) {
            case VAR:
              value = lookupIn(env, node.i);
              evaluating = false;
              break;
            case CONST:
              value = node.v;
              evaluating = false;
              break;
            case REF: {
              if (this.profile) {
                this.profile.set(node.h, (this.profile.get(node.h) ?? 0) + 1);
              }
              if (this.trace) {
                this.trace.push(node.h);
                if (this.trace.length > 40) {
                  this.trace.shift();
                }
              }
              const global = this.resolve(node);
              const ready = this.ready(global);
              if (ready !== undefined) {
                value = ready;
                evaluating = false;
                break;
              }
              // The live stack, not a flag, so a handler that discards the frame cannot leave a stale cycle.
              if (stack.some((pending) => pending.k === F_GLOBAL && pending.g === global)) {
                throw new DeusDefect(`definition ${node.h} depends on its own value`);
              }
              const frame = new Frame(F_GLOBAL, node, null, NO_ARGS);
              frame.g = global;
              stack.push(frame);
              node = global.term ?? node;
              env = null;
              break;
            }
            case LAM:
              value = new Closure(node, env);
              evaluating = false;
              break;
            case APP: {
              // Fast path: the function and every operand are quick, so no frame is needed.
              const callee = node.a;
              if (callee.t === VAR || callee.t === CONST || callee.t === REF || callee.q) {
                const fn = quickAt(callee, env);
                if (fn !== SLOW) {
                  const operands = node.args;
                  const args: Value[] = new Array(operands.length);
                  let ok = true;
                  for (let i = 0; i < operands.length; i++) {
                    const operand = operands[i];
                    const v =
                      operand.t === VAR
                        ? lookupIn(env, operand.i)
                        : operand.t === CONST
                          ? operand.v
                          : isQuick(operand)
                            ? quickAt(operand, env)
                            : SLOW;
                    if (v === SLOW) {
                      ok = false;
                      break;
                    }
                    args[i] = v;
                  }
                  if (ok) {
                    evaluating = !apply(fn, args);
                    break;
                  }
                }
              }
              stack.push(new Frame(F_APP, node, env, []));
              node = callee;
              break;
            }
            case LET: {
              const v = isQuick(node.a) ? quickAt(node.a, env) : SLOW;
              if (v !== SLOW) {
                env = { value: v, next: env };
                node = node.b;
                break;
              }
              stack.push(new Frame(F_LET, node, env, NO_ARGS));
              node = node.a;
              break;
            }
            case SEQ:
              stack.push(new Frame(F_SEQ, node, env, NO_ARGS));
              node = node.a;
              break;
            case LETREC: {
              const fns = node.args;
              const cells: { value: Value; next: Env }[] = [];
              let e = env;
              for (let i = 0; i < fns.length; i++) {
                const cell: { value: Value; next: Env } = { value: UNIT, next: e };
                cells.push(cell);
                e = cell;
              }
              for (let i = 0; i < fns.length; i++) {
                cells[i].value = new Closure(fns[i], e);
              }
              env = e;
              node = node.b;
              break;
            }
            case IF: {
              const c = isQuick(node.a) ? quickAt(node.a, env) : SLOW;
              if (c !== SLOW) {
                node = c === true ? node.b : node.c;
                break;
              }
              stack.push(new Frame(F_IF, node, env, NO_ARGS));
              node = node.a;
              break;
            }
            case MATCH: {
              const scrutinee = isQuick(node.a) ? quickAt(node.a, env) : SLOW;
              if (scrutinee !== SLOW) {
                select(node, scrutinee, env, 0);
                break;
              }
              stack.push(new Frame(F_MATCH, node, env, NO_ARGS));
              node = node.a;
              break;
            }
            case HANDLE:
              stack.push(new Frame(F_HANDLE, node, env, NO_ARGS));
              node = node.a;
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
            const operands = frame.term.args;
            if (frame.args.length < operands.length) {
              stack.push(frame);
              node = operands[frame.args.length];
              env = frame.env;
              evaluating = true;
            } else {
              evaluating = !apply(frame.fn, frame.args);
            }
            break;
          }
          case F_LET:
            env = { value, next: frame.env };
            node = frame.term.b;
            evaluating = true;
            break;
          case F_SEQ:
            env = frame.env;
            node = frame.term.b;
            evaluating = true;
            break;
          case F_IF:
            env = frame.env;
            node = value === true ? frame.term.b : frame.term.c;
            evaluating = true;
            break;
          case F_MATCH:
            select(frame.term, value, frame.env, 0);
            evaluating = true;
            break;
          case F_GUARD:
            if (value === true) {
              env = frame.bound;
              node = frame.term.cases[frame.index].body;
            } else {
              select(frame.term, frame.value, frame.env, frame.index + 1);
            }
            evaluating = true;
            break;
          case F_HANDLE: {
            const ret = frame.term.ret;
            if (ret) {
              env = { value, next: frame.env };
              node = ret;
              evaluating = true;
            }
            break;
          }
          case F_GLOBAL:
            frame.g.value = value;
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
        if (err instanceof DeusDefect) {
          // Only the frames the handler discards: the boundary's own callers are not part of the failure.
          const handler = handlerOf(`${DEFECT}/0`);
          this.defectTrace = stackTrace(node, stack, handler + 1, handler >= 0 ? stack[handler].term.owner : '');
        }
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

/**
 * The definitions a defect passed through, innermost first, stopping at the handling definition.
 * A tail call leaves no frame, so it leaves no line either, as in any tail-calling language.
 */
const stackTrace = (current: Term, stack: Frame[], bottom: number, boundary: string): string[] => {
  const trace: string[] = [];
  const add = (owner: string) => {
    if (owner && owner !== boundary && trace[trace.length - 1] !== owner && trace.length < TRACE_DEPTH) {
      trace.push(owner);
    }
  };
  add(current.owner);
  for (let index = stack.length - 1; index >= bottom; index--) {
    add(stack[index].term.owner);
  }
  return trace;
};

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
