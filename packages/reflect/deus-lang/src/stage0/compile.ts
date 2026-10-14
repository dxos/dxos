//
// Copyright 2026 DXOS.org
//

// Stage0 (bootstrap only): mirrors deus/resolve.deus, but names definitions by their fully
// qualified name instead of a hash. Deleted once the seed reproduces itself.

import { type Sexp, Str, print } from '../kernel/sexp.ts';
import { type Arm, type Decl, type Expr, type Pat, parse } from './parser.ts';

type Entry =
  | { kind: 'term'; ref: string }
  | { kind: 'ctor'; type: string; tag: number; arity: number }
  | { kind: 'type'; ref: string }
  | { kind: 'ability'; ref: string }
  | { kind: 'op'; ability: string; index: number; arity: number }
  | { kind: 'other' };

type Scope = { ns: string[]; opens: string[] };

export class CompileError extends Error {}

const s = (value: string) => new Str(value);

// Builtin type refs: an IRI starting with `#` is the type's identity in Core.
const typeRef = (fqn: string, iri: string | null): string => (iri && iri.startsWith('#') ? iri : fqn);

const BINOP_PRIMS: Record<string, string> = {
  '+': 'Int.add',
  '-': 'Int.sub',
  '*': 'Int.mul',
  '/': 'Int.div',
  '%': 'Int.mod',
  '==': 'eq',
  '=': 'eq',
  '!=': 'neq',
  '<': 'lt',
  '<=': 'le',
  '>': 'gt',
  '>=': 'ge',
  '++': 'append',
};

const UNIT: Sexp = ['con', s('#Unit'), 0, 0];
const TRUE: Sexp = ['con', s('#Bool'), 1, 0];
const FALSE: Sexp = ['con', s('#Bool'), 0, 0];

const arrowCount = (type: { k: string; b?: unknown }): number => {
  let n = 0;
  let t = type as { k: string; b?: unknown };
  while (t.k === 'tfun') {
    n++;
    t = t.b as { k: string; b?: unknown };
  }
  return n;
};

