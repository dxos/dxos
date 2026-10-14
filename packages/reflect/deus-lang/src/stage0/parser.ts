//
// Copyright 2026 DXOS.org
//

// Stage0 (bootstrap only): mirrors deus/parser.deus; deleted once the seed reproduces itself.

import { type Token, lex } from './lexer.ts';

export type Pos = { line: number; col: number };

export type Type =
  | { k: 'tname'; name: string; args: Type[] }
  | { k: 'tfun'; a: Type; b: Type; effects: Type[] | null }
  | { k: 'ttuple'; items: Type[] }
  | { k: 'tunit' };

export type Pat =
  | { k: 'wild' }
  | { k: 'pid'; name: string; args: Pat[]; pos: Pos }
  | { k: 'pdot'; name: string; args: Pat[]; pos: Pos }
  | { k: 'pint'; value: number }
  | { k: 'ptext'; value: string }
  | { k: 'pbool'; value: boolean }
  | { k: 'pcons'; head: Pat; tail: Pat }
  | { k: 'ptuple'; items: Pat[] }
  | { k: 'plist'; items: Pat[] }
  | { k: 'punit' }
  | { k: 'pas'; name: string; pat: Pat };

export type Arm = { pats: Pat[]; body: Expr };
export type OpArm = { name: string; pats: Pat[]; k: string | null; body: Expr; pos: Pos };

export type Expr =
  | { k: 'var'; name: string; pos: Pos }
  | { k: 'dot'; name: string; pos: Pos }
  | { k: 'int'; value: number }
  | { k: 'text'; value: string }
  | { k: 'bool'; value: boolean }
  | { k: 'unit' }
  | { k: 'app'; f: Expr; args: Expr[] }
  | { k: 'lam'; params: Pat[]; body: Expr }
  | { k: 'lamMatch'; arms: Arm[] }
  | { k: 'let'; pat: Pat; value: Expr; body: Expr }
  | { k: 'letFun'; name: string; params: Pat[]; value: Expr; body: Expr; rec: boolean }
  | { k: 'seq'; first: Expr; rest: Expr }
  | { k: 'if'; cond: Expr; then: Expr; else: Expr }
  | { k: 'match'; scruts: Expr[]; arms: Arm[] }
  | { k: 'handle'; body: Expr; ret: { pat: Pat; body: Expr } | null; ops: OpArm[] }
  | { k: 'binop'; op: string; l: Expr; r: Expr; pos: Pos }
  | { k: 'neg'; e: Expr }
  | { k: 'not'; e: Expr }
  | { k: 'tuple'; items: Expr[] }
  | { k: 'list'; items: Expr[] }
  | { k: 'prim'; name: string }
  | { k: 'record'; base: Expr | null; fields: { name: string; value: Expr }[]; pos: Pos }
  | { k: 'ann'; e: Expr; type: Type };

export type Binder = { name: string; type: Type | null };
export type Attr = { name: string; args: string[] };
export type Field = { name: string; type: Type };

export type Decl =
  | { k: 'def'; name: string; binders: Binder[]; type: Type | null; body: Expr | null; arms: Arm[] | null; doc: string | null; attrs: Attr[]; pos: Pos }
  | { k: 'theorem'; name: string; binders: Binder[]; prop: Expr; proof: string[]; doc: string | null; attrs: Attr[]; pos: Pos }
  | { k: 'test'; name: string; body: Expr; doc: string | null; attrs: Attr[]; pos: Pos }
  | { k: 'inductive'; name: string; params: string[]; iri: string | null; ctors: { name: string; fields: Type[] }[]; doc: string | null; pos: Pos }
  | { k: 'structure'; name: string; params: string[]; iri: string | null; fields: Field[]; doc: string | null; pos: Pos }
  | { k: 'ability'; name: string; params: string[]; iri: string | null; ops: Field[]; doc: string | null; pos: Pos }
  | { k: 'namespace'; name: string }
  | { k: 'end'; name: string | null }
  | { k: 'open'; names: string[] };

export class ParseError extends Error {}

