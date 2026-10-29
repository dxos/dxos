//
// Copyright 2026 DXOS.org
//

import {
  type ConstructQuery,
  type Ordering,
  type Pattern,
  type PropertyPath,
  type Quads,
  type SelectQuery,
  type Term as SparqlTerm,
  type Triple,
  type Update,
} from 'sparqljs';

import { type Compiled, Compiler, quoteName } from './compiler.ts';
import { UnsupportedSparqlError } from './errors.ts';
import { parseSparql } from './parser.ts';
import { type SqlStorage, asNumber } from './sql-storage.ts';
import { type IndexSet, TermStore, encKey, encodeTerm, toTerm } from './store.ts';
import { type Quad, type Row, type Term, XSD } from './terms.ts';

export type EngineOptions = {
  /** Covering quad orderings to maintain; persisted on first init (default `spo,pos,osp`). */
  indexes?: IndexSet;
};

type QueryPlan = {
  compiled: Compiled;
  /** Constants absent from the store, compiled as negative ids so they can still be projected. */
  temps: Map<number, Term>;
  kind: 'SELECT' | 'ASK' | 'CONSTRUCT';
  template?: Triple[];
};

const PLAN_CACHE_LIMIT = 500;

/** Pattern counts for planner hints stop here, so a hint costs at most one bounded index range scan. */
const COUNT_CAP = 100_000;
const COUNT_CACHE_LIMIT = 10_000;
/** Smallest likelihood passed to SQLite; a constant absent from the store matches nothing. */
const MIN_PROBABILITY = 1e-9;

/**
 * A computed number as a literal. Arithmetic runs in doubles, so a fraction is rounded to 15
 * significant digits to read as the xsd:decimal it stands for (0.1 + 0.2 -> "0.3", not "0.30000000000000004").
 */
const numTerm = (value: number): Term =>
  Number.isInteger(value)
    ? { termType: 'Literal', value: String(value), datatype: `${XSD}integer` }
    : { termType: 'Literal', value: String(Number(value.toPrecision(15))), datatype: `${XSD}decimal` };

/**
 * SPARQL 1.1 engine over SQLite: every query compiles to one SQL statement over an interned quad store.
 * Synchronous; wrap writes in the host's transaction (e.g. `ctx.storage.transactionSync`) for atomicity.
 */
export class SqlSparqlEngine {
  readonly store: TermStore;
  /** Pass per-constant selectivities to SQLite as `likelihood()` hints (see `#selectivity`). */
  selectivityHints = true;
  /** SQL of the last executed statement (diagnostics). */
  lastSql?: string;
  /** Compiled SQL by query text (constants resolved at compile time, so invalidated on writes). */
  readonly #plans = new Map<string, QueryPlan>();
  /**
   * Capped quad counts by `p` / `p o` id, for selectivity hints. They only steer SQLite's plan, never the
   * answer, and are dropped on every write together with the plans they were baked into.
   */
  readonly #counts = new Map<string, number>();
  #countsTotal: number | undefined;

  constructor(sql: SqlStorage, options: EngineOptions = {}) {
    this.store = new TermStore(sql, options.indexes);
  }

  /** Creates the schema if missing; call once before use. */
  init(): void {
    this.store.init();
  }

  /** Drops all data (optionally switching the index set). */
  reset(indexes?: IndexSet): void {
    this.#plans.clear();
    this.#clearCounts();
    this.store.reset(indexes);
  }

  /** Inserts quads in one set-oriented batch. */
  insert(quads: readonly Quad[]): void {
    this.#plans.clear();
    this.store.insert(quads);
    this.#clearCounts();
  }

  /** Number of stored quads. */
  count(): number {
    return this.store.count();
  }

  clearPlans(): void {
    this.#plans.clear();
  }

