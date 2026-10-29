//
// Copyright 2026 DXOS.org
//

import {
  type AggregateExpression,
  type Expression,
  type IriTerm,
  type Pattern,
  type PropertyPath,
  type SelectQuery,
  type Term as SparqlTerm,
  type Triple,
  type ValuePatternRow,
  type Variable,
  type Wildcard,
} from 'sparqljs';

import { invariant } from '@dxos/invariant';

import { InvalidSparqlError, UnsupportedSparqlError } from './errors.ts';
import { type Enc, Kind, encodeTerm, toTerm } from './store.ts';
import { XSD } from './terms.ts';

/**
 * SPARQL (sparqljs AST) -> one SQLite statement.
 *
 * Every variable is a SQL expression of one static type: `id` (a term id; decoded by a final join on
 * `terms`), or a computed `num` / `str` / `bool`. SQL NULL is SPARQL "unbound" in bindings and "error"
 * in expressions, and SQL's three-valued AND/OR/NOT coincides with SPARQL's error logic.
 */

export type VType = 'id' | 'num' | 'str' | 'bool';
export type VarInfo = { sql: string; type: VType; nullable: boolean };
export type Compiled = {
  sql: string;
  cols: { name: string; type: VType; nullable: boolean }[];
  /** Hidden ORDER BY key columns of `sql`, which the statement around it must sort by. */
  order?: { col: string; descending: boolean }[];
  /** Hidden column holding the graph of a sub-select compiled inside `GRAPH ?var`. */
  graphCol?: string;
};

/** Resolves constants against the store while compiling. */
export interface ConstResolver {
  /** SQL literal for a constant term id (a negative temp id when the term is not stored). */
  constId(term: SparqlTerm): string;
  namedGraphs: boolean;
  /**
   * Planner hint for a pattern with constant predicate id `p` (and object id `o`): the fraction of quads
   * matching `p`, and of those the fraction matching `o`. Undefined leaves SQLite to its averages.
   */
  selectivity?(p: string, o: string | undefined): { p: number; o?: number } | undefined;
}

/** The SELECT fields the compiler reads; `compileWhere` synthesizes one with a wildcard projection. */
export type SelectShape = Pick<
  SelectQuery,
  'where' | 'values' | 'distinct' | 'reduced' | 'group' | 'having' | 'order' | 'limit' | 'offset'
> & { variables: Variable[] | [WildcardLike] };

type WildcardLike = { termType: 'Wildcard' };
/** Compiler-generated variable for intermediate path nodes (never projected: starts with `_`). */
type HiddenVar = { termType: 'Variable'; value: string };
type PatternTerm = SparqlTerm | HiddenVar;
type Predicate = Triple['predicate'];
type FromItem = { alias: string; src: string; join: 'inner' | 'left'; on: string[] };
type Graph = { kind: 'default' } | { kind: 'const'; sql: string } | { kind: 'var'; name: string };
/** Closure start nodes: `seed` selects them as `n`; `bound` when they come from a variable's bindings. */
type Anchor = { side: 's' | 'o'; seed: string; bound?: boolean };

/** A compiled expression: `c` is set for constants (statically known term). */
type Val = { t: VType; sql: string; c?: Enc };

class Scope {
  froms: FromItem[] = [];
  where: string[] = [];
  vars = new Map<string, VarInfo>();
  /** References columns outside itself (EXISTS body): cannot be hoisted into a CTE. */
  correlated = false;
  /** Graph variables every solution of this scope takes from a matched quad. */
  graphBound = new Set<string>();
}

const DATE_PARTS: Record<string, readonly [start: number, length: number]> = {
  year: [1, 4],
  month: [6, 2],
  day: [9, 2],
  hours: [12, 2],
  minutes: [15, 2],
};

/** Quotes a SQL identifier. */
export const quoteName = (name: string) => `"${name.replace(/"/g, '""')}"`;
const strLit = (value: string) => `'${value.replace(/'/g, "''")}'`;
const numLit = (value: number | null) => (value === null || !Number.isFinite(value) ? 'NULL' : String(value));
const and = (conds: string[]) => (conds.length === 0 ? '1' : conds.map((cond) => `(${cond})`).join(' AND '));

const termCol = (idSql: string, col: string, kindCond?: string) =>
  `(SELECT ${col} FROM terms WHERE id = ${idSql}${kindCond ? ` AND ${kindCond}` : ''})`;

/** Lexical spaces of the numeric cast targets (xsd:float/double also take INF and NaN). */
const INTEGER_LEX = /^[+-]?\d+$/;
const DECIMAL_LEX = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;
const DOUBLE_LEX = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/** SQL test that a string expression is in a numeric lexical space (GLOB has no repetition, so it checks by exclusion). */
const numericLexSql = (sql: string, lexical: RegExp): string => {
  const text = `trim(${sql})`;
  const body = `ltrim(${text}, '+-')`;
  const base = `length(${text}) - length(${body}) <= 1 AND ${body} GLOB '*[0-9]*'`;
  if (lexical === INTEGER_LEX) {
    return `(${base} AND NOT ${body} GLOB '*[^0-9]*')`;
  }
  if (lexical === DECIMAL_LEX) {
    return `(${base} AND NOT ${body} GLOB '*[^0-9.]*' AND NOT ${body} GLOB '*.*.*')`;
  }
  const invalid = [
    '*[^0-9.eE+-]*',
    '*.*.*',
    '*[eE]*[eE]*',
    '*[eE]*.*',
    '[eE]*',
    '.[eE]*',
    '*[eE]',
    '*[eE][+-]',
    '*[0-9.][+-]*',
  ];
  return `(${base} AND ${invalid.map((glob) => `NOT ${body} GLOB '${glob}'`).join(' AND ')})`;
};

/** Maps digits 0-9 to letters j-a so a larger magnitude sorts first (negative numbers in a text key). */
const descendingDigits = (sql: string): string =>
  [...'0123456789'].reduce((acc, digit) => `replace(${acc}, '${digit}', '${'jihgfedcba'[Number(digit)]}')`, sql);

const isPath = (item: object): item is PropertyPath => 'type' in item && item.type === 'path';

const isWildcard = (value: object): value is Wildcard | WildcardLike =>
  'termType' in value && value.termType === 'Wildcard';

const isPattern = (arg: Expression | Pattern): arg is Pattern =>
  !Array.isArray(arg) &&
  !('termType' in arg) &&
  arg.type !== 'operation' &&
  arg.type !== 'functionCall' &&
  arg.type !== 'aggregate';

const asExpression = (arg: Expression | Pattern): Expression => {
  if (isPattern(arg)) {
    throw new InvalidSparqlError(`graph pattern used as an expression`);
  }
  return arg;
};

/** Compiles sparqljs ASTs to SQL; one instance per statement (it accumulates the statement's CTEs). */
export class Compiler {
  readonly ctes: string[] = [];
  /**
   * A constant absent from the store (negative id) is bound to a variable by VALUES or BIND, so term
   * lookups on that variable need the temp terms; plain `qN.o = -1` conditions and constants met
   * directly in expressions (inlined from `Val.c`) do not.
   */
  tempTermsUsed = false;
  readonly resolver: ConstResolver;
  #aliases = 0;
  #hidden = 0;
  /** Grouped select being compiled: aggregates met in expressions become its hidden columns. */
  #aggregates: { scope: Scope; alias: string; cols: string[] } | undefined;
  /** Graph of the group being compiled (EXISTS bodies inherit it). */
  #graph: Graph = { kind: 'default' };

  constructor(resolver: ConstResolver) {
    this.resolver = resolver;
  }

  //
  // Queries.
  //