// Binary operators: precedence and associativity (Lean's table).
const BINOPS: Record<string, [number, 'left' | 'right']> = {
  '|>': [10, 'left'],
  '<|': [10, 'right'],
  '||': [30, 'right'],
  '&&': [35, 'right'],
  '==': [50, 'left'],
  '!=': [50, 'left'],
  '=': [50, 'left'],
  '<': [50, 'left'],
  '<=': [50, 'left'],
  '>': [50, 'left'],
  '>=': [50, 'left'],
  '++': [65, 'left'],
  '+': [65, 'left'],
  '-': [65, 'left'],
  '::': [67, 'right'],
  '*': [70, 'left'],
  '/': [70, 'left'],
  '%': [70, 'left'],
};

export const parse = (source: string): Decl[] => new Parser(lex(source)).file();

class Parser {
  readonly tokens: Token[];
  i = 0;
  /** Offside column: a line-initial token at or left of it ends the current expression. */
  stop = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(offset = 0): Token {
    return this.tokens[Math.min(this.i + offset, this.tokens.length - 1)];
  }

  next(): Token {
    const token = this.peek();
    this.i++;
    return token;
  }

  error(message: string, token = this.peek()): never {
    throw new ParseError(`${token.line}:${token.col}: ${message} (at ${token.kind} ${JSON.stringify(token.value)})`);
  }

  is(value: string, token = this.peek()): boolean {
    return (token.kind === 'sym' || token.kind === 'kw') && token.value === value;
  }

  expect(value: string): Token {
    if (!this.is(value)) {
      this.error(`expected '${value}'`);
    }
    return this.next();
  }

  ident(): string {
    const token = this.peek();
    if (token.kind !== 'ident') {
      this.error('expected identifier');
    }
    this.i++;
    return token.value;
  }

  offside(token = this.peek()): boolean {
    return token.kind === 'eof' || (token.bol && token.col <= this.stop);
  }

  pos(token = this.peek()): Pos {
    return { line: token.line, col: token.col };
  }

  withStop<T>(stop: number, fn: () => T): T {
    const saved = this.stop;
    this.stop = stop;
    try {
      return fn();
    } finally {
      this.stop = saved;
    }
  }

  //
  // Declarations.
  //

  file(): Decl[] {
    const decls: Decl[] = [];
    while (this.peek().kind !== 'eof') {
      decls.push(this.decl());
    }
    return decls;
  }