  stats(): Record<string, unknown> {
    const sql = this.store.sql;
    return {
      terms: asNumber(sql.exec('SELECT COUNT(*) AS n FROM terms').toArray()[0].n),
      termLexBytes: sql.exec('SELECT SUM(length(CAST(lex AS BLOB))) AS n FROM terms').toArray()[0].n,
      indexes: this.store.indexes,
    };
  }

  /**
   * Runs a SPARQL query or update. SELECT returns solutions; ASK returns `[{}]` (true) or `[]`;
   * CONSTRUCT returns distinct `{ s, p, o }` rows; UPDATE returns `[]`.
   * @throws UnsupportedSparqlError for constructs the compiler does not translate.
   */
  query(sparql: string): Row[] {
    const plan = this.#compile(sparql);
    if (plan.kind === 'update') {
      this.#update(plan.update);
      return [];
    }
    const rows = this.#run(plan);
    switch (plan.kind) {
      case 'ASK':
        return rows.length ? [{}] : [];
      case 'CONSTRUCT':
        return this.#construct(rows, plan.template ?? []);
      default:
        return rows;
    }
  }

  /** Compiled SQL and SQLite's EXPLAIN QUERY PLAN for a query. */
  explain(sparql: string): { sql: string; plan: string[] } {
    const plan = this.#compile(sparql);
    if (plan.kind === 'update') {
      throw new UnsupportedSparqlError('EXPLAIN of an update');
    }
    return {
      sql: plan.compiled.sql,
      plan: this.store.sql
        .exec(`EXPLAIN QUERY PLAN ${plan.compiled.sql}`)
        .toArray()
        .map((row) => `${row.id}/${row.parent} ${row.detail}`),
    };
  }

  #compile(sparql: string): QueryPlan | { kind: 'update'; update: Update } {
    const cached = this.#plans.get(sparql);
    if (cached) {
      return cached;
    }
    const parsed = parseSparql(sparql);
    if (parsed.type === 'update') {
      return { kind: 'update', update: parsed };
    }
    if (parsed.from && (parsed.from.default.length > 0 || parsed.from.named.length > 0)) {
      // The store is one dataset; silently ignoring a dataset clause would answer over the wrong graphs.
      throw new UnsupportedSparqlError('FROM / FROM NAMED');
    }
    const temps = new Map<number, Term>();
    const compiler = this.#compiler(temps);
    let compiled: Compiled;
    let template: Triple[] | undefined;
    switch (parsed.queryType) {
      case 'SELECT':
        compiled = compiler.compileSelect(parsed);
        break;
      case 'ASK':
        compiled = compiler.compileSelect({
          where: parsed.where ?? [],
          values: parsed.values,
          variables: [{ termType: 'Wildcard' }],
          limit: 1,
        });
        break;
      case 'CONSTRUCT':
        // Solution modifiers apply to the WHERE solutions before the template is instantiated.
        compiled = compiler.compileSelect({
          where: parsed.where ?? [],
          values: parsed.values,
          variables: [{ termType: 'Wildcard' }],
          ...constructModifiers(parsed),
        });
        template = parsed.template;
        break;
      default:
        throw new UnsupportedSparqlError(`query type ${parsed.queryType}`);
    }
    const plan: QueryPlan = {
      compiled: { ...compiled, sql: this.#wrap(compiler.ctes, compiled, temps, compiler.tempTermsUsed) },
      temps,
      kind: parsed.queryType,
      template,
    };
    if (this.#plans.size > PLAN_CACHE_LIMIT) {
      this.#plans.clear();
    }
    this.#plans.set(sparql, plan);
    return plan;
  }

