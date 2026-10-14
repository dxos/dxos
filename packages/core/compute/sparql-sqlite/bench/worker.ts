//
// Copyright 2026 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import { INDEX_SETS, type Quad, SqlSparqlEngine } from '../src/index.ts';
import { checksumRows } from '../src/testing/checksum.ts';
import { generateCode, generateFacts } from '../src/testing/gen.ts';
import { PROBES } from '../src/testing/probes.ts';
import { QUERIES, queryById } from '../src/testing/queries.ts';
import { parseNTriples } from './ntriples.ts';

/** `BUILD` is set per deploy (`--var BUILD:<stamp>`) so the runner can tell when DOs run the new code. */
type Env = { BENCH: DurableObjectNamespace; BUILD?: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * Benchmark DO wrapping one engine over `ctx.storage.sql`. Timing is measured by the client: inside
 * Workers `Date.now()` only advances on I/O, so in-DO timers read zero for synchronous SQLite work.
 *
 *   POST /reset
 *   POST /ingest?kind=facts|code&start=N&count=M   (generated in-DO; `gen=only` skips insert, for calibration)
 *   GET  /query?q=<id>&iters=K                       (runs the named query K times; returns rows + checksum)
 *   POST /sparql?iters=K body = query text           (ad hoc; runs K times, returns rows + checksum)
 *   POST /load?format=nt|json[&gzip=1][&dry=1]       (body: N-Triples/N-Quads text, or a JSON Quad[];
 *                                                     `dry=1` decodes and parses without inserting)
 *   GET  /stats
 *   POST /abort                                      (ctx.abort(): next request hits a fresh instance)
 *   POST /sql?iters=K  body = one read-only SELECT     (hand-written plan variants)
 *   POST /explain  body = query text                 (compiled SQL + EXPLAIN QUERY PLAN + sqlite_stat1)
 *   POST /analyze                                    (ANALYZE, returns sqlite_stat1)
 *   POST /config?indexes=spo,pos[,osp][,gspo]       (drops data, recreates with that index set)
 *   POST /plancache?on=0|1
 *   POST /textingest?start=N&count=M                 (storage baseline: pipeline-rdf's text `triples` table)
 *   GET  /ping                                       (returns the deploy's BUILD stamp)
 *   any route accepts `hints=0|1`                     (toggles the engine's likelihood() selectivity hints)
 */
export class BenchDO extends DurableObject<Env> {
  readonly #engine: SqlSparqlEngine;
  #initialized = false;
  #planCache = true;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.#engine = new SqlSparqlEngine(ctx.storage.sql);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/ping') {
        return json({ ok: true, build: this.env.BUILD });
      }
      if (url.pathname === '/abort') {
        this.ctx.abort('bench: force cold start');
      }
      if (!this.#initialized) {
        this.#engine.init();
        this.#initialized = true;
      }
      return await this.#route(url, request);
    } catch (err) {
      return json({ error: String(err), stack: err instanceof Error ? err.stack : undefined }, 500);
    }
  }

  async #route(url: URL, request: Request): Promise<Response> {
    const engine = this.#engine;
    const sql = this.ctx.storage.sql;
    const param = (name: string, fallback: string) => url.searchParams.get(name) ?? fallback;
    const hints = url.searchParams.get('hints');
    if (hints !== null && engine.selectivityHints !== (hints === '1')) {
      engine.selectivityHints = hints === '1';
      engine.clearPlans();
    }
    switch (url.pathname) {
      case '/reset':
        engine.reset();
        return json({ ok: true });
      case '/ingest': {
        const start = Number(param('start', '0'));
        const count = Number(param('count', '1000'));
        const quads = param('kind', 'facts') === 'code' ? generateCode(start, count) : generateFacts(start, count);
        if (param('gen', '') !== 'only') {
          this.ctx.storage.transactionSync(() => engine.insert(quads));
        }
        return json({ quads: quads.length });
      }
      case '/query': {
        const query = queryById(param('q', ''));
        const iters = Math.max(1, Number(param('iters', '1')));
        let rows = this.#query(query.sparql);
        for (let index = 1; index < iters; index++) {
          rows = this.#query(query.sparql);
        }
        return json({ rows: rows.length, checksum: checksumRows(rows), sample: rows.slice(0, 3) });
      }
      case '/sparql': {
        const text = await request.text();
        const iters = Math.max(1, Number(param('iters', '1')));
        const rows = this.ctx.storage.transactionSync(() => {
          let result = this.#query(text);
          for (let index = 1; index < iters; index++) {
            result = this.#query(text);
          }
          return result;
        });
        return json({ rows: rows.length, checksum: checksumRows(rows), sample: rows.slice(0, 5) });
      }
      case '/sql': {
        // Hand-written plan variants for the perf write-up; read-only by construction of the allowed shapes.
        const text = await request.text();
        if (
          !/^\s*(SELECT|WITH|EXPLAIN)\b/i.test(text) ||
          /;|\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|PRAGMA|ATTACH|VACUUM)\b/i.test(text)
        ) {
          return json({ error: 'only a single read-only SELECT is allowed' }, 400);
        }
        const iters = Math.max(1, Number(param('iters', '1')));
        let rows = sql.exec(text).toArray();
        for (let index = 1; index < iters; index++) {
          rows = sql.exec(text).toArray();
        }
        return json({ rows: rows.length, sample: rows.slice(0, 5) });
      }
      case '/load': {
        const body =
          param('gzip', '') === '1' ? request.body?.pipeThrough(new DecompressionStream('gzip')) : request.body;
        const text = await new Response(body).text();
        const quads: Quad[] = param('format', 'nt') === 'json' ? JSON.parse(text) : parseNTriples(text);
        if (param('dry', '') === '1') {
          return json({ quads: quads.length, bytes: text.length });
        }
        const chunks = chunkByText(quads);
        this.ctx.storage.transactionSync(() => {
          for (const chunk of chunks) {
            engine.insert(chunk);
          }
        });
        return json({ quads: quads.length, bytes: text.length, chunks: chunks.length });
      }
      case '/stats':
        return json({ triples: engine.count(), dbBytes: sql.databaseSize, ...engine.stats() });
      case '/queries':
        return json(QUERIES);
      case '/probes':
        return json(PROBES);
      case '/explain':
        return json({
          ...engine.explain(await request.text()),
          stat1: sql.exec(`SELECT idx, stat FROM sqlite_stat1 WHERE tbl = 'quads'`).toArray(),
        });
      case '/analyze':
        sql.exec('ANALYZE');
        return json(sql.exec('SELECT * FROM sqlite_stat1').toArray());
      case '/config': {
        const indexes = INDEX_SETS.find((set) => set === param('indexes', 'spo,pos,osp'));
        if (!indexes) {
          return json({ error: `indexes must be one of ${INDEX_SETS.join(' | ')}` }, 400);
        }
        engine.reset(indexes);
        return json({ indexes: engine.store.indexes });
      }
      case '/plancache':
        this.#planCache = param('on', '1') !== '0';
        return json({ planCache: this.#planCache });
      case '/textingest':
        return json(this.#textIngest(Number(param('start', '0')), Number(param('count', '1000'))));
      default:
        return json({ error: 'not found' }, 404);
    }
  }

  #query(sparql: string) {
    if (!this.#planCache) {
      this.#engine.clearPlans();
    }
    return this.#engine.query(sparql);
  }

  /** Same facts in pipeline-rdf's text `triples` table (0001_init.sql), the storage baseline. */
  #textIngest(start: number, count: number) {
    const sql = this.ctx.storage.sql;
    sql.exec(
      `CREATE TABLE IF NOT EXISTS triples (s TEXT NOT NULL, p TEXT NOT NULL, o TEXT NOT NULL, oType TEXT NOT NULL, g TEXT NOT NULL DEFAULT '')`,
    );
    sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS triples_unique ON triples (s, p, o, oType, g)');
    sql.exec('CREATE INDEX IF NOT EXISTS triples_spo ON triples (s, p, o)');
    sql.exec('CREATE INDEX IF NOT EXISTS triples_pos ON triples (p, o)');
    const quads = generateFacts(start, count);
    const rows = quads.map((quad) => [
      quad.s.value,
      quad.p.value,
      quad.o.value,
      quad.o.termType === 'Literal' ? `literal${quad.o.datatype ? `^^${quad.o.datatype}` : ''}` : 'uri',
    ]);
    this.ctx.storage.transactionSync(() =>
      sql.exec(
        'INSERT OR IGNORE INTO triples (s, p, o, oType) SELECT value->>0, value->>1, value->>2, value->>3 FROM json_each(?)',
        JSON.stringify(rows),
      ),
    );
    return {
      quads: quads.length,
      triples: sql.exec('SELECT COUNT(*) AS n FROM triples').toArray()[0].n,
      dbBytes: sql.databaseSize,
    };
  }
}

/** Bound strings are capped at about 2 MB on DO SQLite, so each insert carries at most ~1 MB of term text. */
const CHUNK_TEXT = 1_000_000;
const CHUNK_QUADS = 10_000;

const chunkByText = (quads: Quad[]): Quad[][] => {
  const chunks: Quad[][] = [];
  let current: Quad[] = [];
  let size = 0;
  for (const quad of quads) {
    const quadSize = quad.s.value.length + quad.p.value.length + quad.o.value.length + (quad.g?.value.length ?? 0);
    if (current.length > 0 && (size + quadSize > CHUNK_TEXT || current.length >= CHUNK_QUADS)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(quad);
    size += quadSize;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
};

/** Routes `/<path>?db=<name>` to the named DO instance. */
export default {
  fetch: (request: Request, env: Env): Promise<Response> => {
    const name = new URL(request.url).searchParams.get('db') ?? 'bench';
    return env.BENCH.get(env.BENCH.idFromName(name)).fetch(request);
  },
};
