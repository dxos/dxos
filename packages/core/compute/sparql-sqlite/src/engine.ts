//
// Copyright 2026 DXOS.org
//

import {
  Parser,
  type Pattern,
  type PropertyPath,
  type Quads,
  type SparqlParser,
  type Term as SparqlTerm,
  type Triple,
  type Update,
} from 'sparqljs';

import { type Compiled, Compiler } from './compiler.ts';
import { UnsupportedSparqlError } from './errors.ts';
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

const numTerm = (value: number): Term => ({
  termType: 'Literal',
  value: String(value),
  datatype: Number.isInteger(value) ? `${XSD}integer` : `${XSD}decimal`,
});

/**
 * SPARQL 1.1 engine over SQLite: every query compiles to one SQL statement over an interned quad store.
 * Synchronous; wrap writes in the host's transaction (e.g. `ctx.storage.transactionSync`) for atomicity.
 */
export class SqlSparqlEngine {
  readonly store: TermStore;
  /** SQL of the last executed statement (diagnostics). */
  lastSql?: string;
  readonly #parser: SparqlParser = new Parser({ skipUngroupedVariableCheck: true });
  /** Compiled SQL by query text (constants resolved at compile time, so invalidated on writes). */
  readonly #plans = new Map<string, QueryPlan>();

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
    this.store.reset(indexes);
  }

  /** Inserts quads in one set-oriented batch. */
  insert(quads: readonly Quad[]): void {
    this.#plans.clear();
    this.store.insert(quads);
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
    const parsed = this.#parser.parse(sparql);
    if (parsed.type === 'update') {
      return { kind: 'update', update: parsed };
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
        compiled = compiler.compileWhere(parsed.where ?? [], 1);
        break;
      case 'CONSTRUCT':
        compiled = compiler.compileWhere(
          parsed.where ?? [],
          'limit' in parsed && typeof parsed.limit === 'number' ? parsed.limit : undefined,
        );
        template = parsed.template;
        break;
      default:
        throw new UnsupportedSparqlError(`query type ${parsed.queryType}`);
    }
    const plan: QueryPlan = {
      compiled: { ...compiled, sql: this.#wrap(compiler.ctes, compiled) },
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
    });
  }

  /** Adds the CTEs and the final decode join (term id → kind/lex/dt/lang) around the compiled select. */
  #wrap(ctes: string[], compiled: Compiled): string {
    const cols: string[] = [];
    const joins: string[] = [];
    compiled.cols.forEach((col, index) => {
      const ref = `r."${col.name.replace(/"/g, '""')}"`;
      cols.push(`${ref} AS c${index}`);
      if (col.type === 'id') {
        cols.push(
          `t${index}.kind AS k${index}`,
          `t${index}.lex AS l${index}`,
          `t${index}.dt AS d${index}`,
          `t${index}.lang AS g${index}`,
        );
        joins.push(`LEFT JOIN terms t${index} ON t${index}.id = ${ref}`);
      }
    });
    const head = ctes.length ? `WITH RECURSIVE ${ctes.join(', ')} ` : '';
    return `${head}SELECT ${cols.join(', ') || '1'} FROM (${compiled.sql}) r ${joins.join(' ')}`;
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
          if (kind !== null) {
            row[col.name] = this.store.decode(kind, lex, dt, lang);
          } else if (typeof value === 'number' && value < 0) {
            row[col.name] = plan.temps.get(value);
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
      for (const triple of template) {
        const [s, p, o] = [
          instantiate(row, triple.subject),
          instantiate(row, triple.predicate),
          instantiate(row, triple.object),
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
    for (const op of update.updates) {
      if ('updateType' in op) {
        switch (op.updateType) {
          case 'insert':
            this.store.insert(groundQuads(op.insert));
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

  /** DELETE/INSERT … WHERE: the WHERE compiles to one SELECT; templates are instantiated in JS. */
  #modify(deletes: Quads[], inserts: Quads[], where: Pattern[]): void {
    const temps = new Map<number, Term>();
    const compiler = this.#compiler(temps);
    const compiled = compiler.compileWhere(where);
    const rows = this.#run({ compiled: { ...compiled, sql: this.#wrap(compiler.ctes, compiled) }, temps });
    const instantiateAll = (blocks: Quads[]) => {
      const quads: Quad[] = [];
      for (const row of rows) {
        for (const block of blocks) {
          const graph = block.type === 'graph' ? instantiate(row, block.name) : undefined;
          for (const triple of block.triples) {
            const [s, p, o] = [
              instantiate(row, triple.subject),
              instantiate(row, triple.predicate),
              instantiate(row, triple.object),
            ];
            if (s && p && o && (block.type !== 'graph' || graph)) {
              quads.push({ s, p, o, g: graph });
            }
          }
        }
      }
      return quads;
    };
    const toDelete = instantiateAll(deletes);
    const toInsert = instantiateAll(inserts);
    this.store.delete(toDelete);
    this.store.insert(toInsert);
  }
}

/** A template position under one solution: variables take the row's binding, constants are themselves. */
const instantiate = (row: Row, term: SparqlTerm | PropertyPath): Term | undefined => {
  if ('type' in term) {
    throw new UnsupportedSparqlError('property path in a template');
  }
  return term.termType === 'Variable' ? row[term.value] : toTerm(term);
};

const groundQuads = (blocks: Quads[]): Quad[] => {
  const quads: Quad[] = [];
  for (const block of blocks) {
    const graph = block.type === 'graph' ? toTerm(block.name) : undefined;
    for (const triple of block.triples) {
      const [s, p, o] = [
        instantiate({}, triple.subject),
        instantiate({}, triple.predicate),
        instantiate({}, triple.object),
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