  #compiler(temps: Map<number, Term>): Compiler {
    const store = this.store;
    const tempIds = new Map<string, number>();
    return new Compiler({
      namedGraphs: store.namedGraphs,
      constId: (term) => {
        const value = toTerm(term);
        const enc = encodeTerm(value);
        const key = encKey(enc);
        const id = store.lookup(new Map([[key, enc]])).get(key);
        if (id !== undefined) {
          return String(id);
        }
        let temp = tempIds.get(key);
        if (temp === undefined) {
          temp = -(tempIds.size + 1);
          tempIds.set(key, temp);
          temps.set(temp, value);
        }
        return String(temp);
      },
      selectivity: this.selectivityHints
        ? (p, o) => this.#selectivity(Number(p), o === undefined ? undefined : Number(o))
        : undefined,
    });
  }

  /** Fractions for `likelihood()` hints: quads with predicate `p`, and of those with object `o`. */
  #selectivity(p: number, o: number | undefined): { p: number; o?: number } | undefined {
    this.#countsTotal ??= this.#statTotal();
    const total = this.#countsTotal;
    if (!total) {
      // Without sqlite_stat1 SQLite assumes a default table size, so absolute hints would mislead it.
      return undefined;
    }
    const clamp = (value: number) => Math.min(1, Math.max(MIN_PROBABILITY, value));
    const pCount = p < 0 ? 0 : this.#count(`p = ${p}`);
    if (o === undefined) {
      return { p: clamp(pCount / total) };
    }
    const poCount = p < 0 || o < 0 ? 0 : this.#count(`p = ${p} AND o = ${o}`);
    return { p: clamp(pCount / total), o: clamp(poCount / Math.max(pCount, 1)) };
  }

  #count(where: string): number {
    let count = this.#counts.get(where);
    if (count === undefined) {
      count = asNumber(
        this.store.sql
          .exec(`SELECT COUNT(*) AS n FROM (SELECT 1 FROM quads WHERE ${where} LIMIT ${COUNT_CAP})`)
          .toArray()[0].n,
      );
      if (this.#counts.size >= COUNT_CACHE_LIMIT) {
        this.#counts.clear();
      }
      this.#counts.set(where, count);
    }
    return count;
  }

  /** Quad count as of the last ANALYZE (first number of the quads indexes' sqlite_stat1 row). */
  #statTotal(): number | undefined {
    const sql = this.store.sql;
    if (sql.exec(`SELECT 1 FROM sqlite_master WHERE name = 'sqlite_stat1'`).toArray().length === 0) {
      return undefined;
    }
    const [row] = sql.exec(`SELECT stat FROM sqlite_stat1 WHERE tbl = 'quads' LIMIT 1`).toArray();
    const total = row ? Number(String(row.stat).split(' ')[0]) : 0;
    return total > 0 ? total : undefined;
  }

  #clearCounts(): void {
    this.#counts.clear();
    this.#countsTotal = undefined;
  }

  /** Adds the CTEs and the final decode join (term id -> kind/lex/dt/lang) around the compiled select. */
  #wrap(ctes: string[], compiled: Compiled, temps: Map<number, Term>, tempTermsUsed: boolean): string {
    const cols: string[] = [];
    const joins: string[] = [];
    compiled.cols.forEach((col, index) => {
      const ref = `r.${quoteName(col.name)}`;
      cols.push(`${ref} AS c${index}`);
      if (col.type === 'id') {
        cols.push(
          `t${index}.kind AS k${index}`,
          `t${index}.lex AS l${index}`,
          `t${index}.dt AS d${index}`,
          `t${index}.lang AS g${index}`,
        );
        // `main.` bypasses the temp-terms CTE: temp ids are decoded in JS, and the base table keeps its index.
        joins.push(`LEFT JOIN main.terms t${index} ON t${index}.id = ${ref}`);
      }
    });
    const all = tempTermsUsed && temps.size > 0 ? [this.#tempTerms(temps), ...ctes] : ctes;
    const head = all.length ? `WITH RECURSIVE ${all.join(', ')} ` : '';
    const order = compiled.order?.length
      ? ` ORDER BY ${compiled.order.map((key) => `r.${quoteName(key.col)}${key.descending ? ' DESC' : ''}`).join(', ')}`
      : '';
    return `${head}SELECT ${cols.join(', ') || '1'} FROM (${compiled.sql}) r ${joins.join(' ')}${order}`;
  }

  /**
   * Constants absent from the store (negative ids) shadow `terms` for this statement only, so functions
   * and comparisons over them (`VALUES ?x { "new" } FILTER(STRLEN(?x) > 1)`) see a real term.
   */
  #tempTerms(temps: Map<number, Term>): string {
    const rows = [...temps].map(([id, term]) => {
      const enc = encodeTerm(term);
      const dt = enc.dt === null ? 'NULL' : String(this.store.dtIdIfKnown(enc.dt));
      const text = (value: string | null) => (value === null ? 'NULL' : `'${value.replace(/'/g, "''")}'`);
      const num = enc.num === null || !Number.isFinite(enc.num) ? 'NULL' : String(enc.num);
      return `(${id}, 0, ${enc.kind}, ${text(enc.lex)}, ${dt}, ${text(enc.lang)}, ${num})`;
    });
    return `terms(id, h, kind, lex, dt, lang, num) AS NOT MATERIALIZED (SELECT id, h, kind, lex, dt, lang, num FROM main.terms UNION ALL VALUES ${rows.join(', ')})`;
  }

  #run(plan: Pick<QueryPlan, 'compiled' | 'temps'>): Row[] {
    this.lastSql = plan.compiled.sql;
    const rows: Row[] = [];
    const { cols } = plan.compiled;
    for (const raw of this.store.sql.exec(plan.compiled.sql).raw()) {
      const row: Row = {};
      let index = 0;
      for (const col of cols) {
        const value = raw[index++];
        if (col.type === 'id') {
          const [kind, lex, dt, lang] = raw.slice(index, index + 4);
          index += 4;
          if (typeof value === 'number' && value < 0) {
            row[col.name] = plan.temps.get(value);
          } else if (kind !== null) {
            row[col.name] = this.store.decode(kind, lex, dt, lang);
          }
        } else if (value !== null) {
          switch (col.type) {
            case 'num':
              row[col.name] = numTerm(Number(value));
              break;
            case 'str':
              row[col.name] = { termType: 'Literal', value: String(value) };
              break;
            case 'bool':
              row[col.name] = { termType: 'Literal', value: value ? 'true' : 'false', datatype: `${XSD}boolean` };
              break;
          }
        }
      }
      rows.push(row);
    }
    return rows;
  }

  #construct(rows: Row[], template: Triple[]): Row[] {
    const seen = new Set<string>();
    const out: Row[] = [];
    for (const row of rows) {
      const fresh = new Map<string, Term>();
      for (const triple of template) {
        const [s, p, o] = [
          instantiate(row, triple.subject, fresh),
          instantiate(row, triple.predicate, fresh),
          instantiate(row, triple.object, fresh),
        ];
        if (s && p && o) {
          const key = JSON.stringify([s, p, o]);
          if (!seen.has(key)) {
            seen.add(key);
            out.push({ s, p, o });
          }
        }
      }
    }
    return out;
  }

  //
  // SPARQL UPDATE.
  //

  #update(update: Update): void {
    this.#plans.clear();
    this.#clearCounts();
    for (const op of update.updates) {
      if ('updateType' in op) {
        switch (op.updateType) {
          case 'insert':
            this.store.insert(groundQuads(op.insert, new Map()));
            break;
          case 'delete':
            this.store.delete(groundQuads(op.delete));
            break;
          case 'deletewhere':
            this.#modify(op.delete, [], op.delete.map(quadsToPattern));
            break;
          case 'insertdelete':
            this.#modify(op.delete ?? [], op.insert ?? [], op.where);
            break;
        }
      } else if ((op.type === 'clear' || op.type === 'drop') && (op.graph.default || op.graph.all)) {
        this.store.reset();
      } else {
        throw new UnsupportedSparqlError(
          op.type === 'clear' || op.type === 'drop' ? `${op.type} of a named graph` : `update ${op.type}`,
        );
      }
      this.#plans.clear();
    }
  }

  /** DELETE/INSERT ... WHERE: the WHERE compiles to one SELECT; templates are instantiated in JS. */
  #modify(deletes: Quads[], inserts: Quads[], where: Pattern[]): void {
    const temps = new Map<number, Term>();
    const compiler = this.#compiler(temps);
    const compiled = compiler.compileWhere(where);
    const rows = this.#run({
      compiled: { ...compiled, sql: this.#wrap(compiler.ctes, compiled, temps, compiler.tempTermsUsed) },
      temps,
    });
    const instantiateAll = (blocks: Quads[], freshBlanks: boolean) => {
      const quads: Quad[] = [];
      for (const row of rows) {
        const fresh = freshBlanks ? new Map<string, Term>() : undefined;
        for (const block of blocks) {
          const graph = block.type === 'graph' ? instantiate(row, block.name) : undefined;
          for (const triple of block.triples) {
            const [s, p, o] = [
              instantiate(row, triple.subject, fresh),
              instantiate(row, triple.predicate, fresh),
              instantiate(row, triple.object, fresh),
            ];
            if (s && p && o && (block.type !== 'graph' || graph)) {
              quads.push({ s, p, o, g: graph });
            }
          }
        }
      }
      return quads;
    };
    const toDelete = instantiateAll(deletes, false);
    const toInsert = instantiateAll(inserts, true);
    this.store.delete(toDelete);
    this.store.insert(toInsert);
  }
}