  /**
   * Compiles a SELECT (top level or sub-select) into a statement whose columns are the projected vars.
   * A sub-select inside `GRAPH ?g` is evaluated per graph: the graph travels as an extra hidden column.
   */
  compileSelect(query: SelectShape, graph: Graph = { kind: 'default' }): Compiled {
    const scope = new Scope();
    let inner = graph;
    let graphCol: string | undefined;
    if (graph.kind === 'var') {
      if (query.limit !== undefined || query.offset !== undefined) {
        throw new UnsupportedSparqlError('LIMIT/OFFSET in a sub-select inside GRAPH ?var');
      }
      graphCol = `_sg${this.#hidden++}`;
      inner = { kind: 'var', name: graphCol };
    }
    this.group(query.where ?? [], scope, inner);
    if (graphCol) {
      this.#bindGraphNames(scope, graphCol);
    }
    const variables = query.variables;
    const projection = isWildcardProjection(variables) ? undefined : variables;
    const hasAgg =
      !!query.group ||
      !!query.having ||
      (projection ?? []).some((item) => 'expression' in item && containsAggregate(item.expression));
    // A trailing VALUES joins the grouped solutions when there is grouping, else the WHERE solutions.
    if (query.values && !hasAgg) {
      this.values(scope, query.values);
    }

    let base: Scope;
    let projected: { name: string; val: Val; nullable: boolean }[];
    // Grouped: keys and aggregates are columns of a GROUP BY select; projection, HAVING and ORDER BY
    // expressions run one level up over those columns, so an aggregate's id can feed a term lookup.
    let grouped: { alias: string; keys: string[]; cols: string[] } | undefined;
    const outerAggregates = this.#aggregates;
    if (hasAgg) {
      const alias = this.#alias('a');
      grouped = { alias, keys: [], cols: [] };
      const { keys, cols } = grouped;
      const derived = new Scope();
      const addKey = (name: string, info: VarInfo, keySql: string) => {
        keys.push(keySql);
        cols.push(`${info.sql} AS ${quoteName(name)}`);
        derived.vars.set(name, { sql: `${alias}.${quoteName(name)}`, type: info.type, nullable: info.nullable });
      };
      const graphInfo = graphCol ? scope.vars.get(graphCol) : undefined;
      if (graphCol && graphInfo) {
        addKey(graphCol, { ...graphInfo, nullable: false }, graphInfo.sql);
      }
      for (const item of query.group ?? []) {
        const expr = item.expression;
        if ('termType' in expr && expr.termType === 'Variable' && !item.variable) {
          const info = scope.vars.get(expr.value) ?? { sql: 'NULL', type: 'id', nullable: true };
          addKey(expr.value, info, /^-?\d+$/.test(info.sql) ? `(0 + ${info.sql})` : info.sql);
        } else {
          const val = this.expr(expr, scope, false);
          addKey(item.variable?.value ?? `_g${this.#hidden++}`, { sql: val.sql, type: val.t, nullable: true }, val.sql);
        }
      }
      this.#aggregates = { scope, alias, cols };
      if (query.values) {
        this.values(derived, query.values);
      }
      const outVars: string[] = graphCol ? [graphCol] : [];
      for (const item of projection ?? []) {
        if ('termType' in item) {
          if (!derived.vars.has(item.value)) {
            derived.vars.set(item.value, { sql: 'NULL', type: 'id', nullable: true });
          }
          outVars.push(item.value);
        } else {
          const val = this.expr(item.expression, derived, true);
          derived.vars.set(item.variable.value, { sql: val.sql, type: val.t, nullable: true });
          outVars.push(item.variable.value);
        }
      }
      for (const expr of query.having ?? []) {
        derived.where.push(this.ebv(this.expr(expr, derived, true)));
      }
      projected = outVars.map((name) => {
        const info = derived.vars.get(name);
        invariant(info, 'projected variable missing from the aggregate');
        return { name, val: { t: info.type, sql: info.sql }, nullable: info.nullable };
      });
      base = derived;
    } else {
      base = scope;
      if (!projection) {
        projected = [...scope.vars.entries()]
          .filter(([name]) => !name.startsWith('_') || name === graphCol)
          .map(([name, info]) => ({ name, val: { t: info.type, sql: info.sql }, nullable: info.nullable }));
      } else {
        projected = [];
        const graphInfo = graphCol ? scope.vars.get(graphCol) : undefined;
        if (graphCol && graphInfo) {
          projected.push({ name: graphCol, val: { t: graphInfo.type, sql: graphInfo.sql }, nullable: false });
        }
        for (const item of projection) {
          if ('termType' in item) {
            const info = scope.vars.get(item.value);
            projected.push({
              name: item.value,
              val: info ? { t: info.type, sql: info.sql } : { t: 'id', sql: 'NULL' },
              nullable: info?.nullable ?? true,
            });
          } else {
            const val = this.expr(item.expression, scope, false);
            projected.push({ name: item.variable.value, val, nullable: true });
            scope.vars.set(item.variable.value, { sql: val.sql, type: val.t, nullable: true });
          }
        }
      }
    }

    const distinct = !!(query.distinct || query.reduced);
    const keys: { sql: string; descending: boolean }[] = [];
    for (const item of query.order ?? []) {
      if (distinct && !variablesOf(item.expression).every((name) => projected.some((col) => col.name === name))) {
        throw new UnsupportedSparqlError('ORDER BY a non-projected expression with DISTINCT');
      }
      const val = this.expr(item.expression, base, !!grouped);
      for (const key of this.orderKeys(val)) {
        keys.push({ sql: key, descending: !!item.descending });
      }
    }
    this.#aggregates = outerAggregates;
    if (grouped) {
      let groupSql = `SELECT ${grouped.cols.join(', ') || '1 AS "_"'} ${this.fromWhere(scope)}`;
      if (grouped.keys.length > 0) {
        groupSql += ` GROUP BY ${grouped.keys.join(', ')}`;
      }
      base.froms.push({ alias: grouped.alias, src: `(${groupSql})`, join: 'inner', on: [] });
    }
    // Order keys travel as hidden columns: a derived table's ORDER BY does not survive the decode join around it.
    const order = keys.map((key, index) => ({ col: `_o${index}`, descending: key.descending }));
    const colSql = [
      ...projected.map(({ name, val }) => `${val.sql} AS ${quoteName(name)}`),
      ...keys.map((key, index) => `${key.sql} AS ${quoteName(order[index].col)}`),
    ];
    let sql = `SELECT ${distinct ? 'DISTINCT ' : ''}${colSql.join(', ') || '1 AS "_"'} ${this.fromWhere(base)}`;
    if (query.limit !== undefined || query.offset !== undefined) {
      if (keys.length > 0) {
        sql += ` ORDER BY ${keys.map((key) => `${key.sql}${key.descending ? ' DESC' : ''}`).join(', ')}`;
      }
      sql += ` LIMIT ${query.limit ?? -1}`;
      if (query.offset) {
        sql += ` OFFSET ${query.offset}`;
      }
    }
    return {
      sql,
      cols: projected.map(({ name, val, nullable }) => ({ name, type: val.t, nullable })),
      ...(order.length > 0 ? { order } : {}),
      ...(graphCol ? { graphCol } : {}),
    };
  }

  /** WHERE-only compile (ASK/CONSTRUCT/UPDATE): all non-hidden vars as id columns. */
  compileWhere(patterns: Pattern[], limit?: number): Compiled {
    return this.compileSelect({ where: patterns, variables: [{ termType: 'Wildcard' }], limit });
  }

  //
  // Graph patterns.
  //

  group(patterns: Pattern[], scope: Scope, graph: Graph): void {
    const outerGraph = this.#graph;
    this.#graph = graph;
    try {
      this.#group(patterns, scope, graph);
    } finally {
      this.#graph = outerGraph;
    }
  }

