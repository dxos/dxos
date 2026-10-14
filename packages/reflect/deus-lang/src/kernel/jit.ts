//
// Copyright 2026 DXOS.org
//

import {
  APP,
  Closure,
  Con,
  ConFn,
  CONST,
  Continuation,
  DEOPT,
  DeusDefect,
  HANDLE,
  IF,
  type JitFn,
  LAM,
  LET,
  LETREC,
  type Machine,
  MATCH,
  OpFn,
  P_ANY,
  P_AS,
  P_CON,
  P_LIT,
  P_VAR,
  Pap,
  type Pattern,
  Prim,
  REF,
  SEQ,
  type Term,
  UNIT,
  type Value,
  VAR,
  lookupIn,
  isDeopt,
  pair,
  show,
} from './machine.ts';

/**
 * Compiles Core lambdas to JavaScript (D39).
 *
 * A lambda without a `handle` compiles to a function of its closure's environment and its
 * arguments. Locals become JS variables, patterns become inline tests, and a call to itself in
 * tail position becomes a loop. Compiled code cannot capture a continuation, so anything that
 * needs one (an operation, calling a continuation, a control primitive) throws `DEOPT` and the
 * machine replays the call; `Machine.enter` undoes the mutations made in between.
 */

/** Primitives with effects a replay would repeat. */
const UNSAFE = new Set(['trace']);

const usesHandler = (node: Term): boolean => {
  switch (node.t) {
    case HANDLE:
      return true;
    case LAM:
      // A nested lambda is compiled on its own when it is called.
      return false;
    case APP:
      return usesHandler(node.a) || node.args.some(usesHandler);
    case LET:
    case SEQ:
      return usesHandler(node.a) || usesHandler(node.b);
    case LETREC:
      return usesHandler(node.b);
    case IF:
      return usesHandler(node.a) || usesHandler(node.b) || usesHandler(node.c);
    case MATCH:
      return (
        usesHandler(node.a) || node.cases.some((c) => (c.guard !== null && usesHandler(c.guard)) || usesHandler(c.body))
      );
    default:
      return false;
  }
};

/** Where a statement's value goes: returned from the function, or assigned to a variable. */
type Target = { kind: 'return' } | { kind: 'assign'; name: string };

const RETURN: Target = { kind: 'return' };

const isIdentifier = (code: string): boolean => /^[A-Za-z_$][\w$]*$/.test(code);

class Generator {
  readonly constants: unknown[] = [];
  readonly lines: string[] = [];
  #next = 0;
  readonly #lam: Term;

  constructor(lam: Term) {
    this.#lam = lam;
  }

  fresh(prefix: string): string {
    return `${prefix}${this.#next++}`;
  }

  constant(value: unknown): string {
    let index = this.constants.indexOf(value);
    if (index < 0) {
      index = this.constants.push(value) - 1;
    }
    return `K[${index}]`;
  }

  emit(line: string): void {
    this.lines.push(line);
  }

  /** A local bound to `code`, unless `code` is already a name or a literal. */
  hold(code: string): string {
    if (isIdentifier(code) || /^-?\d+$/.test(code) || code.startsWith('"') || /^K\[\d+\]$/.test(code)) {
      return code;
    }
    const name = this.fresh('t');
    this.emit(`const ${name} = ${code};`);
    return name;
  }

  /** The environment a closure created here captures: the locals in scope, innermost first. */
  environment(scope: string[]): string {
    let env = 'env';
    for (const local of scope) {
      env = `{ value: ${local}, next: ${env} }`;
    }
    return env;
  }

  literal(value: Value): string {
    if (typeof value === 'number') {
      return value < 0 ? `(${value})` : `${value}`;
    }
    if (typeof value === 'string') {
      return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
      return `${value}`;
    }
    return this.constant(value);
  }

  /** An expression for `node`'s value; statements it needs are emitted first, in evaluation order. */
  expr(node: Term, scope: string[]): string {
    switch (node.t) {
      case VAR:
        return node.i < scope.length ? scope[scope.length - 1 - node.i] : `lookupIn(env, ${node.i - scope.length})`;
      case CONST:
        return this.literal(node.v);
      case REF:
        return `ref(${this.constant(node)})`;
      case LAM:
        return `new Closure(${this.constant(node)}, ${this.environment(scope)})`;
      case APP:
        return this.call(node, scope);
      default: {
        const name = this.fresh('t');
        this.emit(`let ${name};`);
        this.stmt(node, scope, { kind: 'assign', name });
        return name;
      }
    }
  }

  operands(nodes: Term[], scope: string[]): string[] {
    return nodes.map((operand) => this.hold(this.expr(operand, scope)));
  }

