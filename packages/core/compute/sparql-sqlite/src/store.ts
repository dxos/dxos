//
// Copyright 2026 DXOS.org
//

import { type Term as SparqlTerm } from 'sparqljs';

import { invariant } from '@dxos/invariant';

import { UnsupportedSparqlError } from './errors.ts';
import {
  type SqlStorage,
  type SqlStorageValue,
  asNullableNumber,
  asNullableString,
  asNumber,
  asString,
} from './sql-storage.ts';
import { type Quad, RDF, type Term, XSD } from './terms.ts';

/** Term kinds; the order matters for SPARQL ORDER BY (blank < IRI < literal). */
export const Kind = { IRI: 0, BLANK: 1, STR: 2, LANG: 3, NUM: 4, DATE: 5, BOOL: 6, TYPED: 7 } as const;

const NUMERIC = new Set(
  [
    'integer',
    'decimal',
    'double',
    'float',
    'long',
    'int',
    'short',
    'byte',
    'nonNegativeInteger',
    'positiveInteger',
    'negativeInteger',
    'nonPositiveInteger',
    'unsignedLong',
    'unsignedInt',
    'unsignedShort',
    'unsignedByte',
  ].map((name) => `${XSD}${name}`),
);
const RDF_LANG = `${RDF}langString`;

/** A term in its stored shape: `dt` is the datatype IRI (mapped to an id on write). */
export type Enc = { kind: number; lex: string; dt: string | null; lang: string | null; num: number | null };

/** Encodes a term into its stored columns; `num` carries the numeric value (epoch ms for xsd:dateTime). */
export const encodeTerm = (term: Term): Enc => {
  switch (term.termType) {
    case 'NamedNode':
      return { kind: Kind.IRI, lex: term.value, dt: null, lang: null, num: null };
    case 'BlankNode':
      return { kind: Kind.BLANK, lex: term.value, dt: null, lang: null, num: null };
    case 'Literal': {
      if (term.language) {
        return { kind: Kind.LANG, lex: term.value, dt: null, lang: term.language.toLowerCase(), num: null };
      }
      const dt = term.datatype && term.datatype !== `${XSD}string` && term.datatype !== RDF_LANG ? term.datatype : null;
      if (!dt) {
        return { kind: Kind.STR, lex: term.value, dt: null, lang: null, num: null };
      }
      if (NUMERIC.has(dt)) {
        const num = Number(term.value);
        return { kind: Kind.NUM, lex: term.value, dt, lang: null, num: Number.isFinite(num) ? num : null };
      }
      if (dt === `${XSD}dateTime`) {
        const ms = Date.parse(term.value);
        // Canonical lexical form (as Oxigraph stores it): no trailing zeros in fractional seconds.
        const lex = term.value.replace(
          /\.(\d*?)0+(Z|[+-]\d\d:\d\d)?$/,
          (_match, digits: string, zone: string | undefined) => `${digits ? `.${digits}` : ''}${zone ?? ''}`,
        );
        return { kind: Kind.DATE, lex, dt, lang: null, num: Number.isFinite(ms) ? ms : null };
      }
      if (dt === `${XSD}boolean`) {
        return { kind: Kind.BOOL, lex: term.value, dt, lang: null, num: null };
      }
      return { kind: Kind.TYPED, lex: term.value, dt, lang: null, num: null };
    }
  }
};

/** Converts a sparqljs (RDF/JS) constant into a `Term`; variables and quoted triples are not terms. */
export const toTerm = (term: SparqlTerm): Term => {
  switch (term.termType) {
    case 'NamedNode':
      return { termType: 'NamedNode', value: term.value };
    case 'BlankNode':
      return { termType: 'BlankNode', value: term.value };
    case 'Literal': {
      const raw = term.datatype?.value;
      const datatype = raw === `${XSD}string` ? undefined : raw;
      return {
        termType: 'Literal',
        value: term.value,
        datatype: term.language ? undefined : datatype,
        language: term.language || undefined,
      };
    }
    default:
      throw new UnsupportedSparqlError(`term ${term.termType}`);
  }
};