  #group(patterns: Pattern[], scope: Scope, graph: Graph): void {
    const filters: Expression[] = [];
    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'bgp':
          for (const triple of pattern.triples) {
            this.triple(scope, triple.subject, triple.predicate, triple.object, graph);
          }
          break;
        case 'filter':
          filters.push(pattern.expression);
          break;
        case 'group': {
          const child = this.child(scope);
          this.group(pattern.patterns, child, graph);
          this.mergeInner(scope, child);
          break;
        }
        case 'optional':
          this.optional(scope, pattern.patterns, graph);
          break;
        case 'union': {
          const branches = pattern.patterns.map((branch) => {
            const child = this.child(scope);
            this.group(branch.type === 'group' ? branch.patterns : [branch], child, graph);
            return child;
          });
          this.joinUnion(scope, branches);
          break;
        }
        case 'minus':
          this.minus(scope, pattern.patterns, graph);
          break;
        case 'graph': {
          const name = pattern.name;
          const inner: Graph =
            name.termType === 'Variable'
              ? { kind: 'var', name: name.value }
              : { kind: 'const', sql: this.resolver.constId(name) };
          const child = this.child(scope);
          const outer = inner.kind === 'var' ? scope.vars.get(name.value) : undefined;
          if (outer) {
            child.vars.set(name.value, outer);
          }
          this.group(pattern.patterns, child, inner);
          if (inner.kind === 'var') {
            // A body that binds no graph (empty, nested GRAPH <c>, VALUES ...) ranges over every named graph.
            this.#bindGraphNames(child, inner.name);
          } else if (child.froms.length === 0) {
            child.where.push(`EXISTS (SELECT 1 FROM quads WHERE g = ${inner.sql})`);
          }
          this.mergeInner(scope, child);
          break;
        }
        case 'bind': {
          const name = pattern.variable.value;
          if (scope.vars.has(name)) {
            throw new InvalidSparqlError(`BIND to in-scope variable ?${name}`);
          }
          const val = this.expr(pattern.expression, scope, false);
          if (val.c && val.sql.startsWith('-')) {
            this.tempTermsUsed = true;
          }
          scope.vars.set(name, { sql: val.sql, type: val.t, nullable: true });
          break;
        }
        case 'values':
          this.values(scope, pattern.values);
          break;
        case 'query': {
          const sub = this.compileSelect(pattern, graph);
          this.joinDerived(scope, sub);
          const info = sub.graphCol ? scope.vars.get(sub.graphCol) : undefined;
          if (graph.kind === 'var' && info) {
            scope.graphBound.add(graph.name);
            const conds: string[] = [];
            this.bind(scope, graph.name, info, conds);
            scope.where.push(...conds);
          }
          break;
        }
        default:
          throw new UnsupportedSparqlError(`pattern type ${pattern.type}`);
      }
    }
    for (const filter of filters) {
      scope.where.push(this.ebv(this.expr(filter, scope, false)));
    }
  }

  /** A new independent scope that shares the parent's correlation status. */
  child(parent: Scope): Scope {
    const scope = new Scope();
    scope.correlated = parent.correlated;
    return scope;
  }

  /** Joins a new binding for `name` into the scope with SPARQL compatible-mapping semantics. */
  bind(scope: Scope, name: string, info: VarInfo, conds: string[]): void {
    const existing = scope.vars.get(name);
    if (!existing) {
      scope.vars.set(name, info);
      return;
    }
    conds.push(compat(existing, info));
    if (existing.nullable) {
      scope.vars.set(name, {
        sql: `COALESCE(${existing.sql}, ${info.sql})`,
        type: existing.type,
        nullable: info.nullable,
      });
    }
  }

  triple(scope: Scope, subject: PatternTerm, predicate: Predicate, object: PatternTerm, graph: Graph): void {
    if (isPath(predicate)) {
      this.path(scope, subject, predicate, object, graph);
      return;
    }
    const alias = this.#alias('q');
    const conds: string[] = [];
    scope.froms.push({ alias, src: 'quads', join: 'inner', on: [] });
    for (const [col, term] of [
      ['s', subject],
      ['p', predicate],
      ['o', object],
    ] as const) {
      this.#bindPosition(scope, `${alias}.${col}`, term, conds);
    }
    this.#hintSelectivity(alias, predicate, object, conds);
    this.#graphConds(alias, graph, scope, conds);
    scope.where.push(...conds);
  }

  //
  // Property paths.
  //

  path(scope: Scope, subject: PatternTerm, path: PropertyPath, object: PatternTerm, graph: Graph): void {
    if (graph.kind === 'var') {
      throw new UnsupportedSparqlError('property path inside GRAPH ?var');
    }
    if (path.pathType === '/') {
      let current = subject;
      path.items.forEach((item, index) => {
        const next: PatternTerm =
          index === path.items.length - 1 ? object : { termType: 'Variable', value: `_p${this.#hidden++}` };
        this.triple(scope, current, item, next, graph);
        current = next;
      });
      return;
    }
    const first = path.items[0];
    if (path.pathType === '^' && !isPath(first)) {
      this.triple(scope, object, first, subject, graph);
      return;
    }
    // Anchor recursive closures on a bound end so the CTE only walks reachable nodes.
    const anchor = this.#anchor(scope, subject, object);
    const rel = this.pathSql(path, graph, anchor);
    const alias = this.#alias('r');
    const conds: string[] = [];
    scope.froms.push({ alias, src: `(${rel})`, join: 'inner', on: [] });
    this.#bindPosition(scope, `${alias}.s`, subject, conds);
    this.#bindPosition(scope, `${alias}.o`, object, conds);
    scope.where.push(...conds);
  }

  /** Relation (s, o) for a path; `anchor` (top level only) restricts closures to reachable nodes. */
  pathSql(path: IriTerm | PropertyPath, graph: Graph, anchor?: Anchor): string {
    if (!isPath(path)) {
      return this.#edge(path, graph);
    }
    const items: (IriTerm | PropertyPath)[] = path.items;
    switch (path.pathType) {
      case '^':
        return `SELECT o AS s, s AS o FROM (${this.pathSql(items[0], graph, anchor && { side: anchor.side === 's' ? 'o' : 's', seed: anchor.seed })})`;
      case '/': {
        const parts = items.map((item) => this.pathSql(item, graph));
        let sql = `SELECT x0.s AS s, x${parts.length - 1}.o AS o FROM (${parts[0]}) x0`;
        for (let index = 1; index < parts.length; index++) {
          sql += ` JOIN (${parts[index]}) x${index} ON x${index}.s = x${index - 1}.o`;
        }
        return sql;
      }
      case '|':
        return items.map((item) => `SELECT s, o FROM (${this.pathSql(item, graph)})`).join(' UNION ALL ');
      case '!': {
        const forward: string[] = [];
        const backward: string[] = [];
        const collect = (item: IriTerm | PropertyPath) => {
          if (!isPath(item)) {
            forward.push(this.resolver.constId(item));
          } else if (item.pathType === '|') {
            item.items.forEach(collect);
          } else {
            const [target] = item.items;
            if (item.pathType !== '^' || isPath(target)) {
              throw new UnsupportedSparqlError(`path ${item.pathType} inside a negated property set`);
            }
            backward.push(this.resolver.constId(target));
          }
        };
        items.forEach(collect);
        const graphCond = this.#graphFilter(graph).replace(' WHERE ', ' AND ');
        const parts: string[] = [];
        if (forward.length > 0 || backward.length === 0) {
          parts.push(`SELECT s, o FROM quads WHERE p NOT IN (${forward.join(', ') || 'NULL'})${graphCond}`);
        }
        if (backward.length > 0) {
          parts.push(`SELECT o AS s, s AS o FROM quads WHERE p NOT IN (${backward.join(', ')})${graphCond}`);
        }
        return parts.join(' UNION ALL ');
      }
      case '+':
      case '*':
      case '?':
        return this.#closure(path.pathType, items[0], graph, anchor);
      default:
        throw new UnsupportedSparqlError('property path');
    }
  }

  //
  // Joins of sub-scopes.
  //

  mergeInner(scope: Scope, child: Scope): void {
    const conds: string[] = [];
    if (child.froms.length > 0 && child.froms[0].join === 'left') {
      child.froms.unshift({ alias: this.#alias('one'), src: '(SELECT 1)', join: 'inner', on: [] });
    }
    scope.froms.push(...child.froms);
    scope.where.push(...child.where);
    child.graphBound.forEach((name) => scope.graphBound.add(name));
    for (const [name, info] of child.vars) {
      this.bind(scope, name, info, conds);
    }
    scope.where.push(...conds);
  }

  optional(scope: Scope, patterns: Pattern[], graph: Graph): void {
    const filters: Expression[] = [];
    const rest: Pattern[] = [];
    for (const pattern of patterns) {
      if (pattern.type === 'filter') {
        filters.push(pattern.expression);
      } else {
        rest.push(pattern);
      }
    }
    const child = this.child(scope);
    this.group(rest, child, graph);
    let childVars: Map<string, VarInfo>;
    let item: FromItem;
    const simple =
      child.froms.length === 1 &&
      child.froms[0].src === 'quads' &&
      [...child.vars.values()].every((info) => /^q\d+\.[spog]$/.test(info.sql));
    if (simple) {
      item = { ...child.froms[0], join: 'left', on: [...child.where] };
      childVars = child.vars;
    } else {
      const alias = this.#alias('o');
      const entries = [...child.vars.entries()];
      const cols = entries.length
        ? entries.map(([name, info]) => `${info.sql} AS ${quoteName(name)}`).join(', ')
        : '1 AS "_"';
      item = { alias, src: `(SELECT ${cols} ${this.fromWhere(child)})`, join: 'left', on: [] };
      childVars = new Map(entries.map(([name, info]) => [name, { ...info, sql: `${alias}.${quoteName(name)}` }]));
    }
    // Filter scope: merged solution (shared vars take the outer value when bound).
    const merged = new Scope();
    merged.correlated = scope.correlated;
    for (const [name, info] of childVars) {
      const outer = scope.vars.get(name);
      if (outer) {
        item.on.push(compat(outer, info));
        merged.vars.set(name, outer.nullable ? { ...outer, sql: `COALESCE(${outer.sql}, ${info.sql})` } : outer);
      } else {
        merged.vars.set(name, info);
      }
    }
    for (const [name, info] of scope.vars) {
      if (!merged.vars.has(name)) {
        merged.vars.set(name, info);
      }
    }
    for (const filter of filters) {
      item.on.push(this.ebv(this.expr(filter, merged, false)));
    }
    if (scope.froms.length === 0) {
      scope.froms.push({ alias: this.#alias('one'), src: '(SELECT 1)', join: 'inner', on: [] });
    }
    scope.froms.push(item);
    for (const [name, info] of childVars) {
      const outer = scope.vars.get(name);
      if (!outer) {
        scope.vars.set(name, { ...info, nullable: true });
      } else if (outer.nullable) {
        scope.vars.set(name, { ...outer, sql: `COALESCE(${outer.sql}, ${info.sql})` });
      }
    }
  }

  joinUnion(scope: Scope, branches: Scope[]): void {
    const types = new Map<string, VType>();
    for (const branch of branches) {
      for (const [name, info] of branch.vars) {
        const known = types.get(name);
        if (known === undefined) {
          types.set(name, info.type);
        } else if (known !== info.type) {
          throw new UnsupportedSparqlError(`UNION branches bind ?${name} with different types`);
        }
      }
    }
    const names = [...types.keys()];
    branches[0]?.graphBound.forEach((name) => {
      if (branches.every((branch) => branch.graphBound.has(name))) {
        scope.graphBound.add(name);
      }
    });
    const sql = branches
      .map((branch) => {
        const cols = names.length
          ? names.map((name) => `${branch.vars.get(name)?.sql ?? 'NULL'} AS ${quoteName(name)}`).join(', ')
          : '1 AS "_"';
        return `SELECT ${cols} ${this.fromWhere(branch)}`;
      })
      .join(' UNION ALL ');
    this.joinDerived(scope, {
      sql,
      cols: [...types].map(([name, type]) => ({
        name,
        type,
        nullable: branches.some((branch) => branch.vars.get(name)?.nullable ?? true),
      })),
    });
  }

  joinDerived(scope: Scope, sub: Compiled): void {
    const alias = this.#alias('d');
    scope.froms.push({ alias, src: `(${sub.sql})`, join: 'inner', on: [] });
    const conds: string[] = [];
    for (const col of sub.cols) {
      this.bind(
        scope,
        col.name,
        { sql: `${alias}.${quoteName(col.name)}`, type: col.type, nullable: col.nullable },
        conds,
      );
    }
    scope.where.push(...conds);
  }

  minus(scope: Scope, patterns: Pattern[], graph: Graph): void {
    const child = this.child(scope);
    this.group(patterns, child, graph);
    const shared: [VarInfo, VarInfo][] = [];
    const disjointCheck: [VarInfo, VarInfo][] = [];
    for (const [name, inner] of child.vars) {
      const outer = scope.vars.get(name);
      if (outer) {
        shared.push([outer, inner]);
        // Inside GRAPH ?g both sides are in the same graph, but ?g is not in either side's domain.
        if (graph.kind !== 'var' || graph.name !== name) {
          disjointCheck.push([outer, inner]);
        }
      }
    }
    if (disjointCheck.length === 0) {
      return;
    }
    const conds = shared.map(([outer, inner]) => compat(outer, inner));
    const overlap = disjointCheck
      .map((pair) => {
        const parts = pair.filter((info) => info.nullable).map((info) => `${info.sql} IS NOT NULL`);
        return parts.length ? and(parts) : '1';
      })
      .join(' OR ');
    scope.where.push(`NOT EXISTS (SELECT 1 ${this.fromWhere(child, [...conds, overlap])})`);
  }

  values(scope: Scope, rows: ValuePatternRow[]): void {
    const names = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    if (rows.length === 0) {
      scope.where.push('0');
      return;
    }
    const tuples = rows.map(
      (row) =>
        `(${names
          .map((key) => {
            const term = row[key];
            if (!term) {
              return 'NULL';
            }
            const id = this.resolver.constId(term);
            if (id.startsWith('-')) {
              this.tempTermsUsed = true;
            }
            return id;
          })
          .join(', ')})`,
    );
    const alias = this.#alias('v');
    if (names.length === 0) {
      // Rows without variables still multiply the solutions they join.
      scope.froms.push({
        alias,
        src: `(SELECT 1 FROM (VALUES ${rows.map(() => '(1)').join(', ')}))`,
        join: 'inner',
        on: [],
      });
      return;
    }
    const cols = names.map((key, index) => `column${index + 1} AS ${quoteName(key.replace(/^\?/, ''))}`).join(', ');
    scope.froms.push({ alias, src: `(SELECT ${cols} FROM (VALUES ${tuples.join(', ')}))`, join: 'inner', on: [] });
    const conds: string[] = [];
    names.forEach((key) => {
      const name = key.replace(/^\?/, '');
      const undef = rows.some((row) => !row[key]);
      this.bind(scope, name, { sql: `${alias}.${quoteName(name)}`, type: 'id', nullable: undef }, conds);
    });
    scope.where.push(...conds);
  }

  fromWhere(scope: Scope, extra: string[] = []): string {
    let sql = '';
    scope.froms.forEach((item, index) => {
      if (index === 0) {
        invariant(item.join !== 'left', 'first FROM item cannot be a LEFT JOIN');
        sql += `FROM ${item.src} AS ${item.alias}`;
      } else if (item.join === 'left') {
        sql += ` LEFT JOIN ${item.src} AS ${item.alias} ON ${and(item.on)}`;
      } else {
        sql += ` JOIN ${item.src} AS ${item.alias}`;
      }
    });
    const where = [...scope.where, ...extra];
    if (where.length > 0) {
      sql += ` WHERE ${and(where)}`;
    }
    return sql;
  }

  //
  // Expressions.
  //

  expr(expr: Expression, scope: Scope, agg: boolean): Val {
    if (Array.isArray(expr)) {
      throw new InvalidSparqlError('expression list outside IN');
    }
    if ('termType' in expr) {
      if (expr.termType === 'Variable') {
        const info = scope.vars.get(expr.value);
        return info ? { t: info.type, sql: info.sql } : { t: 'id', sql: 'NULL' };
      }
      return this.#const(expr);
    }
    if (expr.type === 'aggregate') {
      const grouped = this.#aggregates;
      if (!agg || !grouped) {
        throw new InvalidSparqlError('aggregate outside of aggregation');
      }
      const val = this.aggregate(expr, grouped.scope);
      const name = `_a${this.#hidden++}`;
      grouped.cols.push(`${val.sql} AS ${quoteName(name)}`);
      return { t: val.t, sql: `${grouped.alias}.${quoteName(name)}` };
    }
    const sub = (arg: Expression | Pattern) => this.expr(asExpression(arg), scope, agg);
    if (expr.type === 'functionCall') {
      const fn = expr.function;
      const iri = typeof fn === 'string' ? fn : fn.value;
      if (expr.args.length !== 1) {
        throw new UnsupportedSparqlError(`function <${iri}>`);
      }
      return this.cast(iri, sub(expr.args[0]));
    }
    const op = expr.operator.toLowerCase();
    const args = expr.args;
    switch (op) {
      case '&&':
        return { t: 'bool', sql: `(${this.ebv(sub(args[0]))} AND ${this.ebv(sub(args[1]))})` };
      case '||':
        return { t: 'bool', sql: `(${this.ebv(sub(args[0]))} OR ${this.ebv(sub(args[1]))})` };
      case '!':
        return { t: 'bool', sql: `(NOT ${this.ebv(sub(args[0]))})` };
      case '=':
      case '!=':
      case '<':
      case '>':
      case '<=':
      case '>=':
        return { t: 'bool', sql: this.compare(op, sub(args[0]), sub(args[1])) };
      case '+':
      case '-':
      case '*':
      case '/': {
        if (args.length === 1) {
          return { t: 'num', sql: `(${op}${this.num(sub(args[0]))})` };
        }
        const left = this.num(sub(args[0]));
        const right = this.num(sub(args[1]));
        return { t: 'num', sql: op === '/' ? `(CAST(${left} AS REAL) / ${right})` : `(${left} ${op} ${right})` };
      }
      case 'uminus':
        return { t: 'num', sql: `(-${this.num(sub(args[0]))})` };
      case 'in':
      case 'notin': {
        const left = sub(args[0]);
        const candidates = args[1];
        if (!Array.isArray(candidates)) {
          throw new InvalidSparqlError(`${op} without a list`);
        }
        const list = candidates.map((arg) => this.compare('=', left, sub(arg)));
        const sql = list.length ? `(${list.join(' OR ')})` : '0';
        return { t: 'bool', sql: op === 'in' ? sql : `(NOT ${sql})` };
      }
      case 'bound':
        return { t: 'bool', sql: `(${sub(args[0]).sql} IS NOT NULL)` };
      case 'if': {
        const cond = this.ebv(sub(args[0]));
        const [then, otherwise] = [sub(args[1]), sub(args[2])];
        this.#sameType(then, otherwise);
        return {
          t: then.t,
          sql: `(CASE WHEN ${cond} IS NULL THEN NULL WHEN ${cond} THEN ${then.sql} ELSE ${otherwise.sql} END)`,
        };
      }
      case 'coalesce': {
        if (args.length === 0) {
          return { t: 'id', sql: 'NULL' };
        }
        const vals = args.map(sub);
        vals.slice(1).forEach((val) => this.#sameType(vals[0], val));
        return { t: vals[0].t, sql: `COALESCE(${vals.map((val) => val.sql).join(', ')})` };
      }
      case 'sameterm':
        return { t: 'bool', sql: `(${this.idOf(sub(args[0]))} = ${this.idOf(sub(args[1]))})` };
      case 'isiri':
      case 'isuri':
        return { t: 'bool', sql: `(${this.kind(sub(args[0]))} = ${Kind.IRI})` };
      case 'isblank':
        return { t: 'bool', sql: `(${this.kind(sub(args[0]))} = ${Kind.BLANK})` };
      case 'isliteral':
        return { t: 'bool', sql: `(${this.kind(sub(args[0]))} >= ${Kind.STR})` };
      case 'isnumeric':
        return { t: 'bool', sql: `(${this.kind(sub(args[0]))} = ${Kind.NUM})` };
      case 'str':
        return { t: 'str', sql: this.lex(sub(args[0])) };
      case 'lang': {
        const val = sub(args[0]);
        if (val.c) {
          return { t: 'str', sql: val.c.kind >= Kind.STR ? strLit(val.c.lang ?? '') : 'NULL' };
        }
        if (val.t !== 'id') {
          return { t: 'str', sql: `''` };
        }
        return { t: 'str', sql: termCol(val.sql, `COALESCE(lang, '')`, `kind >= ${Kind.STR}`) };
      }
      case 'langmatches': {
        const tag = this.str(sub(args[0]));
        const range = this.str(sub(args[1]));
        return {
          t: 'bool',
          sql: `(CASE WHEN ${range} = '*' THEN ${tag} <> '' ELSE (lower(${tag}) = lower(${range}) OR lower(${tag}) LIKE lower(${range}) || '-%') END)`,
        };
      }
      case 'strlen':
        return { t: 'num', sql: `length(${this.str(sub(args[0]))})` };
      case 'ucase':
        return { t: 'str', sql: `upper(${this.str(sub(args[0]))})` };
      case 'lcase':
        return { t: 'str', sql: `lower(${this.str(sub(args[0]))})` };
      case 'substr': {
        const text = this.str(sub(args[0]));
        const start = this.num(sub(args[1]));
        // SPARQL positions are 1-based like SQLite's; a start < 1 shortens the length accordingly.
        return args[2]
          ? { t: 'str', sql: `substr(${text}, ${start}, ${this.num(sub(args[2]))})` }
          : { t: 'str', sql: `substr(${text}, ${start})` };
      }
      case 'strstarts': {
        const [text, prefix] = [this.str(sub(args[0])), this.str(sub(args[1]))];
        return { t: 'bool', sql: `(substr(${text}, 1, length(${prefix})) = ${prefix})` };
      }
      case 'strends': {
        const [text, suffix] = [this.str(sub(args[0])), this.str(sub(args[1]))];
        return { t: 'bool', sql: `(length(${suffix}) = 0 OR substr(${text}, -length(${suffix})) = ${suffix})` };
      }
      case 'contains':
        return { t: 'bool', sql: `(instr(${this.str(sub(args[0]))}, ${this.str(sub(args[1]))}) > 0)` };
      case 'strbefore': {
        const [text, needle] = [this.str(sub(args[0])), this.str(sub(args[1]))];
        return { t: 'str', sql: `substr(${text}, 1, instr(${text}, ${needle}) - 1)` };
      }
      case 'strafter': {
        const [text, needle] = [this.str(sub(args[0])), this.str(sub(args[1]))];
        return {
          t: 'str',
          sql: `(CASE WHEN instr(${text}, ${needle}) = 0 THEN '' ELSE substr(${text}, instr(${text}, ${needle}) + length(${needle})) END)`,
        };
      }
      case 'concat':
        return { t: 'str', sql: args.length ? `(${args.map((arg) => this.str(sub(arg))).join(' || ')})` : `''` };
      case 'regex': {
        const text = this.str(sub(args[0]));
        const pattern = asExpression(args[1]);
        const flagsArg = args[2];
        const flags = flagsArg && 'termType' in flagsArg ? flagsArg.value : '';
        if (Array.isArray(pattern) || !('termType' in pattern) || pattern.termType !== 'Literal') {
          throw new UnsupportedSparqlError('REGEX with a non-constant pattern');
        }
        return { t: 'bool', sql: regexToSql(text, pattern.value, flags) };
      }
      case 'year':
      case 'month':
      case 'day':
      case 'hours':
      case 'minutes': {
        const lex = this.dateLex(sub(args[0]));
        const [start, length] = DATE_PARTS[op];
        return { t: 'num', sql: `CAST(substr(${lex}, ${start}, ${length}) AS INTEGER)` };
      }
      case 'seconds':
        return { t: 'num', sql: `CAST(substr(${this.dateLex(sub(args[0]))}, 18) AS REAL)` };
      case 'abs':
        return { t: 'num', sql: `abs(${this.num(sub(args[0]))})` };
      case 'round':
        return { t: 'num', sql: `round(${this.num(sub(args[0]))} + 0.0)` };
      case 'floor': {
        const value = this.num(sub(args[0]));
        return { t: 'num', sql: `(CAST(${value} AS INTEGER) - (${value} < CAST(${value} AS INTEGER)))` };
      }
      case 'ceil': {
        const value = this.num(sub(args[0]));
        return { t: 'num', sql: `(CAST(${value} AS INTEGER) + (${value} > CAST(${value} AS INTEGER)))` };
      }
      case 'exists':
      case 'notexists': {
        const body = args[0];
        if (!isPattern(body)) {
          throw new InvalidSparqlError(`${op} without a graph pattern`);
        }
        const child = new Scope();
        child.correlated = true;
        for (const [name, info] of scope.vars) {
          child.vars.set(name, info);
        }
        this.group(body.type === 'group' ? body.patterns : [body], child, this.#graph);
        if (child.froms.length > 0 && child.froms[0].join === 'left') {
          child.froms.unshift({ alias: this.#alias('one'), src: '(SELECT 1)', join: 'inner', on: [] });
        }
        const sql = `EXISTS (SELECT 1 ${this.fromWhere(child)})`;
        return { t: 'bool', sql: op === 'exists' ? sql : `(NOT ${sql})` };
      }
      default:
        throw new UnsupportedSparqlError(`function ${op}`);
    }
  }

  aggregate(expr: AggregateExpression, scope: Scope): Val {
    const name = expr.aggregation.toLowerCase();
    const distinct = expr.distinct ? 'DISTINCT ' : '';
    const inner = expr.expression;
    if (isWildcard(inner)) {
      if (name !== 'count' || expr.distinct) {
        throw new UnsupportedSparqlError(`${name}(${distinct}*)`);
      }
      return { t: 'num', sql: 'COUNT(*)' };
    }
    const val = this.expr(inner, scope, false);
    switch (name) {
      case 'count':
        return { t: 'num', sql: `COUNT(${distinct}${val.sql})` };
      case 'sum':
      case 'avg': {
        // A non-numeric member is an error, which makes the whole aggregate unbound.
        const value = this.num(val);
        return {
          t: 'num',
          sql: `(CASE WHEN SUM(${value} IS NULL) > 0 THEN NULL ELSE COALESCE(${name.toUpperCase()}(${distinct}${value}), 0) END)`,
        };
      }
      case 'min':
      case 'max': {
        if (val.t !== 'id') {
          return { t: val.t, sql: `${name.toUpperCase()}(${val.sql})` };
        }
        // Order key + id packed into text so MIN/MAX picks the term in SPARQL order and returns its id.
        const key = termCol(
          val.sql,
          `(CASE WHEN kind IN (${Kind.NUM}, ${Kind.DATE}) AND num < 0 THEN '30' || ${descendingDigits("printf('%030.12f', -num)")} WHEN kind IN (${Kind.NUM}, ${Kind.DATE}) THEN '31' || printf('%030.12f', num) WHEN kind >= ${Kind.STR} THEN '4' || lex WHEN kind = ${Kind.IRI} THEN '2' || lex ELSE '1' || lex END) || char(1) || id`,
        );
        const packed = `${name.toUpperCase()}(${key})`;
        return { t: 'id', sql: `CAST(substr(${packed}, instr(${packed}, char(1)) + 1) AS INTEGER)` };
      }
      case 'sample':
        return { t: val.t, sql: `MIN(${val.sql})` };
      case 'group_concat': {
        const separator = expr.separator ?? ' ';
        if (expr.distinct) {
          return { t: 'str', sql: `replace(group_concat(DISTINCT ${this.str(val, true)}), ',', ${strLit(separator)})` };
        }
        const text = this.str(val);
        // Any non-string member is an error, which makes the whole aggregate unbound.
        return {
          t: 'str',
          sql: `(CASE WHEN SUM(${text} IS NULL) > 0 THEN NULL ELSE COALESCE(group_concat(${text}, ${strLit(separator)}), '') END)`,
        };
      }
      default:
        throw new UnsupportedSparqlError(`aggregate ${name}`);
    }
  }

  cast(iri: string, val: Val): Val {
    switch (iri) {
      case `${XSD}decimal`:
      case `${XSD}double`:
      case `${XSD}float`:
      case `${XSD}integer`: {
        const integer = iri === `${XSD}integer`;
        // A string casts only from the target type's lexical space: no exponent for decimal, no point for integer.
        const lexical = integer ? INTEGER_LEX : iri === `${XSD}decimal` ? DECIMAL_LEX : DOUBLE_LEX;
        let sql: string;
        if (val.c) {
          const number =
            val.c.kind === Kind.NUM
              ? val.c.num
              : val.c.kind === Kind.STR && lexical.test(val.c.lex.trim())
                ? Number(val.c.lex)
                : null;
          sql = numLit(number === null ? null : integer ? Math.trunc(number) : number);
        } else if (val.t === 'num' || val.t === 'bool') {
          sql = val.sql;
        } else if (val.t === 'str') {
          sql = `(CASE WHEN ${numericLexSql(val.sql, lexical)} THEN CAST(trim(${val.sql}) AS REAL) END)`;
        } else {
          sql = termCol(
            val.sql,
            `CASE kind WHEN ${Kind.NUM} THEN num WHEN ${Kind.BOOL} THEN (lex IN ('true', '1')) WHEN ${Kind.STR} THEN (CASE WHEN ${numericLexSql('lex', lexical)} THEN CAST(trim(lex) AS REAL) END) END`,
          );
        }
        return { t: 'num', sql: integer ? `CAST(${sql} AS INTEGER)` : sql };
      }
      case `${XSD}string`:
        return { t: 'str', sql: this.lex(val) };
      case `${XSD}boolean`: {
        // Unlike EBV, a cast accepts only boolean lexical forms from strings and errors otherwise.
        if (val.c) {
          const { kind, lex, num } = val.c;
          const sql =
            kind === Kind.BOOL || kind === Kind.STR
              ? ['true', '1'].includes(lex.trim())
                ? '1'
                : ['false', '0'].includes(lex.trim())
                  ? '0'
                  : 'NULL'
              : kind === Kind.NUM && num !== null
                ? num !== 0
                  ? '1'
                  : '0'
                : 'NULL';
          return { t: 'bool', sql };
        }
        const fromLex = (lex: string) =>
          `(CASE WHEN trim(${lex}) IN ('true', '1') THEN 1 WHEN trim(${lex}) IN ('false', '0') THEN 0 END)`;
        switch (val.t) {
          case 'bool':
            return val;
          case 'num':
            return { t: 'bool', sql: `(${val.sql} <> 0)` };
          case 'str':
            return { t: 'bool', sql: fromLex(val.sql) };
          case 'id':
            return {
              t: 'bool',
              sql: termCol(
                val.sql,
                `CASE kind WHEN ${Kind.NUM} THEN num <> 0 WHEN ${Kind.BOOL} THEN lex IN ('true', '1') WHEN ${Kind.STR} THEN ${fromLex('lex')} END`,
              ),
            };
        }
        break;
      }
      default:
        throw new UnsupportedSparqlError(`function <${iri}>`);
    }
  }

  //
  // Accessors: each returns SQL that is NULL (= SPARQL error) when the value is not of the needed kind.
  //

  num(val: Val): string {
    if (val.c) {
      return val.c.kind === Kind.NUM ? numLit(val.c.num) : 'NULL';
    }
    switch (val.t) {
      case 'num':
        return val.sql;
      case 'id':
        return termCol(val.sql, 'num', `kind = ${Kind.NUM}`);
      default:
        return 'NULL';
    }
  }

  /** Value of a stored numeric, dateTime or boolean term as one comparable key (one lookup per side). */
  valueKey(val: Val): string {
    return termCol(
      val.sql,
      `CASE kind WHEN ${Kind.NUM} THEN 'n' || num WHEN ${Kind.DATE} THEN 'd' || num WHEN ${Kind.BOOL} THEN 'b' || (lex IN ('true', '1')) END`,
    );
  }

  date(val: Val): string {
    if (val.c) {
      return val.c.kind === Kind.DATE ? numLit(val.c.num) : 'NULL';
    }
    return val.t === 'id' ? termCol(val.sql, 'num', `kind = ${Kind.DATE}`) : 'NULL';
  }

  dateLex(val: Val): string {
    if (val.c) {
      return val.c.kind === Kind.DATE ? strLit(val.c.lex) : 'NULL';
    }
    return val.t === 'id' ? termCol(val.sql, 'lex', `kind = ${Kind.DATE}`) : 'NULL';
  }

  /** Lexical form of a string literal (simple or language-tagged); `any` accepts every literal/IRI. */
  str(val: Val, any = false): string {
    if (val.c) {
      return val.c.kind === Kind.STR || val.c.kind === Kind.LANG || (any && val.c.kind !== Kind.BLANK)
        ? strLit(val.c.lex)
        : 'NULL';
    }
    switch (val.t) {
      case 'str':
        return val.sql;
      case 'id':
        return any
          ? termCol(val.sql, 'lex', `kind <> ${Kind.BLANK}`)
          : termCol(val.sql, 'lex', `kind IN (${Kind.STR}, ${Kind.LANG})`);
      case 'num':
        return any ? `CAST(${val.sql} AS TEXT)` : 'NULL';
      case 'bool':
        return any ? `(CASE ${val.sql} WHEN 1 THEN 'true' WHEN 0 THEN 'false' END)` : 'NULL';
    }
  }

  /** STR(): lexical form of any literal or IRI. */
  lex(val: Val): string {
    return this.str(val, true);
  }

  kind(val: Val): string {
    if (val.c) {
      return String(val.c.kind);
    }
    switch (val.t) {
      case 'id':
        return termCol(val.sql, 'kind');
      case 'num':
        return `(CASE WHEN ${val.sql} IS NULL THEN NULL ELSE ${Kind.NUM} END)`;
      case 'str':
        return `(CASE WHEN ${val.sql} IS NULL THEN NULL ELSE ${Kind.STR} END)`;
      case 'bool':
        return `(CASE WHEN ${val.sql} IS NULL THEN NULL ELSE ${Kind.BOOL} END)`;
    }
  }

  idOf(val: Val): string {
    if (val.t !== 'id') {
      throw new UnsupportedSparqlError('computed value used as an RDF term');
    }
    return val.sql;
  }

  ebv(val: Val): string {
    if (val.c) {
      const enc = val.c;
      switch (enc.kind) {
        case Kind.BOOL:
          return enc.lex === 'true' || enc.lex === '1' ? '1' : '0';
        case Kind.NUM:
          return enc.num ? '1' : '0';
        case Kind.STR:
        case Kind.LANG:
          return enc.lex.length > 0 ? '1' : '0';
        default:
          return 'NULL';
      }
    }
    switch (val.t) {
      case 'bool':
        return val.sql;
      case 'num':
        return `(${val.sql} <> 0)`;
      case 'str':
        return `(length(${val.sql}) > 0)`;
      case 'id':
        return termCol(
          val.sql,
          `CASE kind WHEN ${Kind.BOOL} THEN lex IN ('true', '1') WHEN ${Kind.NUM} THEN num <> 0 WHEN ${Kind.STR} THEN length(lex) > 0 WHEN ${Kind.LANG} THEN length(lex) > 0 END`,
        );
    }
  }

  compare(op: string, left: Val, right: Val): string {
    const sqlOp = op === '!=' ? '<>' : op;
    const equality = op === '=' || op === '!=';
    const cmp = (lhs: string, rhs: string) => `(${lhs} ${sqlOp} ${rhs})`;
    const konst = left.c ?? right.c;
    if (konst) {
      switch (konst.kind) {
        case Kind.NUM:
          return cmp(this.num(left), this.num(right));
        case Kind.DATE:
          return cmp(this.date(left), this.date(right));
        case Kind.BOOL:
          return cmp(this.ebv(left), this.ebv(right));
        case Kind.STR:
          if (equality && left.t === 'id' && right.t === 'id') {
            return cmp(left.sql, right.sql);
          }
          return cmp(this.str(left), this.str(right));
        default:
          if (equality && left.t === 'id' && right.t === 'id') {
            return cmp(left.sql, right.sql);
          }
          if (equality) {
            return op === '=' ? '0' : '1';
          }
          return 'NULL';
      }
    }
    if (left.t === 'id' && right.t === 'id') {
      if (equality) {
        const same = `(${left.sql} = ${right.sql} OR COALESCE(${this.valueKey(left)} = ${this.valueKey(right)}, 0))`;
        return op === '=' ? same : `(NOT ${same})`;
      }
      return `COALESCE(${cmp(this.num(left), this.num(right))}, ${cmp(this.date(left), this.date(right))}, ${cmp(this.str(left), this.str(right))})`;
    }
    const type = left.t === 'id' ? right.t : left.t;
    switch (type) {
      case 'num':
        return cmp(this.num(left), this.num(right));
      case 'str':
        return cmp(this.str(left), this.str(right));
      case 'bool':
        return cmp(this.ebv(left), this.ebv(right));
      default:
        return cmp(left.sql, right.sql);
    }
  }

  /** ORDER BY keys in SPARQL term order: unbound < blank < IRI < literal; numbers/dates by value. */
  orderKeys(val: Val): string[] {
    if (val.c) {
      return [];
    }
    if (val.t !== 'id') {
      return [val.sql];
    }
    return [
      termCol(val.sql, `CASE kind WHEN ${Kind.BLANK} THEN 1 WHEN ${Kind.IRI} THEN 2 ELSE 3 END`),
      termCol(val.sql, 'num'),
      termCol(val.sql, 'lex'),
    ];
  }

  #alias(prefix: string): string {
    return `${prefix}${this.#aliases++}`;
  }

  /** Binds a variable/blank node to `col`, or constrains `col` to a constant's id. */
  #bindPosition(scope: Scope, col: string, term: PatternTerm | IriTerm, conds: string[]): void {
    if (term.termType === 'Variable') {
      this.bind(scope, term.value, { sql: col, type: 'id', nullable: false }, conds);
    } else if (term.termType === 'BlankNode') {
      this.bind(scope, `_b_${term.value}`, { sql: col, type: 'id', nullable: false }, conds);
    } else {
      conds.push(`${col} = ${this.resolver.constId(term)}`);
    }
  }

  /**
   * Wraps constant-position conditions in `likelihood()`: sqlite_stat1 only has per-column averages, so
   * without this a skewed constant (`rdf:type` of a large class) looks as selective as a rare one.
   */
  #hintSelectivity(alias: string, predicate: PatternTerm | IriTerm, object: PatternTerm, conds: string[]): void {
    if (!this.resolver.selectivity || predicate.termType !== 'NamedNode') {
      return;
    }
    const p = this.resolver.constId(predicate);
    const o =
      object.termType === 'NamedNode' || object.termType === 'Literal' ? this.resolver.constId(object) : undefined;
    const hint = this.resolver.selectivity(p, o);
    const wrap = (cond: string, probability: number | undefined) => {
      const index = conds.indexOf(cond);
      if (index >= 0 && probability !== undefined) {
        conds[index] = `likelihood(${cond}, ${probability.toExponential(3)})`;
      }
    };
    wrap(`${alias}.p = ${p}`, hint?.p);
    wrap(`${alias}.o = ${o}`, hint?.o);
  }

  #graphConds(alias: string, graph: Graph, scope: Scope, conds: string[]): void {
    switch (graph.kind) {
      case 'default':
        if (this.resolver.namedGraphs) {
          conds.push(`${alias}.g = 0`);
        }
        break;
      case 'const':
        conds.push(`${alias}.g = ${graph.sql}`);
        break;
      case 'var':
        scope.graphBound.add(graph.name);
        conds.push(`${alias}.g <> 0`);
        this.bind(scope, graph.name, { sql: `${alias}.g`, type: 'id', nullable: false }, conds);
        break;
    }
  }

  /** Binds `name` to every named graph unless the scope already binds it to a graph column. */
  #bindGraphNames(scope: Scope, name: string): void {
    if (scope.graphBound.has(name)) {
      return;
    }
    scope.graphBound.add(name);
    const alias = this.#alias('gn');
    scope.froms.push({ alias, src: '(SELECT DISTINCT g FROM quads WHERE g <> 0)', join: 'inner', on: [] });
    const conds: string[] = [];
    this.bind(scope, name, { sql: `${alias}.g`, type: 'id', nullable: false }, conds);
    scope.where.push(...conds);
  }

  /** Start-node set for a closure: a constant, or the current bindings of an already-bound variable. */
  #anchor(scope: Scope, subject: PatternTerm, object: PatternTerm): Anchor | undefined {
    for (const [side, term] of [
      ['s', subject],
      ['o', object],
    ] as const) {
      if (term.termType === 'NamedNode' || term.termType === 'Literal') {
        return { side, seed: `SELECT ${this.resolver.constId(term)} AS n` };
      }
    }
    for (const [side, term] of [
      ['s', subject],
      ['o', object],
    ] as const) {
      const name =
        term.termType === 'Variable' ? term.value : term.termType === 'BlankNode' ? `_b_${term.value}` : undefined;
      const info = name ? scope.vars.get(name) : undefined;
      if (info && info.type === 'id' && !scope.correlated && scope.froms.length > 0) {
        return { side, seed: `SELECT DISTINCT ${info.sql} AS n ${this.fromWhere(scope)}`, bound: true };
      }
    }
    return undefined;
  }

  #edge(iri: IriTerm, graph: Graph): string {
    const conds = [`p = ${this.resolver.constId(iri)}`];
    if (graph.kind === 'const') {
      conds.push(`g = ${graph.sql}`);
    } else if (this.resolver.namedGraphs) {
      conds.push('g = 0');
    }
    return `SELECT s, o FROM quads WHERE ${conds.join(' AND ')}`;
  }

  #graphFilter(graph: Graph): string {
    return graph.kind === 'const' ? ` WHERE g = ${graph.sql}` : this.resolver.namedGraphs ? ' WHERE g = 0' : '';
  }

  /** `+` / `*` / `?` as a recursive CTE (set semantics), walking from the anchored end when there is one. */
  #closure(pathType: '+' | '*' | '?', item: IriTerm | PropertyPath, graph: Graph, anchor?: Anchor): string {
    const step = this.pathSql(item, graph);
    const zero = pathType !== '+';
    // The zero-length step of an unanchored path only reaches graph nodes, so a variable's bindings
    // seed it only where they are nodes; a constant end matches itself regardless.
    const seed =
      anchor?.bound && zero
        ? `SELECT n FROM (${anchor.seed}) WHERE EXISTS (SELECT 1 FROM quads WHERE s = n${this.#graphFilter(graph).replace(' WHERE ', ' AND ')}) OR EXISTS (SELECT 1 FROM quads WHERE o = n${this.#graphFilter(graph).replace(' WHERE ', ' AND ')})`
        : anchor?.seed;
    if (pathType === '?') {
      const nodes = seed
        ? `SELECT n AS s, n AS o FROM (${seed})`
        : `SELECT s, s FROM quads${this.#graphFilter(graph)} UNION SELECT o, o FROM quads${this.#graphFilter(graph)}`;
      return `SELECT s, o FROM (${step}) UNION ${nodes}`;
    }
    const cte = this.#alias('c');
    const [from, to] = anchor?.side === 'o' ? ['o', 's'] : ['s', 'o'];
    let init: string;
    if (anchor) {
      init = zero
        ? `SELECT n AS st, n AS n FROM (${seed})`
        : `SELECT a.n AS st, e.${to} AS n FROM (${anchor.seed}) a CROSS JOIN (${step}) e ON e.${from} = a.n`;
    } else {
      init = zero
        ? `SELECT s AS st, s AS n FROM quads${this.#graphFilter(graph)} UNION SELECT o, o FROM quads${this.#graphFilter(graph)}`
        : `SELECT ${from} AS st, ${to} AS n FROM (${step})`;
    }
    // A plain (or inverted) IRI step joins `quads` directly so each iteration is an index probe.
    let edge: { iri: IriTerm; forward: boolean } | undefined;
    if (!isPath(item)) {
      edge = { iri: item, forward: true };
    } else if (item.pathType === '^') {
      const [target] = item.items;
      if (!isPath(target)) {
        edge = { iri: target, forward: false };
      }
    }
    let recursive: string;
    if (edge) {
      // Column of `quads` matching the walk direction: forward walks s->o, inverse o->s.
      const [qFrom, qTo] = (from === 's') === edge.forward ? ['s', 'o'] : ['o', 's'];
      const graphCond = this.#graphFilter(graph).replace(' WHERE ', ' AND e.');
      // CROSS JOIN pins the CTE queue as the outer loop; otherwise SQLite may scan `quads` per step (Q7: 2 s -> 3 ms).
      recursive = `SELECT ${cte}.st, e.${qTo} FROM ${cte} CROSS JOIN quads e ON e.${qFrom} = ${cte}.n AND e.p = ${this.resolver.constId(edge.iri)}${graphCond}`;
    } else {
      recursive = `SELECT ${cte}.st, e.${to} FROM ${cte} CROSS JOIN (${step}) e ON e.${from} = ${cte}.n`;
    }
    this.ctes.push(`${cte}(st, n) AS (${init} UNION ${recursive})`);
    return anchor?.side === 'o' ? `SELECT n AS s, st AS o FROM ${cte}` : `SELECT st AS s, n AS o FROM ${cte}`;
  }

  #const(term: SparqlTerm): Val {
    return { t: 'id', sql: this.resolver.constId(term), c: encodeTerm(toTerm(term)) };
  }

  #sameType(left: Val, right: Val): void {
    if (left.t !== right.t && left.sql !== 'NULL' && right.sql !== 'NULL') {
      throw new UnsupportedSparqlError('mixed-type IF/COALESCE');
    }
  }
}

