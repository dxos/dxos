# sql-compiler benchmark worker

A Cloudflare Worker with one SQLite-backed Durable Object that wraps `SqlSparqlEngine` over
`ctx.storage.sql`, so the numbers in [docs/BENCHMARK.md](../docs/BENCHMARK.md) can be reproduced.
The routes are documented on `BenchDO` in [`worker.ts`](worker.ts).

The bench is not part of the package build. `cloudflare.d.ts` declares the few workers types it uses,
and `tsconfig.json` type-checks it on its own:

```bash
pnpm exec tsc -p packages/core/compute/sparql-sqlite/bench/tsconfig.json
```

## Deploy and run

The worker imports `@dxos/invariant` and `@dxos/errors` through their built `dist`, so build first.

```bash
moon run sparql-sqlite:build
cd packages/core/compute/sparql-sqlite/bench
pnpm exec wrangler deploy                      # → https://rdf-bench-sql-compiler.<account>.workers.dev
cd ..
node bench/run.mjs --url https://rdf-bench-sql-compiler.<account>.workers.dev --probes --out results.json
```

- `--scales 1000,10000,100000` are fact counts, about 10k / 100k / 1M triples.
- Each run uses a fresh DO (`--db`, default `run-<timestamp>`).
- Timing is client-side: `wallMs` is the median single round trip, and `serverMs` is the slope between
  1 and 5 in-DO executions, which removes the network.
- Ad hoc query: `curl -XPOST --data-binary @q.rq '<url>/sparql?db=x'`.

Local run: `pnpm exec wrangler dev --compatibility-date 2026-07-21`, then point `--url` at it. The
override is needed while the bundled workerd is older than the configured date.

## Oracle

`src/testing/expected.json` holds Oxigraph's answers for 1k and 10k facts, the code graph and the
probes. To check 100k facts as well, regenerate the oracle. `oxigraph` is not a dependency of this
package, so install it somewhere else:

```bash
npm install --prefix /tmp/oxigraph oxigraph
node --experimental-strip-types bench/oracle.ts /tmp/oxigraph > /tmp/oracle.json
node bench/run.mjs --url <url> --expected /tmp/oracle.json
```