  decl(): Decl {
    let doc: string | null = null;
    if (this.peek().kind === 'doc') {
      doc = this.next().value;
    }
    const attrs: Attr[] = [];
    if (this.is('@[')) {
      this.next();
      while (!this.is(']')) {
        const name = this.ident();
        const args: string[] = [];
        while (!this.is(',') && !this.is(']')) {
          args.push(this.next().value);
        }
        attrs.push({ name, args });
        if (this.is(',')) {
          this.next();
        }
      }
      this.next();
    }
    const token = this.peek();
    if (!token.bol || token.col !== 0) {
      this.error('declarations start at column 0');
    }
    const pos = this.pos();
    switch (token.kind === 'kw' ? token.value : '') {
      case 'def': {
        this.next();
        const name = this.ident();
        const binders = this.binders();
        const type = this.is(':') ? (this.next(), this.withStop(0, () => this.type())) : null;
        if (this.is('|')) {
          return { k: 'def', name, binders, type, body: null, arms: this.arms(), doc, attrs, pos };
        }
        this.expect(':=');
        return { k: 'def', name, binders, type, body: this.body(), arms: null, doc, attrs, pos };
      }
      case 'theorem': {
        this.next();
        const name = this.ident();
        const binders = this.binders();
        this.expect(':');
        const prop = this.expr();
        this.expect(':=');
        const proof: string[] = [];
        if (this.is('sorry')) {
          this.next();
          proof.push('sorry');
        } else {
          this.expect('by');
          while (!this.offside()) {
            proof.push(this.next().value);
          }
        }
        return { k: 'theorem', name, binders, prop, proof, doc, attrs, pos };
      }
      case 'test': {
        this.next();
        const name = this.ident();
        this.expect(':=');
        return { k: 'test', name, body: this.body(), doc, attrs, pos };
      }
      case 'inductive': {
        this.next();
        const name = this.ident();
        const params = this.typeParams();
        const iri = this.iri();
        this.expect('where');
        const ctors: { name: string; fields: Type[] }[] = [];
        while (this.is('|')) {
          this.next();
          // `true`/`false` are keywords but also Bool's constructor names.
          const ctorName = this.is('true') || this.is('false') ? this.next().value : this.ident();
          const fields: Type[] = [];
          this.withStop(0, () => {
            while (!this.offside() && !this.is('|') && !this.is(':')) {
              if (this.is('(') && this.peek(1).kind === 'ident' && (this.is(':', this.peek(2)) || this.peek(2).kind === 'ident')) {
                for (const binder of this.binder()) {
                  fields.push(binder.type ?? this.error('constructor field needs a type'));
                }
              } else {
                fields.push(this.typeAtom());
              }
            }
            if (this.is(':')) {
              this.next();
              let type = this.type();
              while (type.k === 'tfun') {
                fields.push(type.a);
                type = type.b;
              }
            }
          });
          ctors.push({ name: ctorName, fields });
        }
        return { k: 'inductive', name, params, iri, ctors, doc, pos };
      }
      case 'structure':
      case 'ability': {
        this.next();
        const name = this.ident();
        const params = this.typeParams();
        const iri = this.iri();
        this.expect('where');
        const fields: Field[] = [];
        while (this.peek().bol && this.peek().col > 0 && this.peek().kind === 'ident') {
          const col = this.peek().col;
          const fieldName = this.ident();
          this.expect(':');
          fields.push({ name: fieldName, type: this.withStop(col, () => this.type()) });
        }
        return token.value === 'structure'
          ? { k: 'structure', name, params, iri, fields, doc, pos }
          : { k: 'ability', name, params, iri, ops: fields, doc, pos };
      }
      case 'namespace':
        this.next();
        return { k: 'namespace', name: this.ident() };
      case 'end': {
        this.next();
        const name = this.peek().kind === 'ident' && !this.peek().bol ? this.ident() : null;
        return { k: 'end', name };
      }
      case 'open': {
        this.next();
        const names: string[] = [];
        while (this.peek().kind === 'ident' && !this.peek().bol) {
          names.push(this.ident());
        }
        return { k: 'open', names };
      }
      default:
        return this.error('expected a declaration');
    }
  }

  iri(): string | null {
    if (this.is('@')) {
      this.next();
      const token = this.next();
      if (token.kind !== 'text') {
        this.error('expected IRI string', token);
      }
      return token.value;
    }
    return null;
  }

  typeParams(): string[] {
    const params: string[] = [];
    while (true) {
      if (this.peek().kind === 'ident') {
        params.push(this.ident());
      } else if (this.is('(') || this.is('{')) {
        for (const binder of this.binder()) {
          params.push(binder.name);
        }
      } else {
        return params;
      }
    }
  }

  binders(): Binder[] {
    const out: Binder[] = [];
    while (true) {
      if (this.peek().kind === 'ident') {
        out.push({ name: this.ident(), type: null });
      } else if (this.is('(')) {
        out.push(...this.binder());
      } else if (this.is('{')) {
        // Implicit binders name type variables; they are erased.
        this.binder();
      } else {
        return out;
      }
    }
  }

  /** `(a b : T)` or `{a : T}`. */
  binder(): Binder[] {
    const close = this.next().value === '(' ? ')' : '}';
    const names: string[] = [];
    while (this.peek().kind === 'ident') {
      names.push(this.ident());
    }
    let type: Type | null = null;
    if (this.is(':')) {
      this.next();
      type = this.withStop(-1, () => this.type());
    }
    this.expect(close);
    return names.map((name) => ({ name, type }));
  }

  //
  // Types.
  //

  type(): Type {
    const a = this.typeApp();
    if (this.is('->') && !this.offside()) {
      this.next();
      let effects: Type[] | null = null;
      if (this.is('{')) {
        this.next();
        effects = [];
        while (!this.is('}')) {
          effects.push(this.typeApp());
          if (this.is(',')) {
            this.next();
          }
        }
        this.next();
      }
      return { k: 'tfun', a, b: this.type(), effects };
    }
    return a;
  }