/** Dedup key of an encoded term; also the input of its hash. */
export const encKey = (enc: Enc) => `${enc.kind}\u0001${enc.dt ?? ''}\u0001${enc.lang ?? ''}\u0001${enc.lex}`;

/** cyrb53: 53-bit string hash; collisions are resolved by probing with the next seed. */
const hash53 = (str: string, seed: number) => {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let index = 0; index < str.length; index++) {
    const ch = str.charCodeAt(index);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/** Covering quad orderings to maintain (SPOG is the primary key and always present). */
export const INDEX_SETS = ['spo,pos,osp', 'spo,pos', 'spo,pos,osp,gspo'] as const;
export type IndexSet = (typeof INDEX_SETS)[number];

const CACHE_LIMIT = 200_000;

/** Quad of term ids; `g` is 0 for the default graph. */
type IdRow = [s: number, p: number, o: number, g: number];

/**
 * Interned quad store: `terms` (one row per distinct RDF term, looked up by a 53-bit hash index) and
 * `quads` (four term ids, WITHOUT ROWID, covering permutations). Ingest is three statements per batch,
 * all set-oriented through `json_each`, so the per-quad work stays in SQLite's C code.
 */
export class TermStore {
  readonly sql: SqlStorage;
  indexes: IndexSet;
  autoAnalyze = true;
  namedGraphs = false;
  /** Approximate quad count at the last ANALYZE (re-run when the store doubles). */
  #analyzedAt = 0;
  #approxCount = 0;
  /** Term key -> id; bounded, cleared wholesale when full. */
  #cache = new Map<string, number>();
  #dtIds = new Map<string, number>();
  #dtIris = new Map<number, string>();

  constructor(sql: SqlStorage, indexes: IndexSet = 'spo,pos,osp') {
    this.sql = sql;
    this.indexes = indexes;
  }

  /** Creates the schema if missing and loads persisted metadata; idempotent. */
  init(): void {
    const sql = this.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
    const meta = new Map(
      sql
        .exec('SELECT k, v FROM meta')
        .toArray()
        .map((row) => [asString(row.k), asString(row.v)]),
    );
    const storedIndexes = INDEX_SETS.find((set) => set === meta.get('indexes'));
    if (storedIndexes) {
      this.indexes = storedIndexes;
    } else {
      sql.exec(`INSERT OR REPLACE INTO meta (k, v) VALUES ('indexes', ?)`, this.indexes);
    }
    this.#approxCount = Number(meta.get('approxCount') ?? 0);
    this.#analyzedAt = Number(meta.get('analyzedAt') ?? 0);
    sql.exec('CREATE TABLE IF NOT EXISTS dts (id INTEGER PRIMARY KEY, iri TEXT NOT NULL UNIQUE)');
    sql.exec(
      'CREATE TABLE IF NOT EXISTS terms (id INTEGER PRIMARY KEY, h INTEGER NOT NULL, kind INTEGER NOT NULL, lex TEXT NOT NULL, dt INTEGER, lang TEXT, num REAL)',
    );
    sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS terms_h ON terms (h)');
    sql.exec(
      'CREATE TABLE IF NOT EXISTS quads (s INTEGER NOT NULL, p INTEGER NOT NULL, o INTEGER NOT NULL, g INTEGER NOT NULL, PRIMARY KEY (s, p, o, g)) WITHOUT ROWID',
    );
    const wanted = this.indexes.split(',');
    if (wanted.includes('pos')) {
      sql.exec('CREATE INDEX IF NOT EXISTS quads_pos ON quads (p, o, s, g)');
    }
    if (wanted.includes('osp')) {
      sql.exec('CREATE INDEX IF NOT EXISTS quads_osp ON quads (o, s, p, g)');
    }
    if (wanted.includes('gspo')) {
      sql.exec('CREATE INDEX IF NOT EXISTS quads_gspo ON quads (g, s, p, o)');
    }
    for (const row of sql.exec('SELECT id, iri FROM dts').toArray()) {
      this.#dtIds.set(asString(row.iri), asNumber(row.id));
      this.#dtIris.set(asNumber(row.id), asString(row.iri));
    }
    this.namedGraphs = meta.has('named');
  }

  /** Drops all data (optionally switching the index set) and recreates the schema. */
  reset(indexes?: IndexSet): void {
    if (indexes) {
      this.indexes = indexes;
    }
    this.#approxCount = 0;
    this.#analyzedAt = 0;
    for (const table of ['quads', 'terms', 'dts', 'meta']) {
      this.sql.exec(`DROP TABLE IF EXISTS ${table}`);
    }
    this.#cache.clear();
    this.#dtIds.clear();
    this.#dtIris.clear();
    this.namedGraphs = false;
    this.init();
  }

  dtIri(id: number): string | undefined {
    return this.#dtIris.get(id);
  }

  /** Datatype id without creating it (for query constants); -1 when unknown. */
  dtIdIfKnown(iri: string): number {
    return this.#dtIds.get(iri) ?? -1;
  }

  /** Interns terms (creating missing ones) and returns key -> id. */
  intern(encs: Map<string, Enc>): Map<string, number> {
    const ids = new Map<string, number>();
    let todo: { key: string; enc: Enc; seed: number }[] = [];
    for (const [key, enc] of encs) {
      const cached = this.#cache.get(key);
      if (cached !== undefined) {
        ids.set(key, cached);
      } else {
        todo.push({ key, enc, seed: 0 });
      }
    }
    while (todo.length > 0) {
      const payload = JSON.stringify(
        todo.map(({ key, enc, seed }) => [
          hash53(key, seed),
          enc.kind,
          enc.lex,
          enc.dt === null ? null : this.#dtId(enc.dt),
          enc.lang,
          enc.num,
        ]),
      );
      this.sql.exec(
        `INSERT OR IGNORE INTO terms (h, kind, lex, dt, lang, num)
         SELECT value->>0, value->>1, value->>2, value->>3, value->>4, value->>5 FROM json_each(?)`,
        payload,
      );
      const next: typeof todo = [];
      for (const [index, id, ok] of this.sql
        .exec(
          `SELECT j.key, t.id, (t.kind = j.value->>1 AND t.lex = j.value->>2 AND t.dt IS j.value->>3 AND t.lang IS j.value->>4)
         FROM json_each(?) j LEFT JOIN terms t ON t.h = j.value->>0`,
          payload,
        )
        .raw()) {
        const item = todo[asNumber(index)];
        if (ok) {
          ids.set(item.key, asNumber(id));
          this.#remember(item.key, asNumber(id));
        } else {
          next.push({ ...item, seed: item.seed + 1 });
        }
      }
      todo = next;
    }
    return ids;
  }

  /** Looks up existing terms without creating them; missing keys are absent from the result. */
  lookup(encs: Map<string, Enc>): Map<string, number> {
    const ids = new Map<string, number>();
    for (const [key, enc] of encs) {
      const cached = this.#cache.get(key);
      if (cached !== undefined) {
        ids.set(key, cached);
        continue;
      }
      const dt = enc.dt === null ? null : this.dtIdIfKnown(enc.dt);
      for (let seed = 0; ; seed++) {
        const rows = this.sql
          .exec('SELECT id, kind, lex, dt, lang FROM terms WHERE h = ?', hash53(key, seed))
          .toArray();
        if (rows.length === 0) {
          break;
        }
        const row = rows[0];
        if (row.kind === enc.kind && row.lex === enc.lex && row.dt === dt && row.lang === enc.lang) {
          ids.set(key, asNumber(row.id));
          this.#remember(key, asNumber(row.id));
          break;
        }
      }
    }
    return ids;
  }

  /** Inserts quads (duplicates are ignored); re-runs ANALYZE whenever the store has doubled. */
  insert(quads: readonly Quad[]): void {
    const { encs, keyed } = this.#encodeQuads(quads);
    const ids = this.intern(encs);
    let named = false;
    const rows = keyed.map(([s, p, o, g]): IdRow => {
      named ||= g !== null;
      return [requireId(ids, s), requireId(ids, p), requireId(ids, o), g === null ? 0 : requireId(ids, g)];
    });
    this.insertIds(rows);
    this.#approxCount += rows.length;
    if (this.autoAnalyze && this.#approxCount >= 2 * Math.max(this.#analyzedAt, 2000)) {
      // Without planner statistics SQLite guesses join orders and picks badly (Q6: 570 ms -> 2 ms).
      this.sql.exec('ANALYZE');
      this.#analyzedAt = this.#approxCount;
      this.sql.exec(`INSERT OR REPLACE INTO meta (k, v) VALUES ('analyzedAt', ?)`, String(this.#analyzedAt));
    }
    this.sql.exec(`INSERT OR REPLACE INTO meta (k, v) VALUES ('approxCount', ?)`, String(this.#approxCount));
    if (named && !this.namedGraphs) {
      this.sql.exec(`INSERT OR REPLACE INTO meta (k, v) VALUES ('named', '1')`);
      this.namedGraphs = true;
    }
  }

  /** Deletes quads; terms are left in place (garbage-collectable separately). */
  delete(quads: readonly Quad[]): void {
    const { encs, keyed } = this.#encodeQuads(quads);
    const ids = this.lookup(encs);
    const rows: IdRow[] = [];
    for (const [s, p, o, g] of keyed) {
      const [sid, pid, oid] = [ids.get(s), ids.get(p), ids.get(o)];
      const gid = g === null ? 0 : ids.get(g);
      if (sid !== undefined && pid !== undefined && oid !== undefined && gid !== undefined) {
        rows.push([sid, pid, oid, gid]);
      }
    }
    this.deleteIds(rows);
  }

  deleteIds(rows: readonly IdRow[]): void {
    if (rows.length === 0) {
      return;
    }
    this.sql.exec(
      `DELETE FROM quads WHERE (s, p, o, g) IN (SELECT value->>0, value->>1, value->>2, value->>3 FROM json_each(?))`,
      JSON.stringify(rows),
    );
  }

  insertIds(rows: readonly IdRow[]): void {
    if (rows.length === 0) {
      return;
    }
    this.sql.exec(
      'INSERT OR IGNORE INTO quads (s, p, o, g) SELECT value->>0, value->>1, value->>2, value->>3 FROM json_each(?)',
      JSON.stringify(rows),
    );
  }

  count(): number {
    return asNumber(this.sql.exec('SELECT COUNT(*) AS n FROM quads').toArray()[0].n);
  }

  /** Rebuilds a term from its stored columns. */
  decode(kind: SqlStorageValue, lex: SqlStorageValue, dt: SqlStorageValue, lang: SqlStorageValue): Term {
    const value = asString(lex);
    switch (kind) {
      case Kind.IRI:
        return { termType: 'NamedNode', value };
      case Kind.BLANK:
        return { termType: 'BlankNode', value };
      case Kind.STR:
        return { termType: 'Literal', value };
      case Kind.LANG:
        return { termType: 'Literal', value, language: asNullableString(lang) ?? undefined };
      default: {
        const dtId = asNullableNumber(dt);
        return { termType: 'Literal', value, datatype: dtId === null ? undefined : this.dtIri(dtId) };
      }
    }
  }

  #dtId(iri: string): number {
    let id = this.#dtIds.get(iri);
    if (id === undefined) {
      this.sql.exec('INSERT OR IGNORE INTO dts (iri) VALUES (?)', iri);
      id = asNumber(this.sql.exec('SELECT id FROM dts WHERE iri = ?', iri).toArray()[0].id);
      this.#dtIds.set(iri, id);
      this.#dtIris.set(id, iri);
    }
    return id;
  }

  #remember(key: string, id: number): void {
    if (this.#cache.size >= CACHE_LIMIT) {
      this.#cache.clear();
    }
    this.#cache.set(key, id);
  }

  #encodeQuads(quads: readonly Quad[]) {
    const encs = new Map<string, Enc>();
    const keyOf = (term: Term) => {
      const enc = encodeTerm(term);
      const key = encKey(enc);
      encs.set(key, enc);
      return key;
    };
    const keyed = quads.map((quad): [string, string, string, string | null] => [
      keyOf(quad.s),
      keyOf(quad.p),
      keyOf(quad.o),
      quad.g ? keyOf(quad.g) : null,
    ]);
    return { encs, keyed };
  }
}

const requireId = (ids: Map<string, number>, key: string): number => {
  const id = ids.get(key);
  invariant(id !== undefined, 'term was not interned');
  return id;
};