  call(node: Term, scope: string[]): string {
    const callee = node.a;
    if (callee.t === CONST) {
      const fn = callee.v;
      if (fn instanceof Prim && !fn.control && !UNSAFE.has(fn.name) && fn.arity === node.args.length) {
        return `${this.constant(fn)}.fn([${this.operands(node.args, scope).join(', ')}], M)`;
      }
      if (fn instanceof ConFn && fn.arity === node.args.length) {
        const args = this.operands(node.args, scope).join(', ');
        return fn.type === '#Pair' && fn.arity === 2
          ? `pair(${args})`
          : `new Con(${JSON.stringify(fn.type)}, ${fn.tag}, [${args}])`;
      }
    }
    const fn = this.hold(this.expr(callee, scope));
    return `call(${fn}, [${this.operands(node.args, scope).join(', ')}])`;
  }

  /** Whether `node` calls the lambda being compiled, with all its arguments, so a loop can replace it. */
  selfCall(node: Term, scope: string[]): boolean {
    const lam = this.#lam;
    if (node.t !== APP || node.args.length !== lam.i) {
      return false;
    }
    const callee = node.a;
    if (callee.t === REF) {
      return lam.selfHash !== '' && callee.h === lam.selfHash;
    }
    return callee.t === VAR && lam.selfIndex >= 0 && callee.i - scope.length === lam.selfIndex;
  }

  finish(code: string, target: Target): void {
    this.emit(target.kind === 'return' ? `return ${code};` : `${target.name} = ${code};`);
  }

  stmt(node: Term, scope: string[], target: Target): void {
    switch (node.t) {
      case LET: {
        const name = this.fresh('v');
        this.emit(`const ${name} = ${this.expr(node.a, scope)};`);
        this.stmt(node.b, [...scope, name], target);
        return;
      }
      case SEQ: {
        const first = this.expr(node.a, scope);
        if (!isIdentifier(first)) {
          this.emit(`${first};`);
        }
        this.stmt(node.b, scope, target);
        return;
      }
      case LETREC: {
        const base = this.fresh('e');
        this.emit(`const ${base} = ${this.environment(scope)};`);
        const cells: string[] = [];
        let previous = base;
        for (let i = 0; i < node.args.length; i++) {
          const cell = this.fresh('c');
          this.emit(`const ${cell} = { value: UNIT, next: ${previous} };`);
          cells.push(cell);
          previous = cell;
        }
        const locals: string[] = [];
        node.args.forEach((fn, i) => {
          const local = this.fresh('f');
          this.emit(`const ${local} = new Closure(${this.constant(fn)}, ${previous});`);
          this.emit(`${cells[i]}.value = ${local};`);
          locals.push(local);
        });
        this.stmt(node.b, [...scope, ...locals], target);
        return;
      }
      case IF: {
        const condition = this.expr(node.a, scope);
        this.emit(`if (${condition} === true) {`);
        this.stmt(node.b, scope, target);
        this.emit('} else {');
        this.stmt(node.c, scope, target);
        this.emit('}');
        return;
      }
      case MATCH:
        this.match(node, scope, target);
        return;
      case APP:
        if (target.kind === 'return' && this.selfCall(node, scope)) {
          // Every argument is copied before any parameter changes: `go b a` swaps them.
          const args = this.operands(node.args, scope).map((arg) => {
            const copy = this.fresh('t');
            this.emit(`const ${copy} = ${arg};`);
            return copy;
          });
          args.forEach((arg, i) => this.emit(`a${i} = ${arg};`));
          this.emit('continue;');
          return;
        }
        this.finish(this.call(node, scope), target);
        return;
      default:
        this.finish(this.expr(node, scope), target);
    }
  }

  /** Tests for `pat` against `value`, and the values it binds, in the machine's binding order. */
  pattern(pat: Pattern, value: string, tests: string[], binds: string[]): void {
    switch (pat.k) {
      case P_ANY:
        return;
      case P_VAR:
        binds.push(value);
        return;
      case P_AS:
        binds.push(value);
        this.pattern(pat.p, value, tests, binds);
        return;
      case P_LIT:
        tests.push(`${value} === ${typeof pat.v === 'string' ? JSON.stringify(pat.v) : `(${pat.v})`}`);
        return;
      case P_CON:
        if (pat.type === '#Bool') {
          tests.push(`${value} === ${pat.tag === 1}`);
          return;
        }
        tests.push(
          `${value} instanceof Con && ${value}.tag === ${pat.tag} && ${value}.type === ${JSON.stringify(pat.type)}`,
        );
        pat.ps.forEach((sub, i) => this.pattern(sub, `${value}.fields[${i}]`, tests, binds));
    }
  }