  typeApp(): Type {
    const head = this.typeAtom();
    if (head.k !== 'tname') {
      return head;
    }
    const args: Type[] = [];
    while (!this.offside() && (this.peek().kind === 'ident' || this.is('('))) {
      args.push(this.typeAtom());
    }
    return args.length > 0 ? { k: 'tname', name: head.name, args } : head;
  }

  typeAtom(): Type {
    if (this.peek().kind === 'ident') {
      return { k: 'tname', name: this.ident(), args: [] };
    }
    if (this.is('{')) {
      // A leading ability row `{IO} a` on a thunk-like result.
      this.next();
      while (!this.is('}')) {
        this.next();
      }
      this.next();
      return this.typeAtom();
    }
    this.expect('(');
    if (this.is(')')) {
      this.next();
      return { k: 'tunit' };
    }
    return this.withStop(-1, () => {
      const first = this.type();
      if (this.is(',')) {
        const items = [first];
        while (this.is(',')) {
          this.next();
          items.push(this.type());
        }
        this.expect(')');
        return { k: 'ttuple', items };
      }
      this.expect(')');
      return first;
    });
  }

  //
  // Expressions.
  //

  /** A body: a block when it starts on a new line, else one expression. */
  body(): Expr {
    const token = this.peek();
    if (token.bol) {
      if (token.col <= this.stop || token.kind === 'eof') {
        this.error('expected an indented body');
      }
      return this.block(token.col);
    }
    return this.expr();
  }

  block(col: number): Expr {
    return this.withStop(col, () => this.stmts(col));
  }

  /** Statements at column `col`: `let` lines and expressions, the last one is the value. */
  stmts(col: number): Expr {
    const continues = () => {
      if (this.is(';')) {
        this.next();
        return true;
      }
      const token = this.peek();
      return token.bol && token.col === col && token.kind !== 'eof';
    };
    if (this.is('let')) {
      const letToken = this.next();
      const rec = this.is('rec') ? (this.next(), true) : false;
      if (this.peek().kind === 'ident' && !this.is('@', this.peek(1)) && !this.is(':=', this.peek(1))) {
        const name = this.ident();
        const params: Pat[] = [];
        while (!this.is(':=') && !this.is(':')) {
          params.push(this.patAtom());
        }
        if (this.is(':')) {
          this.next();
          this.type();
        }
        this.expect(':=');
        const value = this.body();
        if (!continues()) {
          this.error('a let needs a body on the next line', letToken);
        }
        return { k: 'letFun', name, params, value, body: this.stmts(col), rec };
      }
      if (rec) {
        this.error('let rec needs a function');
      }
      const pat = this.pat();
      if (this.is(':')) {
        this.next();
        this.type();
      }
      this.expect(':=');
      const value = this.body();
      if (!continues()) {
        this.error('a let needs a body on the next line', letToken);
      }
      return { k: 'let', pat, value, body: this.stmts(col) };
    }
    const first = this.expr();
    if (continues()) {
      return { k: 'seq', first, rest: this.stmts(col) };
    }
    return first;
  }

  expr(): Expr {
    if (this.is('let')) {
      return this.stmts(this.peek().col);
    }
    return this.op(0);
  }

  op(min: number): Expr {
    let left = this.unary();
    while (true) {
      const token = this.peek();
      if (this.offside(token) || token.kind !== 'sym') {
        return left;
      }
      const entry = BINOPS[token.value];
      if (!entry || entry[0] < min) {
        return left;
      }
      this.next();
      const right = this.op(entry[1] === 'left' ? entry[0] + 1 : entry[0]);
      left = { k: 'binop', op: token.value, l: left, r: right, pos: this.pos(token) };
    }
  }

  unary(): Expr {
    if (this.is('-')) {
      this.next();
      if (this.peek().kind === 'int') {
        return { k: 'int', value: -Number(this.next().value) | 0 };
      }
      return { k: 'neg', e: this.unary() };
    }
    if (this.is('!')) {
      this.next();
      return { k: 'not', e: this.unary() };
    }
    return this.app();
  }

  startsArg(token = this.peek()): boolean {
    if (this.offside(token)) {
      return false;
    }
    switch (token.kind) {
      case 'ident':
      case 'dot':
      case 'int':
      case 'text':
        return true;
      case 'kw':
        return ['true', 'false', 'prim', 'fun', 'do'].includes(token.value);
      case 'sym':
        return token.value === '(' || token.value === '[' || token.value === '{';
      default:
        return false;
    }
  }