const isWildcardProjection = (variables: SelectShape['variables']): variables is [WildcardLike] =>
  variables.length === 1 && isWildcard(variables[0]);

/** SQL condition for SPARQL compatible mappings of one variable bound on both sides. */
const compat = (left: VarInfo, right: VarInfo): string => {
  if (left.type !== right.type) {
    throw new UnsupportedSparqlError('join on a variable bound to values of different types');
  }
  const eq = `${left.sql} = ${right.sql}`;
  const nulls = [left, right].filter((info) => info.nullable).map((info) => `${info.sql} IS NULL`);
  return nulls.length ? `(${[...nulls, eq].join(' OR ')})` : eq;
};

/** Variables an expression reads (outside EXISTS bodies). */
const variablesOf = (expr: Expression | Pattern): string[] => {
  if (Array.isArray(expr)) {
    return expr.flatMap(variablesOf);
  }
  if ('termType' in expr) {
    return expr.termType === 'Variable' ? [expr.value] : [];
  }
  if (expr.type === 'operation' || expr.type === 'functionCall') {
    return expr.args.flatMap(variablesOf);
  }
  if (expr.type === 'aggregate') {
    return isWildcard(expr.expression) ? [] : variablesOf(expr.expression);
  }
  return [];
};

const containsAggregate = (expr: Expression | Pattern): boolean => {
  if (Array.isArray(expr) || 'termType' in expr) {
    return false;
  }
  if (expr.type === 'aggregate') {
    return true;
  }
  if (expr.type === 'operation') {
    return expr.args.some(containsAggregate);
  }
  if (expr.type === 'functionCall') {
    return expr.args.some(containsAggregate);
  }
  return false;
};