  match(node: Term, scope: string[], target: Target): void {
    const scrutinee = this.fresh('s');
    this.emit(`const ${scrutinee} = ${this.expr(node.a, scope)};`);
    const done = this.fresh('L');
    this.emit(`${done}: {`);
    for (const c of node.cases) {
      const attempt = this.fresh('C');
      const tests: string[] = [];
      const binds: string[] = [];
      this.pattern(c.pat, scrutinee, tests, binds);
      this.emit(`${attempt}: {`);
      if (tests.length > 0) {
        this.emit(`if (!(${tests.join(' && ')})) break ${attempt};`);
      }
      const inner = [...scope];
      for (const bound of binds) {
        const name = this.fresh('v');
        this.emit(`const ${name} = ${bound};`);
        inner.push(name);
      }
      if (c.guard !== null) {
        this.emit(`if (${this.expr(c.guard, inner)} !== true) break ${attempt};`);
      }
      this.stmt(c.body, inner, target);
      if (target.kind === 'assign') {
        this.emit(`break ${done};`);
      }
      this.emit('}');
    }
    this.emit(`throw new DeusDefect('no match for ' + show(${scrutinee}));`);
    this.emit('}');
  }
}

/** The compiler a machine uses for its closures. */
export const createCompiler = (machine: Machine) => {
  const compile = (lam: Term): JitFn | null => {
    if (usesHandler(lam.a)) {
      return null;
    }
    const generator = new Generator(lam);
    const params = Array.from({ length: lam.i }, (_, i) => `a${i}`);
    generator.stmt(lam.a, params, RETURN);
    const source = [
      'return function (env, args) {',
      ...params.map((param, i) => `let ${param} = args[${i}];`),
      'for (;;) {',
      'if (++M.steps > M.maxSteps) throw new DeusDefect("step budget exhausted");',
      ...generator.lines,
      '}',
      '};',
    ].join('\n');
    // Generating code is this module's purpose; its source is built from compiled Core only.
    // eslint-disable-next-line typescript/no-implied-eval
    const factory = new Function(
      'K',
      'M',
      'ref',
      'call',
      'lookupIn',
      'Closure',
      'Con',
      'DeusDefect',
      'UNIT',
      'pair',
      'show',
      source,
    );
    return factory(generator.constants, machine, ref, call, lookupIn, Closure, Con, DeusDefect, UNIT, pair, show);
  };

  const ref = (node: Term): Value => {
    const global = node.g;
    if (global !== null && global.value !== undefined) {
      return global.value;
    }
    const value = machine.ready(machine.resolve(node));
    if (value === undefined) {
      // A global that is not yet a value is evaluated by the machine.
      throw DEOPT;
    }
    return value;
  };

  const call = (callee: Value, operands: Value[]): Value => {
    let fn = callee;
    let args = operands;
    while (true) {
      if (fn instanceof Closure) {
        const lam = fn.lam;
        const n = lam.i;
        if (args.length < n) {
          return new Pap(fn, args);
        }
        const own = args.length === n ? args : args.slice(0, n);
        let jit = lam.jit;
        if (jit === undefined) {
          jit = compile(lam);
          lam.jit = jit;
        }
        let result: Value;
        try {
          result = jit ? jit(fn.env, own) : machine.runClosure(fn, own);
        } catch (err) {
          if (isDeopt(err)) {
            machine.charge(lam);
          }
          throw err;
        }
        if (args.length === n) {
          return result;
        }
        fn = result;
        args = args.slice(n);
        continue;
      }
      if (fn instanceof Pap) {
        args = fn.args.concat(args);
        fn = fn.fn;
        continue;
      }
      if (fn instanceof Prim) {
        if (args.length < fn.arity) {
          return new Pap(fn, args);
        }
        if (fn.control || UNSAFE.has(fn.name)) {
          throw DEOPT;
        }
        const rest = args.length > fn.arity ? args.slice(fn.arity) : null;
        const result = fn.fn(rest ? args.slice(0, fn.arity) : args, machine);
        if (!rest) {
          return result;
        }
        fn = result;
        args = rest;
        continue;
      }
      if (fn instanceof ConFn) {
        if (args.length < fn.arity) {
          return new Pap(fn, args);
        }
        if (args.length > fn.arity) {
          throw new DeusDefect('constructor applied to too many arguments');
        }
        return fn.type === '#Pair' && fn.arity === 2 ? pair(args[0], args[1]) : new Con(fn.type, fn.tag, args);
      }
      if (fn instanceof OpFn) {
        if (args.length < fn.arity) {
          return new Pap(fn, args);
        }
        throw DEOPT;
      }
      if (fn instanceof Continuation) {
        throw DEOPT;
      }
      throw new DeusDefect(`cannot apply ${show(fn)}`);
    }
  };

  return { compile };
};