  app(): Expr {
    const f = this.atom();
    const args: Expr[] = [];
    while (this.startsArg()) {
      args.push(this.atom());
    }
    return args.length > 0 ? { k: 'app', f, args } : f;
  }

  atom(): Expr {
    const token = this.peek();
    const pos = this.pos(token);
    switch (token.kind) {
      case 'ident':
        this.next();
        return { k: 'var', name: token.value, pos };
      case 'dot':
        this.next();
        return { k: 'dot', name: token.value, pos };
      case 'int':
        this.next();
        return { k: 'int', value: Number(token.value) | 0 };
      case 'text':
        this.next();
        return { k: 'text', value: token.value };
      case 'kw':
        switch (token.value) {
          case 'true':
          case 'false':
            this.next();
            return { k: 'bool', value: token.value === 'true' };
          case 'prim': {
            this.next();
            const name = this.next();
            if (name.kind !== 'text') {
              this.error('expected primitive name', name);
            }
            return { k: 'prim', name: name.value };
          }
          case 'fun':
            return this.fun();
          case 'if':
            return this.ifExpr();
          case 'match':
            return this.matchExpr();
          case 'handle':
            return this.handleExpr();
          case 'do':
            this.next();
            return this.body();
          case 'let':
            return this.stmts(token.col);
        }
        break;
      case 'sym':
        if (token.value === '(') {
          this.next();
          if (this.is(')')) {
            this.next();
            return { k: 'unit' };
          }
          return this.withStop(-1, () => {
            const first = this.expr();
            if (this.is(':')) {
              this.next();
              const type = this.type();
              this.expect(')');
              return { k: 'ann', e: first, type };
            }
            if (this.is(',')) {
              const items = [first];
              while (this.is(',')) {
                this.next();
                items.push(this.expr());
              }
              this.expect(')');
              return { k: 'tuple', items };
            }
            this.expect(')');
            return first;
          });
        }
        if (token.value === '[') {
          this.next();
          return this.withStop(-1, () => {
            const items: Expr[] = [];
            while (!this.is(']')) {
              items.push(this.expr());
              if (!this.is(']')) {
                this.expect(',');
              }
            }
            this.next();
            return { k: 'list', items };
          });
        }
        if (token.value === '{') {
          this.next();
          return this.withStop(-1, () => {
            let base: Expr | null = null;
            if (!(this.peek().kind === 'ident' && this.is(':=', this.peek(1)))) {
              base = this.expr();
              this.expect('with');
            }
            const fields: { name: string; value: Expr }[] = [];
            while (!this.is('}')) {
              const name = this.ident();
              this.expect(':=');
              fields.push({ name, value: this.expr() });
              if (!this.is('}')) {
                this.expect(',');
              }
            }
            this.next();
            return { k: 'record', base, fields, pos };
          });
        }
        break;
    }
    return this.error('expected an expression');
  }

  fun(): Expr {
    this.expect('fun');
    if (this.is('|')) {
      return { k: 'lamMatch', arms: this.arms() };
    }
    const params: Pat[] = [];
    while (!this.is('=>')) {
      params.push(this.patAtom());
    }
    this.next();
    return { k: 'lam', params, body: this.body() };
  }

  ifExpr(): Expr {
    this.expect('if');
    const cond = this.expr();
    this.expect('then');
    const then = this.body();
    this.expect('else');
    return { k: 'if', cond, then, else: this.body() };
  }

  matchExpr(): Expr {
    this.expect('match');
    const scruts = [this.expr()];
    while (this.is(',')) {
      this.next();
      scruts.push(this.expr());
    }
    this.expect('with');
    return { k: 'match', scruts, arms: this.arms() };
  }

  /** `| p, q => body` arms; line-initial arms must share the first arm's column. */
  arms(): Arm[] {
    const arms: Arm[] = [];
    const first = this.peek();
    const col = first.bol ? first.col : null;
    while (this.is('|') && (!this.peek().bol || this.peek().col === col)) {
      this.next();
      const pats = [this.pat()];
      while (this.is(',')) {
        this.next();
        pats.push(this.pat());
      }
      this.expect('=>');
      const body = col === null ? this.body() : this.withStop(col, () => this.body());
      arms.push({ pats, body });
    }
    if (arms.length === 0) {
      this.error("expected '|'");
    }
    return arms;
  }