const isOrdering = (item: unknown): item is Ordering =>
  typeof item === 'object' && item !== null && 'expression' in item;

/** sparqljs parses solution modifiers on CONSTRUCT but types them on SELECT only. */
const constructModifiers = (query: ConstructQuery): Pick<SelectQuery, 'order' | 'limit' | 'offset'> => ({
  order: 'order' in query && Array.isArray(query.order) ? query.order.filter(isOrdering) : undefined,
  limit: 'limit' in query && typeof query.limit === 'number' ? query.limit : undefined,
  offset: 'offset' in query && typeof query.offset === 'number' ? query.offset : undefined,
});

/**
 * A template position under one solution: variables take the row's binding, constants are themselves.
 * With `fresh`, template blank nodes become new blank nodes per solution (CONSTRUCT, INSERT), so two
 * solutions - or two updates - never share one.
 */
const instantiate = (row: Row, term: SparqlTerm | PropertyPath, fresh?: Map<string, Term>): Term | undefined => {
  if ('type' in term) {
    throw new UnsupportedSparqlError('property path in a template');
  }
  if (term.termType === 'Variable') {
    return row[term.value];
  }
  if (term.termType === 'BlankNode' && fresh) {
    let blank = fresh.get(term.value);
    if (!blank) {
      blank = { termType: 'BlankNode', value: `b${crypto.randomUUID().replace(/-/g, '')}` };
      fresh.set(term.value, blank);
    }
    return blank;
  }
  return toTerm(term);
};

const groundQuads = (blocks: Quads[], fresh?: Map<string, Term>): Quad[] => {
  const quads: Quad[] = [];
  for (const block of blocks) {
    const graph = block.type === 'graph' ? toTerm(block.name) : undefined;
    for (const triple of block.triples) {
      const [s, p, o] = [
        instantiate({}, triple.subject, fresh),
        instantiate({}, triple.predicate, fresh),
        instantiate({}, triple.object, fresh),
      ];
      if (!s || !p || !o) {
        throw new UnsupportedSparqlError('variable in a data block');
      }
      quads.push({ s, p, o, g: graph });
    }
  }
  return quads;
};

/** DELETE WHERE's quad template doubles as its WHERE pattern. */
const quadsToPattern = (block: Quads): Pattern =>
  block.type === 'graph'
    ? { type: 'graph', name: block.name, patterns: [{ type: 'bgp', triples: block.triples }] }
    : block;