type RegexToken = { lit: string } | { any: true } | { star: true };
type RegexSeq = { tokens: RegexToken[]; start: boolean; end: boolean };

/**
 * Translates the regex subset that maps onto LIKE (case-insensitive, flag "i") or GLOB (case-sensitive):
 * literals, `.`, `.*`, `^`, `$`, escapes and alternation (top level or one group level).
 */
const regexToSql = (text: string, pattern: string, flags: string): string => {
  const insensitive = flags.includes('i');
  if (flags.replace('i', '') !== '') {
    throw new UnsupportedSparqlError(`REGEX flags ${flags}`);
  }
  const alternatives = parseRegex(pattern, true);
  if (alternatives.length > 64) {
    throw new UnsupportedSparqlError('REGEX alternation too large');
  }
  const render = (alt: RegexSeq) => {
    let out = alt.start ? '' : insensitive ? '%' : '*';
    for (const token of alt.tokens) {
      if ('lit' in token) {
        out += insensitive
          ? token.lit.replace(/[\\%_]/g, (match) => `\\${match}`)
          : token.lit.replace(/[*?[]/g, (match) => `[${match}]`);
      } else if ('any' in token) {
        out += insensitive ? '_' : '?';
      } else {
        out += insensitive ? '%' : '*';
      }
    }
    out += alt.end ? '' : insensitive ? '%' : '*';
    return insensitive ? `${text} LIKE ${strLit(out)} ESCAPE '\\'` : `${text} GLOB ${strLit(out)}`;
  };
  return `(${alternatives.map(render).join(' OR ')})`;
};

/** Expands a regex into its alternatives (each a token sequence), or throws for unsupported syntax. */
const parseRegex = (source: string, top: boolean): RegexSeq[] => {
  let alternatives: RegexSeq[] = [{ tokens: [], start: false, end: false }];
  const results: RegexSeq[] = [];
  let index = 0;
  const append = (tokens: RegexToken[][]) => {
    alternatives = alternatives.flatMap((alt) =>
      tokens.map((extra) => ({ ...alt, tokens: [...alt.tokens, ...extra] })),
    );
  };
  while (index < source.length) {
    const ch = source[index];
    if (ch === '|') {
      results.push(...alternatives);
      alternatives = [{ tokens: [], start: false, end: false }];
      index++;
    } else if (ch === '^' && top && alternatives.every((alt) => alt.tokens.length === 0)) {
      alternatives.forEach((alt) => (alt.start = true));
      index++;
    } else if (ch === '$' && top && (index === source.length - 1 || source[index + 1] === '|')) {
      alternatives.forEach((alt) => (alt.end = true));
      index++;
    } else if (ch === '\\') {
      const next = source[index + 1];
      if (!next || /[a-zA-Z0-9]/.test(next)) {
        throw new UnsupportedSparqlError(`REGEX escape \\${next}`);
      }
      append([[{ lit: next }]]);
      index += 2;
    } else if (ch === '.') {
      if (source[index + 1] === '*') {
        append([[{ star: true }]]);
        index += 2;
      } else {
        append([[{ any: true }]]);
        index++;
      }
    } else if (ch === '(') {
      let depth = 1;
      let close = index + 1;
      for (; close < source.length && depth > 0; close++) {
        if (source[close] === '\\') {
          close++;
        } else if (source[close] === '(') {
          depth++;
        } else if (source[close] === ')') {
          depth--;
        }
      }
      let inner = source.slice(index + 1, close - 1);
      if (inner.startsWith('?:')) {
        inner = inner.slice(2);
      }
      if (/^[*+?{]/.test(source[close] ?? '')) {
        throw new UnsupportedSparqlError('REGEX quantified group');
      }
      const branches = parseRegex(inner, false);
      if (branches.length > 64) {
        throw new UnsupportedSparqlError('REGEX alternation too large');
      }
      append(branches.map((branch) => branch.tokens));
      index = close;
    } else if ('[]{}*+?)'.includes(ch) || ch === '^' || ch === '$') {
      throw new UnsupportedSparqlError(`REGEX metachar ${ch}`);
    } else {
      append([[{ lit: ch }]]);
      index++;
    }
    if (/^[*+?{]/.test(source[index] ?? '') && !(source[index - 1] === '*' && source[index - 2] === '.')) {
      throw new UnsupportedSparqlError('REGEX quantifier');
    }
  }
  results.push(...alternatives);
  return results;
};