  handleExpr(): Expr {
    this.expect('handle');
    const body = this.body();
    this.expect('with');
    let ret: { pat: Pat; body: Expr } | null = null;
    const ops: OpArm[] = [];
    const first = this.peek();
    const col = first.bol ? first.col : null;
    while (this.is('|') && (!this.peek().bol || this.peek().col === col)) {
      this.next();
      const armBody = () => (col === null ? this.body() : this.withStop(col, () => this.body()));
      if (this.is('return')) {
        this.next();
        const pat = this.pat();
        this.expect('=>');
        ret = { pat, body: armBody() };
        continue;
      }
      const pos = this.pos();
      const name = this.peek().kind === 'dot' ? this.next().value : this.ident();
      const pats: Pat[] = [];
      while (!this.is('->')) {
        pats.push(this.patAtom());
      }
      this.next();
      const k = this.is('_') ? (this.next(), null) : this.ident();
      this.expect('=>');
      ops.push({ name, pats, k, body: armBody(), pos });
    }
    return { k: 'handle', body, ret, ops };
  }

  //
  // Patterns.
  //

  pat(): Pat {
    const head = this.patApp();
    if (this.is('::')) {
      this.next();
      return { k: 'pcons', head, tail: this.pat() };
    }
    return head;
  }

  startsPatAtom(): boolean {
    const token = this.peek();
    return (
      token.kind === 'ident' ||
      token.kind === 'dot' ||
      token.kind === 'int' ||
      token.kind === 'text' ||
      this.is('_') ||
      this.is('(') ||
      this.is('[') ||
      this.is('true') ||
      this.is('false') ||
      this.is('-')
    );
  }

  patApp(): Pat {
    const token = this.peek();
    if ((token.kind === 'ident' && !this.is('@', this.peek(1))) || token.kind === 'dot') {
      this.next();
      const args: Pat[] = [];
      while (this.startsPatAtom() && !this.offside()) {
        args.push(this.patAtom());
      }
      const pos = this.pos(token);
      return token.kind === 'dot' ? { k: 'pdot', name: token.value, args, pos } : { k: 'pid', name: token.value, args, pos };
    }
    return this.patAtom();
  }

  patAtom(): Pat {
    const token = this.next();
    const pos = this.pos(token);
    switch (token.kind) {
      case 'ident':
        if (this.is('@')) {
          this.next();
          return { k: 'pas', name: token.value, pat: this.patAtom() };
        }
        return { k: 'pid', name: token.value, args: [], pos };
      case 'dot':
        return { k: 'pdot', name: token.value, args: [], pos };
      case 'int':
        return { k: 'pint', value: Number(token.value) | 0 };
      case 'text':
        return { k: 'ptext', value: token.value };
      case 'kw':
        if (token.value === 'true' || token.value === 'false') {
          return { k: 'pbool', value: token.value === 'true' };
        }
        break;
      case 'sym':
        switch (token.value) {
          case '_':
            return { k: 'wild' };
          case '-': {
            const number = this.next();
            if (number.kind !== 'int') {
              this.error('expected a number', number);
            }
            return { k: 'pint', value: -Number(number.value) | 0 };
          }
          case '(': {
            if (this.is(')')) {
              this.next();
              return { k: 'punit' };
            }
            return this.withStop(-1, () => {
              const first = this.pat();
              if (this.is(',')) {
                const items = [first];
                while (this.is(',')) {
                  this.next();
                  items.push(this.pat());
                }
                this.expect(')');
                return { k: 'ptuple', items };
              }
              this.expect(')');
              return first;
            });
          }
          case '[':
            return this.withStop(-1, () => {
              const items: Pat[] = [];
              while (!this.is(']')) {
                items.push(this.pat());
                if (!this.is(']')) {
                  this.expect(',');
                }
              }
              this.next();
              return { k: 'plist', items };
            });
        }
    }
    return this.error('expected a pattern', token);
  }
}