/** Compiles DEUS source files into a Core image whose entry point is `main`. */
export const compileImage = (sources: { path: string; text: string }[], main: string): string => {
  const table = new Map<string, Entry>();
  const bySegment = new Map<string, string[]>();
  const fieldOwners = new Map<string, string[]>();
  const structures = new Map<string, { ref: string; fields: string[] }>();
  const defs = new Map<string, Sexp>();
  const units: { decl: Decl; scope: Scope; fqn: string; path: string }[] = [];

  const add = (fqn: string, entry: Entry) => {
    if (table.has(fqn)) {
      throw new CompileError(`duplicate definition ${fqn}`);
    }
    table.set(fqn, entry);
    const segment = fqn.slice(fqn.lastIndexOf('.') + 1);
    bySegment.set(segment, [...(bySegment.get(segment) ?? []), fqn]);
  };

  // Pass 1: names.
  for (const { path, text } of sources) {
    let decls: Decl[];
    try {
      decls = parse(text);
    } catch (err) {
      throw new CompileError(`${path}:${(err as Error).message}`);
    }
    const ns: string[] = [];
    const opens: string[][] = [[]];
    for (const decl of decls) {
      const scope = (): Scope => ({ ns: [...ns], opens: opens.flat() });
      const qualify = (name: string) => [...ns, name].join('.');
      switch (decl.k) {
        case 'namespace':
          ns.push(...decl.name.split('.'));
          opens.push([]);
          break;
        case 'end':
          ns.splice(ns.length - (decl.name ? decl.name.split('.').length : 1));
          opens.pop();
          break;
        case 'open':
          opens[opens.length - 1].push(...decl.names);
          break;
        case 'def':
          add(qualify(decl.name), { kind: 'term', ref: qualify(decl.name) });
          units.push({ decl, scope: scope(), fqn: qualify(decl.name), path });
          break;
        case 'theorem':
        case 'test':
          add(qualify(decl.name), { kind: 'other' });
          break;
        case 'inductive': {
          const fqn = qualify(decl.name);
          const ref = typeRef(fqn, decl.iri);
          add(fqn, { kind: 'type', ref });
          decl.ctors.forEach((ctor, tag) => add(`${fqn}.${ctor.name}`, { kind: 'ctor', type: ref, tag, arity: ctor.fields.length }));
          break;
        }
        case 'structure': {
          const fqn = qualify(decl.name);
          const ref = typeRef(fqn, decl.iri);
          add(fqn, { kind: 'type', ref });
          add(`${fqn}.mk`, { kind: 'ctor', type: ref, tag: 0, arity: decl.fields.length });
          structures.set(fqn, { ref, fields: decl.fields.map((field) => field.name) });
          decl.fields.forEach((field, index) => {
            const accessor = `${fqn}.${field.name}`;
            add(accessor, { kind: 'term', ref: accessor });
            fieldOwners.set(field.name, [...(fieldOwners.get(field.name) ?? []), fqn]);
            const n = decl.fields.length;
            defs.set(accessor, [
              'lam',
              ['match', ['var', 0], ['case', ['pcon', s(ref), 0, ...decl.fields.map(() => ['pvar'])], ['var', n - 1 - index]]],
            ]);
          });
          break;
        }
        case 'ability': {
          const fqn = qualify(decl.name);
          const ref = typeRef(fqn, decl.iri);
          add(fqn, { kind: 'ability', ref });
          decl.ops.forEach((op, index) => {
            const arity = arrowCount(op.type);
            if (arity === 0) {
              throw new CompileError(`${path}: ability operation ${fqn}.${op.name} needs an argument (use Unit)`);
            }
            add(`${fqn}.${op.name}`, { kind: 'op', ability: ref, index, arity });
          });
          break;
        }
      }
    }
  }

  const lookup = (name: string, scope: Scope, want: (entry: Entry) => boolean, suffix: boolean): [string, Entry] | null => {
    for (let i = scope.ns.length; i >= 0; i--) {
      const fqn = [...scope.ns.slice(0, i), name].join('.');
      const entry = table.get(fqn);
      if (entry && want(entry)) {
        return [fqn, entry];
      }
    }
    for (const open of scope.opens) {
      const entry = table.get(`${open}.${name}`);
      if (entry && want(entry)) {
        return [`${open}.${name}`, entry];
      }
    }
    if (!suffix) {
      return null;
    }
    const segment = name.slice(name.lastIndexOf('.') + 1);
    const matches = (bySegment.get(segment) ?? []).filter((fqn) => {
      const entry = table.get(fqn);
      return (fqn === name || fqn.endsWith(`.${name}`)) && entry !== undefined && want(entry);
    });
    if (matches.length > 1) {
      throw new CompileError(`ambiguous name ${name}: ${matches.join(', ')}`);
    }
    return matches.length === 1 ? [matches[0], table.get(matches[0])!] : null;
  };

  const isValue = (entry: Entry) => entry.kind === 'term' || entry.kind === 'ctor' || entry.kind === 'op';
  const isCtor = (entry: Entry) => entry.kind === 'ctor';

  // Pass 2: bodies.
  for (const unit of units) {
    const { decl, fqn } = unit;
    if (decl.k !== 'def') {
      continue;
    }
    const scope: Scope = { ns: fqn.split('.').slice(0, -1), opens: unit.scope.opens };
    let fresh = 0;

    const fail = (message: string, pos?: { line: number; col: number }): never => {
      throw new CompileError(`${unit.path}:${pos ? `${pos.line}:${pos.col}:` : ''} in ${fqn}: ${message}`);
    };

    const local = (locals: (string | null)[], name: string): number => {
      for (let i = locals.length - 1; i >= 0; i--) {
        if (locals[i] === name) {
          return locals.length - 1 - i;
        }
      }
      return -1;
    };

    const valueOf = (name: string, pos: { line: number; col: number }, locals: (string | null)[]): Sexp => {
      const index = local(locals, name);
      if (index >= 0) {
        return ['var', index];
      }
      const dot = name.indexOf('.');
      if (dot > 0 && local(locals, name.slice(0, dot)) >= 0) {
        // `p.x.y`: field access on a local.
        let out: Sexp = ['var', local(locals, name.slice(0, dot))];
        for (const field of name.slice(dot + 1).split('.')) {
          const owners = fieldOwners.get(field) ?? [];
          if (owners.length !== 1) {
            fail(owners.length === 0 ? `unknown field ${field}` : `ambiguous field ${field}: ${owners.join(', ')}`, pos);
          }
          out = ['app', ['ref', s(`${owners[0]}.${field}`)], out];
        }
        return out;
      }
      const found = lookup(name, scope, isValue, true);
      if (!found) {
        return fail(`unknown name ${name}`, pos);
      }
      const [ref, entry] = found;
      switch (entry.kind) {
        case 'term':
          return ['ref', s(ref)];
        case 'ctor':
          return ['con', s(entry.type), entry.tag, entry.arity];
        case 'op':
          return ['op', s(entry.ability), entry.index, entry.arity];
        default:
          return fail(`${name} is not a value`, pos);
      }
    };

    const ctorOf = (name: string, suffix: boolean, pos: { line: number; col: number }) => {
      const found = lookup(name, scope, isCtor, suffix);
      if (!found || found[1].kind !== 'ctor') {
        return null;
      }
      void pos;
      return found[1];
    };

    // Patterns: returns the Core pattern and the names it binds, in binding order.
    const pat = (p: Pat, binds: (string | null)[]): Sexp => {
      switch (p.k) {
        case 'wild':
          return ['pany'];
        case 'pint':
          return ['pint', p.value];
        case 'ptext':
          return ['ptext', s(p.value)];
        case 'pbool':
          return ['pcon', s('#Bool'), p.value ? 1 : 0];
        case 'punit':
          return ['pcon', s('#Unit'), 0];
        case 'pas':
          binds.push(p.name);
          return ['pas', pat(p.pat, binds)];
        case 'pcons':
          return ['pcon', s('#List'), 1, pat(p.head, binds), pat(p.tail, binds)];
        case 'plist': {
          let out: Sexp = ['pcon', s('#List'), 0];
          const items = p.items.map((item) => item);
          // Bind left to right: build the nested pattern while collecting binds in order.
          const parts = items.map((item) => pat(item, binds));
          for (let i = parts.length - 1; i >= 0; i--) {
            out = ['pcon', s('#List'), 1, parts[i], out];
          }
          return out;
        }
        case 'ptuple': {
          const parts = p.items.map((item) => pat(item, binds));
          let out = parts[parts.length - 1];
          for (let i = parts.length - 2; i >= 0; i--) {
            out = ['pcon', s('#Pair'), 0, parts[i], out];
          }
          return out;
        }
        case 'pid':
        case 'pdot': {
          const qualified = p.k === 'pdot' || p.name.includes('.') || p.args.length > 0;
          const ctor = ctorOf(p.name, qualified, p.pos);
          if (!ctor) {
            if (qualified) {
              return fail(`unknown constructor ${p.name}`, p.pos);
            }
            binds.push(p.name);
            return ['pvar'];
          }
          if (ctor.kind !== 'ctor' || ctor.arity !== p.args.length) {
            return fail(`constructor ${p.name} takes ${ctor.kind === 'ctor' ? ctor.arity : 0} arguments`, p.pos);
          }
          return ['pcon', s(ctor.type), ctor.tag, ...p.args.map((arg) => pat(arg, binds))];
        }
      }
    };

    const tuple = (items: Sexp[]): Sexp => {
      let out = items[items.length - 1];
      for (let i = items.length - 2; i >= 0; i--) {
        out = ['app', ['con', s('#Pair'), 0, 2], items[i], out];
      }
      return out;
    };

    // `fun p1 p2 => body`: simple variables bind directly, other patterns match on a fresh binder.
    const lambda = (params: Pat[], body: (locals: (string | null)[]) => Sexp, locals: (string | null)[]): Sexp => {
      if (params.length === 0) {
        return body(locals);
      }
      const [first, ...rest] = params;
      if (first.k === 'pid' && first.args.length === 0 && !first.name.includes('.') && !ctorOf(first.name, false, first.pos)) {
        return ['lam', lambda(rest, body, [...locals, first.name])];
      }
      if (first.k === 'wild' || first.k === 'punit') {
        return ['lam', lambda(rest, body, [...locals, null])];
      }
      const binds: (string | null)[] = [];
      const p = pat(first, binds);
      const inner = [...locals, `$${fresh++}`];
      return ['lam', ['match', ['var', 0], ['case', p, lambda(rest, body, [...inner, ...binds])]]];
    };

    const arms = (scrut: Sexp, list: Arm[], locals: (string | null)[]): Sexp => [
      'match',
      scrut,
      ...list.map((arm) => {
        const binds: (string | null)[] = [];
        const p = arm.pats.length === 1 ? pat(arm.pats[0], binds) : patTuple(arm.pats, binds);
        return ['case', p, expr(arm.body, [...locals, ...binds])];
      }),
    ];

    const patTuple = (pats: Pat[], binds: (string | null)[]): Sexp => pat({ k: 'ptuple', items: pats }, binds);

    // `n` fresh lambdas, then a match on their tuple.
    const equations = (list: Arm[], locals: (string | null)[]): Sexp => {
      const n = list[0].pats.length;
      const inner = [...locals];
      for (let i = 0; i < n; i++) {
        inner.push(null);
      }
      const scrut = n === 1 ? (['var', 0] as Sexp) : tuple(Array.from({ length: n }, (_, i) => ['var', n - 1 - i] as Sexp));
      let out = arms(scrut, list, inner);
      for (let i = 0; i < n; i++) {
        out = ['lam', out];
      }
      return out;
    };

    const record = (e: Extract<Expr, { k: 'record' }>, locals: (string | null)[]): Sexp => {
      const names = e.fields.map((field) => field.name);
      const candidates = [...structures.entries()].filter(([, info]) =>
        e.base ? names.every((name) => info.fields.includes(name)) : names.length === info.fields.length && names.every((name) => info.fields.includes(name)),
      );
      if (candidates.length !== 1) {
        return fail(candidates.length === 0 ? `no structure has fields ${names.join(', ')}` : `ambiguous record ${names.join(', ')}`, e.pos);
      }
      const [, info] = candidates[0];
      const n = info.fields.length;
      const mk: Sexp = ['con', s(info.ref), 0, n];
      if (!e.base) {
        return ['app', mk, ...info.fields.map((name) => expr(e.fields.find((field) => field.name === name)!.value, locals))];
      }
      const inner = [...locals, ...info.fields.map(() => null)];
      const values = info.fields.map((name, i) => {
        const update = e.fields.find((field) => field.name === name);
        return update ? expr(update.value, inner) : (['var', n - 1 - i] as Sexp);
      });
      return ['match', expr(e.base, locals), ['case', ['pcon', s(info.ref), 0, ...info.fields.map(() => ['pvar'])], ['app', mk, ...values]]];
    };

    const expr = (e: Expr, locals: (string | null)[]): Sexp => {
      switch (e.k) {
        case 'var':
          return valueOf(e.name, e.pos, locals);
        case 'dot': {
          const found = lookup(e.name, scope, isCtor, true);
          if (!found || found[1].kind !== 'ctor') {
            return fail(`unknown constructor .${e.name}`, e.pos);
          }
          return ['con', s(found[1].type), found[1].tag, found[1].arity];
        }
        case 'int':
          return ['int', e.value];
        case 'text':
          return ['text', s(e.value)];
        case 'bool':
          return e.value ? TRUE : FALSE;
        case 'unit':
          return UNIT;
        case 'prim':
          return ['prim', s(e.name)];
        case 'app': {
          const f = expr(e.f, locals);
          const args = e.args.map((arg) => expr(arg, locals));
          if (Array.isArray(f) && f[0] === 'app') {
            return [...f, ...args];
          }
          return ['app', f, ...args];
        }
        case 'lam':
          return lambda(e.params, (inner) => expr(e.body, inner), locals);
        case 'lamMatch':
          return equations(e.arms, locals);
        case 'let': {
          const value = expr(e.value, locals);
          const p = e.pat;
          if (p.k === 'pid' && p.args.length === 0 && !p.name.includes('.') && !ctorOf(p.name, false, p.pos)) {
            return ['let', value, expr(e.body, [...locals, p.name])];
          }
          if (p.k === 'wild') {
            return ['seq', value, expr(e.body, locals)];
          }
          const binds: (string | null)[] = [];
          const core = pat(p, binds);
          return ['match', value, ['case', core, expr(e.body, [...locals, ...binds])]];
        }
        case 'letFun': {
          if (e.rec) {
            const inner = [...locals, e.name];
            return ['letrec', [lambda(e.params, (l) => expr(e.value, l), inner)], expr(e.body, inner)];
          }
          return ['let', lambda(e.params, (l) => expr(e.value, l), locals), expr(e.body, [...locals, e.name])];
        }
        case 'seq':
          return ['seq', expr(e.first, locals), expr(e.rest, locals)];
        case 'if':
          return ['if', expr(e.cond, locals), expr(e.then, locals), expr(e.else, locals)];
        case 'match': {
          const scrut = e.scruts.length === 1 ? expr(e.scruts[0], locals) : tuple(e.scruts.map((x) => expr(x, locals)));
          for (const arm of e.arms) {
            if (arm.pats.length !== e.scruts.length) {
              fail('match arm has the wrong number of patterns');
            }
          }
          return arms(scrut, e.arms, locals);
        }
        case 'handle': {
          const out: Sexp[] = ['handle', expr(e.body, locals)];
          if (e.ret) {
            const p = e.ret.pat;
            const binds: (string | null)[] = [];
            if (p.k === 'pid' && p.args.length === 0 && !ctorOf(p.name, false, p.pos)) {
              out.push(['ret', expr(e.ret.body, [...locals, p.name])]);
            } else {
              const core = pat(p, binds);
              out.push(['ret', ['match', ['var', 0], ['case', core, expr(e.ret.body, [...locals, null, ...binds])]]]);
            }
          }
          for (const op of e.ops) {
            const found = lookup(op.name, scope, (entry) => entry.kind === 'op', true);
            if (!found || found[1].kind !== 'op') {
              return fail(`unknown ability operation ${op.name}`, op.pos);
            }
            const info = found[1];
            if (op.pats.length !== info.arity) {
              return fail(`${op.name} takes ${info.arity} arguments`, op.pos);
            }
            // Clause environment: the arguments in order, then the continuation.
            const argNames: (string | null)[] = [];
            const complex: { index: number; pat: Pat }[] = [];
            op.pats.forEach((p, index) => {
              if (p.k === 'pid' && p.args.length === 0 && !p.name.includes('.') && !ctorOf(p.name, false, p.pos)) {
                argNames.push(p.name);
              } else if (p.k === 'wild' || p.k === 'punit') {
                argNames.push(null);
              } else {
                argNames.push(null);
                complex.push({ index, pat: p });
              }
            });
            const inner = [...locals, ...argNames, op.k];
            let body: (l: (string | null)[]) => Sexp = (l) => expr(op.body, l);
            for (const { index, pat: p } of complex.reverse()) {
              const next = body;
              body = (l) => {
                const binds: (string | null)[] = [];
                const core = pat(p, binds);
                const depth = l.length - (locals.length + index) - 1;
                return ['match', ['var', depth], ['case', core, next([...l, ...binds])]];
              };
            }
            out.push(['on', s(info.ability), info.index, info.arity, body(inner)]);
          }
          return out;
        }
        case 'binop': {
          const l = expr(e.l, locals);
          const r = expr(e.r, locals);
          switch (e.op) {
            case '&&':
              return ['if', l, r, FALSE];
            case '||':
              return ['if', l, TRUE, r];
            case '|>':
              return ['app', r, l];
            case '<|':
              return ['app', l, r];
            case '::':
              return ['app', ['con', s('#List'), 1, 2], l, r];
            default:
              return ['app', ['prim', s(BINOP_PRIMS[e.op])], l, r];
          }
        }
        case 'neg':
          return ['app', ['prim', s('Int.neg')], expr(e.e, locals)];
        case 'not':
          return ['if', expr(e.e, locals), FALSE, TRUE];
        case 'tuple':
          return tuple(e.items.map((item) => expr(item, locals)));
        case 'list': {
          let out: Sexp = ['con', s('#List'), 0, 0];
          for (let i = e.items.length - 1; i >= 0; i--) {
            out = ['app', ['con', s('#List'), 1, 2], expr(e.items[i], locals), out];
          }
          return out;
        }
        case 'record':
          return record(e, locals);
        case 'ann':
          return expr(e.e, locals);
      }
    };

    const params: Pat[] = decl.binders.map((binder) => ({ k: 'pid', name: binder.name, args: [], pos: decl.pos }));
    const body = (locals: (string | null)[]): Sexp => (decl.arms ? equations(decl.arms, locals) : expr(decl.body!, locals));
    defs.set(fqn, lambda(params, body, []));
  }

  // Emit the definitions reachable from `main`.
  const reachable = new Set<string>();
  const visit = (ref: string) => {
    if (reachable.has(ref)) {
      return;
    }
    const def = defs.get(ref);
    if (!def) {
      throw new CompileError(`unknown definition ${ref}`);
    }
    reachable.add(ref);
    const walk = (form: Sexp) => {
      if (Array.isArray(form)) {
        if (form[0] === 'ref' && form[1] instanceof Str) {
          visit(form[1].value);
        } else {
          form.forEach(walk);
        }
      }
    };
    walk(def);
  };
  visit(main);
  const lines = [...reachable].sort().map((ref) => print(['def', s(ref), defs.get(ref)!]));
  lines.push(print(['main', s(main)]));
  return lines.join('\n') + '\n';
};
