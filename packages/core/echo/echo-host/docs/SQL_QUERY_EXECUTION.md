# ECHO query execution in SQLite

Status: **implemented and off by default**, 2026-09-21, on this branch. The compiled executor covers
phases 1 to 3 of the plan below and is selected with `EchoHost({ queryExecutor: 'sql' })` or
`DX_ECHO_QUERY_EXECUTOR=sql`; the in-memory executor stays the default until the compiled path has
soaked. Phase 4 (EDGE) is a cross-repo change and phase 5 (property indexes, contentless FTS) is not
started. Where the implementation departs from the proposal below, the "Implementation notes"
section at the end records the departure and why.

## Problem

The host query executor uses SQLite only to find candidates. Everything after candidate selection
runs in JavaScript over Automerge documents that the executor loads into memory for the purpose.
`packages/core/echo/echo-host/src/query/query-executor.ts` is 2,322 lines, and this is where they go:

| Plan step                    | Where it runs today                                                                 | What it loads                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `SelectStep`                 | SQLite (`objectMeta`, `ftsIndex`, `reverseRef`), then `_loadDocumentsAfterSqlQuery` | one `AutomergeHost.loadDoc` lease per candidate (`_loadFromAutomerge`) |
| `FilterStep`                 | JS, `filterMatchDoc` over the loaded `EntityStructure`                              | every candidate's document                                             |
| `FilterDeletedStep`          | JS, `_getTransitiveDeletionState`                                                   | parents and relation endpoints, to depth 10                            |
| `TraverseStep`               | refs read off the loaded document; targets via `_loadFromDXN` from the root doc     | the space root document and every linked target document               |
| `Order`, `Limit`, `Skip`     | JS sort and slice                                                                   |                                                                        |
| `AggregateStep`              | JS partition in `group-by.ts`                                                       |                                                                        |
| `UnionStep`, `SetDifference` | JS maps                                                                             |                                                                        |
| `in-query` (semi-join)       | sub-plan executed in memory, projected into a `Set`, rewritten to a literal `in`    | the whole subquery result                                              |
| strong-dependency filter     | `_filterUnresolvableStrongDeps`                                                     | schema object, parent, endpoints, to depth 10                          |
| result                       | `documentJson: JSON.stringify(item.doc)` on every row                               |                                                                        |

What that costs:

- One document load per candidate per execution. A reactive query re-executes on every invalidation
  hint that overlaps its scope and repeats the loads. `ExecutionTrace.documentsLoaded` counts them.
- The documents a query touched sit in the repo cache afterwards. The query path is a source of host
  memory pressure that has nothing to do with what any client is subscribed to.
- The body shipped for document-backed rows is thrown away. `IndexQuerySource._filterMapResult`
  (`echo-client/src/client/index-query-source-provider.ts`) reads `documentJson` only for queue rows
  and hydrates document rows through `objectLoader.loadObject`, which loads the document again on the
  client. So the host serializes a document the client then re-loads. `query-materialization.bench.ts`
  measured the pipeline end to end: 1,000 wide objects could not be cold-queried inside the 20 s
  ceiling, and the time was document loading, not object construction (`echo-client-e2e/BENCHMARKS.md`,
  "Query materialization").
- EDGE carries a second executor, `edge/packages/services/db-service/src/worker/query/` (678-line
  executor, a 935-line planner fork already marked `@deprecated` in favour of `@dxos/echo-host/query`,
  and a 394-line copy of the filter matcher). It never touches Automerge. Instead it pulls every
  candidate's JSON snapshot out of the indexer Durable Object over RPC, 200 per call because a DO RPC
  return is capped at 32 MiB, chunks `IN` lists at 64 bound variables, and resolves one traversal
  target by calling `queryAll` for the whole space and `find`ing the id in the array.
- The `in-query` path materializes the subquery projection as a JS `Set` and re-embeds it as a literal
  list. The TODO at `query-executor.ts:1172` names the fix: push membership into SQL.

The data the evaluation needs is mostly in SQLite already. `objectMeta` holds type, deleted flag,
parent, relation endpoints, timestamps and queue position. `reverseRef` holds every outgoing reference
by property path. `ftsIndex.snapshot` holds the full ObjectJSON of every indexed object, with `@meta`
stripped for document objects. Two things are missing: a body the compiler can predicate on, and the
compiler.

## Goals

1. The host answers a query without loading an Automerge document. The index is the query's universe.
2. One plan executes as one SQL statement, sub-plans included. The working set never crosses into JS
   until the final projection.
3. `QueryAST`, `QueryPlan`, `QueryPlanner`, the `QueryService` wire schema and the client stay as they
   are. The semantic differences are the ones listed under "Semantics", and each is deliberate.
4. One compiler serves the local host and EDGE, and runs where the SQLite is. On EDGE that is the
   indexer Durable Object.
5. Predicates on object properties can be indexed without a schema change, through expression indexes
   over the body.

## Non-goals

- The client working-set executor (`echo-client/src/query/working-set-executor.ts`). The tab has no
  SQLite. It stays as the optimistic layer over loaded objects; only its comparators are aligned.
- Incremental maintenance of reactive results. Re-execution stays full. It becomes cheap instead.
- Vector search, multi-space queries on EDGE, the `registry` scope.
- Any change to what the client receives, beyond dropping the body it does not read.

## Constraints

- Three SQLite runtimes. Browser: wa-sqlite 3.50.4, built with `-DSQLITE_ENABLE_FTS5`; `json_extract`
  is present in the wasm. Node: `node:sqlite` 3.51.2. Cloudflare Durable Objects: version not pinned in
  either repo; JSON functions are already relied on in edge's `sql-space-store.ts` (`json_each`).
  Feature floors: recursive CTE 3.8.3, expression indexes 3.9, window functions 3.25, `NULLS LAST` 3.30,
  `->>` 3.38, contentless-delete FTS5 3.43, JSONB 3.45. `IndexEngine.migrate` reads
  `SELECT sqlite_version()`, compares it numerically in JS against 3.45.0 and dies below it, so a
  runtime under the floor fails at open rather than at the first query.
- Bound-variable caps: 999 on wasm, lower on DO (edge chunks at 64). The compiler passes every list as
  one JSON-array parameter and reads it with `json_each(?)`, so no statement's variable count depends
  on data size and `chunkArray` disappears from the query path.
- Schema changes are numbered `.sql` migrations with `IF NOT EXISTS` on every `CREATE`
  (`.agents/projects/sql-migrations/DESIGN.md`). A reindex is triggered by retiring cursor rows in a
  tracker migration; `0003_retire_pre_convergence_key_cursors.sql` is the precedent.
- No compatibility shims. The in-memory executor is deleted once the compiler covers every step. The
  `DX_ECHO_QUERY_EXECUTOR=memory|sql` switch exists for the rollout phases only and is removed in the
  last one.
- The compiler emits read-only statements, so it needs no transaction and is unaffected by the DO
  `withTransaction` constraint.
- On EDGE only results cross the DO boundary, so the 32 MiB RPC cap stops shaping the design.

## Proposal

### 1. Storage: `objectData`, the body the compiler predicates on

A new store in `@dxos/index-core`, history table `object_data_migrations`:

```sql
CREATE TABLE IF NOT EXISTS objectData (
  recordId INTEGER PRIMARY KEY,   -- objectMeta.recordId
  body BLOB NOT NULL              -- jsonb(ObjectJSON), @meta included
);
```

Rules:

- One row per `objectMeta` row, written in the same transaction. `IndexEngine.#update` already runs
  `objectMetaIndex.update`, `lookupRecordIds`, then the dependent index; `objectData` becomes a
  dependent index that runs before `fts` and `reverseRef`.
- The body is the full ObjectJSON: `objectStructureToJson` for documents, `EchoFeedCodec.decode` for
  feed blocks, `@meta` included. `Filter.key`, `Filter.foreignKeys` and `Filter.tag` read meta. Feed
  partial blocks (the `{ id, '@deleted': true }` tombstone) merge onto the prior body exactly as
  `FtsIndex.update` merges them today.
- JSONB, not text. Every runtime is at or above 3.45, the prototype measured the same bodies at 773
  bytes as JSONB against 950 as text, and `json_extract` on JSONB skips the parse.
- A separate table, not a column on `objectMeta`. The metadata scans that remain (indexer diffing,
  garbage collection, hint building, `SELECT *` in `entity-meta-index.ts`) keep small rows, and the
  join from a working set is a rowid lookup. Open question 1 revisits this with a measurement.
- Three normalized id columns are added to `objectMeta`: `parentId`, `sourceId`, `targetId`, holding
  the bare entity id when the reference is local to the row's space and `NULL` otherwise, each indexed
  with `spaceId` leading. `parent`, `source` and `target` hold full EID strings, so a join to
  `objectId` today needs string concatenation on the indexed side, which the `(spaceId, objectId)`
  index cannot serve. The prototype's `EXPLAIN` shows `SEARCH p USING INDEX idx_parent (spaceId=?)`
  followed by a filter, a scan of the space per recursion step.
- `reverseRef` gains `propPathNormalized`, the escaped path with array-index segments removed. An
  incoming traversal becomes an equality instead of the JS `_matchesReferencePropertyPath` walk. A
  query path that itself names an index (`items.0.assignee`) matches on `propPath` instead.
- Backfill. A tracker migration deletes every `fts6` and `reverseRef2` cursor, so the next passes
  re-present every document and feed block through `IndexEngine.#update`, which now writes
  `objectData`. Until every `objectMeta` row has a body (one `LEFT JOIN ... WHERE d.recordId IS NULL`
  count), `QueryServiceImpl` awaits `updateIndexes()` before a query's first execution. That is the
  gate feed-scoped queries already pass through (`QueryServiceProps.updateIndexes`). Boot is not
  blocked; queries are, once, on the first open after the upgrade. The client-startup-timeout profile
  (1,700 documents) is the case to time, at the indexer's 50 documents per pass.
- `querySnapshotsJSON` moves from `ftsIndex` to `objectData`. In phase 5 `ftsIndex` becomes a
  contentless table (`content=''`, `contentless_delete=1`), which halves the JSON stored per object.
  Its searchable text stays meta-stripped for document objects, as today.

### 2. Compiler: `SqlPlanCompiler` in `@dxos/index-core`

```ts
compile(plan: QueryPlan.Plan, context: CompileContext): CompiledQuery;
// CompileContext: owning spaceId, parameter sink, trace flag.
// CompiledQuery: { statement: Statement.Fragment; shape: ResultShape }.
```

A pure function of the plan. The executor runs the statement through the existing
`RuntimeProvider<SqlClient>` and reads rows. `QueryPlanner` is untouched; the compiler consumes the
plan the planner already produces, including `limit` pushdown, `feedScan` and `feedCursorRange`.

The working set is a CTE `ws_n(recordId, rank, ord)`. `ord` is the row's position in the working set,
kept so a later `AggregateStep` can order groups by first appearance and so an `ORDER BY` after a
sub-plan is stable. After `AggregateStep` the CTE also carries `groupKey` (a `json_object`),
`groupOrd`, `groupCount` and one `agg_<name>` column per scalar aggregate.

Step compilation:

| Step                                | SQL shape                                                                                                                                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClearWorkingSetStep`               | `SELECT ... WHERE 0`                                                                                                                                                                                      |
| `SelectStep` / `WildcardSelector`   | `FROM objectMeta m WHERE <scope>`; `<scope>` is `buildSourceCondition` reused from `entity-meta-index.ts`                                                                                                 |
| `SelectStep` / `TypeSelector`       | `... AND <buildTypeDxnCondition>` (`NOT` when inverted)                                                                                                                                                   |
| `SelectStep` / `IdSelector`         | `... AND m.objectId IN (SELECT value FROM json_each(:ids))`                                                                                                                                               |
| `SelectStep` / `TimestampSelector`  | `... AND m.updatedAt >= :after ...`                                                                                                                                                                       |
| `SelectStep` / `IncomingReference`  | `FROM reverseRef r JOIN objectMeta m USING (recordId) WHERE r.targetDXN = :target AND (:path IS NULL OR r.propPathNormalized = :path) AND <scope>`                                                        |
| `SelectStep` / `TextSelector`       | `FROM ftsIndex f JOIN objectMeta m ON m.recordId = f.rowid WHERE f.snapshot MATCH :q AND <scope> AND <type>`, `rank = -bm25(ftsIndex)`; the `LIKE` fallback for terms under three characters is unchanged |
| feed window (`QueueWindow`)         | `buildQueueWindow` reused: `AND queuePosition > :after ... ORDER BY queuePosition LIMIT :n`, or `ORDER BY objectId LIMIT :n`                                                                              |
| `SelectStep.limit`                  | `LIMIT` on the select CTE                                                                                                                                                                                 |
| `FilterStep`                        | `FROM ws JOIN objectData d USING (recordId) JOIN objectMeta m USING (recordId) WHERE <predicate>` (table below)                                                                                           |
| `FilterDeletedStep`                 | `NOT EXISTS` or `EXISTS` against the recursive `dep` CTE below                                                                                                                                            |
| `TraverseStep` / outgoing reference | `json_each` over `$.path` (an array, or a scalar wrapped with `json_array`), target id parsed from the `"/"` URI, joined to `objectMeta` in the ref's space or the anchor's                               |
| `TraverseStep` / incoming reference | `reverseRef r WHERE r.targetDXN IN (anchor local EIDs) AND propPathNormalized = :path`, joined to `objectMeta`; queue anchors match on their space-qualified EID as today                                 |
| `TraverseStep` / relation           | `m.entityKind = 'relation' AND m.sourceId IN (anchors)`; the reverse direction joins `objectMeta t ON t.spaceId = m.spaceId AND t.objectId = m.sourceId`                                                  |
| `TraverseStep` / hierarchy          | `m.parentId IN (anchors) OR m.queueId IN (anchors)` for children; `parentId` join for the parent                                                                                                          |
| `UnionStep`                         | `UNION` of the sub-chains, each starting from the current `ws`; deduplicated on `(spaceId, documentId, objectId)` as today                                                                                |
| `SetDifferenceStep`                 | `EXCEPT` on `objectId`, as today                                                                                                                                                                          |
| `OrderStep`                         | `ORDER BY <expr> ASC NULLS LAST, m.objectId`; in a CTE with `ROW_NUMBER()` when steps follow, on the final `SELECT` otherwise                                                                             |
| `LimitStep`, `SkipStep`             | `LIMIT` and `OFFSET`; on a grouped working set `WHERE groupOrd > :skip AND groupOrd <= :skip + :limit`                                                                                                    |
| `AggregateStep`                     | key columns from the coalesce chain of coerced `json_extract`s; `COUNT(*) OVER (PARTITION BY key)`, `MAX/MIN(...) OVER`, `MIN(ord) OVER` for first appearance; `DENSE_RANK()` in a second CTE level       |
| `in-query`                          | `IN (SELECT projected FROM <compiled sub-plan> JOIN objectData ... WHERE projected IS NOT NULL)`; one CTE per distinct subquery, shared by every occurrence, matching the executor's per-run cache        |
| `child-of`                          | recursive ancestor CTE over `parentId` (and `queueId` for the feed-as-parent rule), depth 10                                                                                                              |
| strong dependencies                 | recursive existence CTE: the type's EID row exists among document rows of the space, `parentId`/`sourceId`/`targetId` exist, depth 10; cross-space dependencies pass, as `_areStrongDepsResolvable` does  |
| projection                          | `SELECT m.objectId, m.spaceId, m.documentId, m.queueId, m.queueNamespace, ws.rank, groupKey, groupCount, CASE WHEN m.queueId != '' THEN json(d.body) END AS documentJson`                                 |

The nested-window restriction is real: `DENSE_RANK() OVER (ORDER BY MIN(ord) OVER (...))` is rejected
with "misuse of window function", so group ordinal needs its own CTE level. The prototype hit this and
the two-level form works.

Transitive deletion, matching `DeletionResolver` (`echo-host/src/db-host/deletion.ts`) and
`ObjectCore.isDeleted`:

```sql
dep(recordId, depId, depth) AS (
  SELECT m.recordId, m.parentId, 1 FROM objectMeta m JOIN ws USING (recordId) WHERE m.parentId IS NOT NULL
  UNION ALL
  SELECT m.recordId, m.sourceId, 1 FROM objectMeta m JOIN ws USING (recordId)
    WHERE m.entityKind = 'relation' AND m.sourceId IS NOT NULL
  UNION ALL
  SELECT m.recordId, m.targetId, 1 FROM objectMeta m JOIN ws USING (recordId)
    WHERE m.entityKind = 'relation' AND m.targetId IS NOT NULL
  UNION ALL
  SELECT dep.recordId, p.parentId, dep.depth + 1
    FROM dep JOIN objectMeta p ON p.spaceId = :space AND p.queueId = '' AND p.objectId = dep.depId
    WHERE dep.depth < 10 AND p.deleted = 0 AND p.parentId IS NOT NULL
)
-- a row is deleted when its own flag is set or any dependency reached is deleted:
... WHERE m.deleted = 0 AND NOT EXISTS (
  SELECT 1 FROM dep JOIN objectMeta p ON p.spaceId = :space AND p.queueId = '' AND p.objectId = dep.depId
  WHERE dep.recordId = ws.recordId AND p.deleted = 1)
```

The recursion follows the parent chain only, which is what `DeletionResolver` does after the first
hop. Verified on the prototype fixture: children of a deleted project resolve as deleted; a child of a
live sibling does not.

Predicate compilation for `FilterStep`, keyed to `makeFilterMatcher` and `filterMatchValue` in
`echo/src/internal/Filter/match.ts`. `b` is `d.body`, `p` the JSON path for the property (keys quoted
with `$."key"` so a dot in a key cannot change the path):

| Filter node                  | SQL                                                                                                                                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `object.typename`            | `buildTypeDxnCondition` on `m.typeDXN`; kept as a re-check because the selector cannot separate schema versions                                                                                                                                                                                    |
| `object.id`                  | `m.objectId IN (SELECT value FROM json_each(:ids))`                                                                                                                                                                                                                                                |
| `object.props`               | `AND` of the nested predicates; `@`-prefixed keys skipped; a nested `object` recurses with a longer path                                                                                                                                                                                           |
| `compare eq`                 | `json_type(b, p) = :type AND json_extract(b, p) = :value`; booleans compare on `json_type` (`'true'`/`'false'`); a ref compares `json_extract(b, p \|\| '."/"') = :uri`; `eq undefined` is `json_type(b, p) IS NULL`                                                                               |
| `compare neq`                | `NOT (<eq>)`, so a missing property counts as not equal, as in JS                                                                                                                                                                                                                                  |
| `gt`, `gte`, `lt`, `lte`     | `json_type(b, p) IN ('integer', 'real') AND json_extract(b, p) > :value` for a number operand; `= 'text'` for a string operand                                                                                                                                                                     |
| `in`                         | `COALESCE(json_extract(b, p \|\| '."/"'), json_extract(b, p)) IN (SELECT value FROM json_each(:values))`; ref values pre-normalized to URIs, as `_normalizeInValue` does                                                                                                                           |
| `in-query`                   | as in the step table                                                                                                                                                                                                                                                                               |
| `contains` (scalar)          | `EXISTS (SELECT 1 FROM json_each(b, p) e WHERE e.type = :type AND e.value = :value)`                                                                                                                                                                                                               |
| `contains` (object, strict)  | `EXISTS (SELECT 1 FROM json_each(b, p) e WHERE (SELECT count(*) FROM json_each(e.value)) = :n AND json_extract(e.value, '$."k1"') = :v1 AND ...)`, recursing for nested objects                                                                                                                    |
| `range`                      | `json_type(b, p) IN (...) AND json_extract(b, p) >= :from AND json_extract(b, p) <= :to`; inclusive at both ends, which is what the matcher does even though `Filter.between` documents `to` as exclusive                                                                                          |
| `tag`                        | `EXISTS (SELECT 1 FROM json_each(b, '$."@meta"."tags"') t WHERE <local-id-of>(COALESCE(json_extract(t.value, '$."/"'), t.value)) = :tag)`                                                                                                                                                          |
| `foreignKeys`                | `EXISTS (SELECT 1 FROM json_each(b, '$."@meta"."keys"') k, json_each(:fks) f WHERE k.value ->> 'source' = f.value ->> 'source' AND k.value ->> 'id' = f.value ->> 'id')`                                                                                                                           |
| `metaKey`, `metaVersion`     | `json_extract(b, '$."@meta"."key"') = :key`; semver is not expressible in SQL, so with `metaVersion` the executor first selects the distinct `@meta.version` values under that key, filters them with `semver.satisfies`, and compiles `version IN (:matching)`. Two statements, no document loads |
| `timestamp`                  | `m.updatedAt >= :v` and so on; today's `_execTimestampFilterStep` runs a second index query and intersects                                                                                                                                                                                         |
| `has-parent`                 | `(m.parent IS NOT NULL) = :value`                                                                                                                                                                                                                                                                  |
| `mnemonic`                   | `upper(substr(m.objectId, -6)) = :mnemonic`                                                                                                                                                                                                                                                        |
| `text-search`, `feed-cursor` | never reach a `FilterStep`; the planner lifts them onto the select                                                                                                                                                                                                                                 |
| `not`, `and`, `or`           | `NOT (...)`, `AND`, `OR`                                                                                                                                                                                                                                                                           |

`<local-id-of>` is the SQL spelling of the canonicalization `matchesTag` applies: for an `echo:` URI
(`echo:///<id>` or `echo://<space>/<id>`) the text after the last slash,
`substr(uri, length(rtrim(uri, replace(uri, '/', ''))) + 1)`; any other URI compares as is. Verified
on both EID forms.

The executor shell (`QueryExecutor`) keeps its id, plan, `#scopes` and `matchesHint`, and its
`changed` diff on the identity tuple plus group key. `execQuery` becomes: compile once in the
constructor, run the statement, diff rows, keep them for `getResults`. `ExecutionTrace` keeps its
shape and gains `sql`, `rows` and `sqlTime`; under `DX_TRACE_QUERY_EXECUTION` it also runs
`EXPLAIN QUERY PLAN` and attaches the output. `documentsLoaded` stays in the trace and reads 0 by
construction, which is the property the `active-queries` diagnostic can then assert.

### 3. EDGE

The compiler runs inside the `Indexer` Durable Object, which owns the SQLite. A new RPC,
`Indexer.execPlan(ctx, plan)`, returns `QueryResult[]`. `data-service.ts` plans with the
`QueryPlanner` from `@dxos/echo-host/query` (the fork's own deprecation note names it) and calls
the indexer. `db-service/src/worker/query/` (executor, planner fork, `filter-match.ts`, `plan.ts`)
is deleted, about 2,300 lines, together with `SNAPSHOT_RPC_BATCH_SIZE`, the 64-variable chunking and
the `queryAll`-then-`find` target resolution. Cross-repo sequencing is the usual one: land the
`index-core` compiler in dxos, then bump edge's catalog to a `pkg.pr.new` build, then delete.

### 4. Client

Wire format and hydration are unchanged. `working-set-executor.ts` gets three alignments so the
optimistic layer agrees with the host: natural order by code-unit comparison (it uses `localeCompare`
today and the host does not, so a mixed-case pair of ids can sort differently on the two sides),
property order under the collation adopted below, and `MAX_DEPTH_FOR_CHILD_OF_TRACING` 16 to 10.

### Alternatives considered

- **Property table (entity-attribute-value).** `objectProps(recordId, path, type, value)` with one row
  per leaf, indexed on `(path, value)`. Every property becomes indexable, at the cost of O(properties)
  writes per object and a wide table. `objectData` with opt-in expression indexes reaches the same
  predicates with one write per object, and indexes only what a query needs. Rejected for now; it
  remains the fallback if expression indexes prove insufficient for a hot type.
- **Compile filters only, keep JS for traversal, deletion and dependencies.** This is where the
  document loads are (`_loadFromDXN`, `_getTransitiveDeletionState`, `_areStrongDepsResolvable`), so
  as an end state it keeps the cost this design exists to remove. It is phase 2 as an intermediate.
- **Per-type generated tables from schema.** Dynamic schemas, schema versions in one type partition
  and untyped objects make the table set unstable. Rejected.
- **Read bodies from `ftsIndex.snapshot`, as EDGE does.** `@meta` is stripped for document objects,
  so `Filter.key`, `Filter.foreignKeys` and `Filter.tag` cannot be evaluated; a virtual table cannot
  carry expression indexes; and coupling the query body to FTS blocks making FTS contentless.
  Rejected.

## Semantics: what changes and what is preserved

“After” is the behaviour of **both** executors, not of the compiled path alone. The in-memory
executor remains the default and answers every plan the compiler declines, so a row that held only
for `sql` would be a divergence between the two — which is why `orderBy` on a string property moved
the in-memory comparator to code-unit order rather than leaving the paths to disagree
(`echo-client-e2e/src/sql-ordering.test.ts` pins it).

| Behaviour                                     | Today (host)                                                                | After                                               | Why it is acceptable                                                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orderBy` on a string property                | `localeCompare`, locale-dependent                                           | BINARY code-unit order, on both paths               | these SQLite builds have no ICU; deterministic across devices; already the rule for `natural`; under `limit` the collation decides which rows are cut, so both executors had to agree |
| `gt`/`lt`/`range` across mixed types          | JS coercion (`'10' > 9` is true)                                            | no match unless operand and value share a JSON type | the coercion was never specified; the typed rule is what `eq` already does                                                                                                            |
| null ordering                                 | nulls last                                                                  | `NULLS LAST`                                        | same                                                                                                                                                                                  |
| `eq`, `neq`, `in`, `contains`, booleans, refs | strict identity, refs by URI                                                | same, via `json_type`                               | same                                                                                                                                                                                  |
| timestamp filter under `or`/`not`             | `QueryError` from the planner                                               | unchanged                                           | out of scope; the compiler could lift it later                                                                                                                                        |
| result universe                               | candidates from the index; bodies and traversal targets from live documents | everything from the index                           | reactive re-execution is triggered by the indexer after it commits, so the two universes cannot disagree there; a one-shot query reads the universe it selected from                  |
| `documentJson` on document rows               | sent, discarded by the client                                               | omitted                                             | `_resolveIndexedObject` loads the document itself; feed rows keep the body                                                                                                            |
| `child-of` depth                              | 10 on the host, 16 on the client                                            | 10 on both                                          | `DeletionResolver` and `ObjectCore.isDeleted` already agree on 10                                                                                                                     |
| union / set-difference identity               | `(spaceId, documentId, objectId)` / `objectId`                              | same                                                |                                                                                                                                                                                       |
| group order                                   | first appearance in the ordered input                                       | `MIN(ord) OVER (PARTITION BY key)`                  | same                                                                                                                                                                                  |
| `in-query`                                    | subquery projection held as a JS `Set`                                      | SQL subquery                                        | no bound-variable ceiling; no per-run cache to invalidate                                                                                                                             |

One consequence of "the index is the universe" deserves a sentence. An object whose document is on
disk but not yet indexed is invisible to a query today only as a candidate; after this change it is
also invisible as a traversal target, a parent, or a strong dependency. Indexing is per document and
atomic, the pass that indexes the referrer normally indexes the target, and a traversal query is
`isSimple = false` so the next pass's hint re-executes it regardless. Convergence is not in question,
only the moment at which a freshly written target appears, and the client's working set answers that
moment for local writes already.

## Performance model

- Select and filter over a type partition: an index seek on `(spaceId, typeDXN)`, then one rowid
  lookup into `objectData` per candidate with `json_extract` on JSONB. For a versioned type the
  prototype's `EXPLAIN` reads `SEARCH m USING INDEX idx_object_index_typeDXN (spaceId=? AND typeDXN=?)`
  then `SEARCH d USING INTEGER PRIMARY KEY (rowid=?)`. Zero allocations per candidate on the JS side.
- A versionless type does not seek today. `buildTypeDxnCondition` emits
  `typeDXN = :t OR typeDXN LIKE :t || ':%'`, and SQLite answers that with `(spaceId=?)` alone, a scan
  of the whole space partition; this is how `queryTypes` runs now, so the compiler inherits it. Adding
  a bounding range in front, `typeDXN >= :t AND typeDXN < :t || ';'` with the exact predicate kept as
  the residual, gives `(spaceId=? AND typeDXN>? AND typeDXN<?)` and the same rows (verified on a
  fixture holding `x`, `x:0.1.0`, `x-bar`, `x.y:1.0.0`, `xy`). The legacy `echo:/` and `echo:///`
  equivalents seek as a plain `IN` list. Phase 2 makes this change to the shared fragment, so the old
  `queryTypes` path gains it too.
- Expression indexes are used when the query spells the identical expression. The prototype's
  `CREATE INDEX idx_status ON objectData(json_extract(body, '$.status'))` produced
  `SEARCH objectData USING COVERING INDEX idx_status (<expr>=?)`. The compiler therefore emits
  `json_extract(d.body, '$."status"')` in exactly one spelling, and phase 5 exposes
  `IndexEngine.ensurePropertyIndex(path)` that creates the index in that spelling.
- What to measure, before and after each phase:
  1. `echo-client-e2e/src/query-materialization.bench.ts`, cold query rows. The host half of the load
     disappears; the client half (hydration) remains and is the working set's business.
  2. A new `echo-host` bench: a type query with one property predicate over 10k and 100k indexed
     objects, reporting `sqlTime`, `rows`, `documentsLoaded` from `ExecutionTrace`.
  3. The idle Composer query set: `QueryServiceImpl` notes 80 active queries of which 10 are unique.
     Sum of `executionTime` across one invalidation batch, before and after.
  4. Shared-worker heap after a query storm, with the `test-perf-leaks` tooling: the repo cache should
     no longer hold documents that only a query touched.

## Rollout

Each phase is a PR, or a small stack. Tests are not rewritten to fit the new executor; where a test
encodes one of the semantic changes above (string collation, mixed-type comparison) the change is
made visible in the test and called out in the changeset.

### Phase 0: measure and harness

- Baseline the four measurements above and record them in `echo-client-e2e/BENCHMARKS.md`.
- New `echo-host` bench: a type query with one property predicate over 10k and 100k indexed
  objects, reporting `ExecutionTrace.executionTime`, `documentsLoaded` and `indexHits`.
- `DX_ECHO_QUERY_EXECUTOR=memory|sql`, read once in `QueryExecutor`; once the `sql` value exists,
  CI runs `echo-client-e2e:test` (222 query tests) under both.
- A `fast-check` property test in `echo-host` (already a dependency of `blade-runner`): random
  filters over a fixed property set against a seeded space; the two executors must agree row for row.

### Phase 1: storage, no executor change

- `objectData` store in `@dxos/index-core`: `src/migrations/object-data/0001_init.sql`, manifest,
  `object_data_migrations` history table, `ObjectDataIndex implements Index` writing `jsonb(body)`
  and merging feed partial blocks onto the prior body as `FtsIndex.update` does.
  `IndexEngine.#update` runs it before `fts` and `reverseRef`; `IndexEngine.migrate` reads
  `sqlite_version()` and dies below 3.45.0. The four non-negotiable migration tests from the
  sql-migrations design (legacy database, `IF NOT EXISTS`, manifest coverage, second run no-op).
- `parentId`, `sourceId`, `targetId` on `objectMeta` as a code migration probing `PRAGMA table_info`
  (the `0007_convergence_key.ts` pattern), indexes with `spaceId` leading, filled by
  `EntityMetaIndex.update`; `queryChildren` and `queryRelations` switch to them.
- `reverseRef.propPathNormalized`, same mechanism, filled by `ReverseRefIndex.update`.
- Backfill: a tracker migration retiring the `fts6` and `reverseRef2` cursors; a
  `hasCompleteBodies()` check on `IndexEngine`; `QueryServiceImpl` awaits `updateIndexes()` before a
  query's first execution while it is false. Time it on the 1,700-document profile from the
  client-startup-timeout project and record the number.
- `querySnapshotsJSON` served from `objectData` (`json(body)`); the `FtsIndex` version deleted.

### Phase 2: compiler, first coverage, behind the flag

- `SqlPlanCompiler` in `@dxos/index-core/src/query/`: `compile(plan, context)` returning a
  `Statement.Fragment` plus result shape; list parameters passed as one JSON array and read with
  `json_each`.
- Every selector: wildcard, type (including inverted, with the seekable versionless predicate
  above), id, timestamp, incoming reference, text with the `LIKE` fallback; feed windows through the
  existing `buildQueueWindow`; `SelectStep.limit`.
- `FilterDeletedStep` as the recursive `dep` CTE, both modes.
- `FilterStep` for `object` (typename, id, props, foreignKeys, metaKey, the metaVersion pre-pass),
  `compare`, `in`, `contains` (scalar and strict structural), `range`, `tag`, `timestamp`,
  `has-parent`, `mnemonic`, `not`, `and`, `or`.
- `OrderStep`, `LimitStep`, `SkipStep`, projection; the `changed` diff and `getResults` read rows.
- Executor dispatch: the compiled path when the plan is within coverage, the legacy path otherwise,
  gated by the flag. `ExecutionTrace` gains `sql`, `rows`, `sqlTime` and `explain`.
- Compiler unit tests snapshotting the SQL per step; `index-core:test-browser` covers wa-sqlite.
- Decide open question 1 (separate table or column) from the 100k bench.

### Phase 3: full coverage, legacy deleted

- `TraverseStep`: outgoing reference (`json_each` on the body), incoming reference (`reverseRef` and
  `propPathNormalized`), relation and hierarchy in both directions.
- `UnionStep` (`UNION`, identity `(spaceId, documentId, objectId)`) and `SetDifferenceStep`
  (`EXCEPT` on `objectId`).
- `in-query` as a shared subquery CTE; `child-of` as the ancestor CTE at depth 10; the strong
  dependency filter as the recursive existence CTE.
- `AggregateStep`: coalesce-chain group keys, window aggregates, the two-level `DENSE_RANK`,
  group-aware limit and skip.
- Delete the in-memory path: the step methods, `QueryItem`, the host's use of `filterMatchDoc`, the
  flag. Stop sending `documentJson` for document rows.
- Client alignment in `working-set-executor.ts`: code-unit natural order, the adopted string
  collation for property order, child-of depth 10.
- Changeset naming the collation and mixed-type comparison changes.

### Phase 4: EDGE

- `Indexer.execPlan(ctx, plan)` RPC in `edge/packages/services/db-service`; `data-service.ts` plans
  with the `QueryPlanner` from `@dxos/echo-host/query`.
- Delete `db-service/src/worker/query/` (executor, planner fork, `filter-match.ts`, `plan.ts`).
- Catalog bump to the dxos release carrying the compiler, after the `db-service` workerd suite is
  green through a linked build (`pnpm link-packages ../dxos --all --install`).
- Resolve open question 5 first.

### Phase 5: indexes and storage

- `IndexEngine.ensurePropertyIndex(path)`, creating
  `CREATE INDEX IF NOT EXISTS ... ON objectData(json_extract(body, '$."<path>"'))` in the compiler's
  exact spelling; a test asserts the use through `EXPLAIN QUERY PLAN`.
- Contentless `ftsIndex` (`content=''`, `contentless_delete=1`) once nothing reads `snapshot`; a
  migration retiring the FTS cursor for the rebuild.
- `DeletionResolver` in garbage collection reads the `dep` CTE instead of loading documents.
- `EXPLAIN QUERY PLAN` attached to traces by default in dev.

Verification per phase: `moon run index-core:test` and `index-core:test-browser`,
`moon run echo-host:test`, `moon run echo-client-e2e:test`; for phase 4 edge's `db-service` workerd
suite through the linked build.

## Risks

- **Backfill duration on large profiles.** Fifty documents per pass with a `loadDoc` each. If the
  1,700-document profile takes tens of seconds, queries are gated for that long on first open after
  upgrade. Mitigation: the gate blocks queries only; measure in phase 1 and raise the per-pass limit
  for the backfill if needed.
- **Storage growth.** Every object's body is stored in `objectData`, and until phase 5 also in
  `ftsIndex`. JSONB is about a fifth smaller than the text copy. Document objects gain a stored body
  they did not have outside FTS. Phase 5 removes the duplicate.
- **Plan quality on large partitions.** A property predicate over a 100k-row type is a scan of that
  partition inside SQLite. It is the same scan the executor does today in JS after loading 100k
  documents, so it is strictly better, but not fast until phase 5's expression indexes. The bench in
  the performance model is the gate.
- **Recursive CTE cost.** Bounded by depth 10 times the working set, each hop an indexed seek once
  `parentId` exists. Without the normalized columns it is a per-hop scan of the space, which the
  prototype `EXPLAIN` showed; hence the columns are in phase 1, not later.
- **SQLite version drift.** The DO runtime's version is not pinned anywhere we control. The
  `migrate()` assertion turns a silent JSONB failure into a loud open-time error, and edge's linked
  workerd suite runs before the catalog bump.
- **Semantic drift between the two executors during phases 2 and 3.** The differential harness is the
  control; the flag is removed the moment coverage is complete so the window is short.
- **Filter nodes that resist SQL.** `metaVersion` is the only one found, handled by the two-statement
  form. If another appears, the rule is a pre-pass that resolves it to literals, never a post-filter in
  JS over candidates.

## Open questions

1. `objectData` as its own table, or `body` as a column on `objectMeta`. Decide with the 100k-row
   bench in phase 2: if the rowid join costs more than the widened metadata scans save, fold it in.
2. Collation for string ordering: BINARY as proposed, or `NOCASE`. BINARY matches `natural` and the
   client can reproduce it exactly; `NOCASE` reads better in lists but is ASCII-only.
3. `metaVersion` resolution: the two-statement pre-pass as proposed, or projecting `@meta.version` out
   of the final rows and filtering in JS. The pre-pass keeps `LIMIT` exact; the post-filter does not.
4. Backfill policy: gate queries as proposed, or serve the legacy executor until `objectData` is
   complete. Gating is simpler and the legacy path is scheduled for deletion.
5. Whether EDGE's clients read `documentJson` for document rows. The functions runtime proxies
   `execQuery` to edge's data service, and edge's executor sends a body for every row today. Confirm
   the consumer is the same `IndexQuerySource` before phase 4 drops it there too.

## References

- Executor and planner: `packages/core/echo/echo-host/src/query/{query-executor,query-planner,plan,group-by}.ts`
- Host services: `packages/core/echo/echo-host/src/db-host/{query-service,echo-host,deletion,invalidation-hint}.ts`
- Indexes: `packages/core/echo/index-core/src/{index-engine,index-tracker}.ts`,
  `packages/core/echo/index-core/src/indexes/{entity-meta-index,fts-index,reverse-ref-index}.ts`,
  `packages/core/echo/index-core/src/migrations/**`
- Filter semantics: `packages/core/echo/echo/src/internal/Filter/match.ts`, AST in
  `packages/core/echo/echo-protocol/src/query/ast.ts`
- Client: `packages/core/echo/echo-client/src/client/index-query-source-provider.ts`,
  `packages/core/echo/echo-client/src/query/{working-set-executor,graph-query-context,query-result}.ts`
- EDGE: `edge/packages/services/db-service/src/worker/{query,indexer}/`
- Prior art: `.agents/projects/sql-migrations/DESIGN.md`, `plans/feed-query-path/PLAN.md`,
  `packages/core/echo/echo-host/docs/GARBAGE_COLLECTION.md`, `echo-client-e2e/BENCHMARKS.md`

## Implementation notes

What landed, and where it departs from the proposal above.

- **The compiler lives in `echo-host`, not `index-core`**: `packages/core/echo/echo-host/src/query/sql/compile.ts`.
  `QueryPlan` and `QueryPlanner` are `echo-host` modules and `index-core` cannot depend on
  `echo-host` (the dependency runs the other way), so putting the compiler in `index-core` first
  means moving the plan types there. That move is the first step of phase 4, since EDGE is the
  consumer that needs it; until then the compiler imports the index fragments it shares
  (`buildSourceCondition`, `buildTypeDxnCondition`, `buildQueueWindow`, `buildFtsCondition`) from
  `index-core`.
- **Backfill is per store, by different means.** `objectSnapshot` is the store the compiler reads
  (there is no `objectData`); `INDEX_NAMES` carries `objectSnapshot`, `reverseRef3` and `fts7`. The
  reverse-reference index name bumped `reverseRef2` to `reverseRef3` for `propPathNormalized`, with
  tracker migration `0006_retire_reverse_ref2_cursors` dropping the orphaned rows, so its rows
  re-present once and fill the column. `objectMeta` is written by the primary pass, whose cursors no
  migration resets, so its normalized id columns are filled by entity-meta migration
  `0009_backfill_normalized_ids` instead — a cursor reset would not reach them.
- **What the compiler declines**, all for the same reason — answering would need a store read before
  the statement exists, which would make compilation impure and bake in a value that goes stale:
  a filter reading `@meta` (`objectSnapshot` drops it for document rows), a `metaVersion` semver
  range (resolvable only against the versions present), and a `timestamp` day group in a named zone
  (local day boundaries depend on the store's timestamp range). `planDeclinedByCompiler` detects all
  three and the in-memory executor answers instead, so `QueryPlanner.createPlan` is synchronous.
- **The query gate** is `QueryServiceProps.hasCompleteSnapshots`; `QueryServiceImpl` awaits
  `updateIndexes()` before a compiled query's first execution while it is false and caches `true`
  once seen. A memory-path query is not gated on it, since it loads the documents itself.
- **The in-memory path stays.** It remains the default: `QueryExecutor` still holds `IndexEngine`,
  `AutomergeHost` and `SpaceStateManager`, `resolveQueryExecutorMode` defaults to `memory`, and a
  plan the compiler declines runs step by step whatever the mode says. The compiled path is one
  `QueryPlan.SqlStep` that `QueryPlanner.compilePlan` emits in place of the steps it absorbs, run
  through the same step loop as any other step. (The `memory` column in `BENCHMARKS.md` comes from
  `c5294281`.)
- **Three-valued logic** was the one class of bug the differential test found: `NOT (json_type(b, p)
= 'text' AND ...)` is `NULL` for a missing property, and a `NULL` predicate drops the row where
  the matcher's `!==` keeps it. Every type test is `COALESCE(json_type(...), 'missing')` for this
  reason (`sql/differential.test.ts` is the guard).
- **`metaVersion`** resolves as the two-statement pre-pass (open question 3), reusing `matchMetaKey`
  from `@dxos/echo/internal` rather than adding a `semver` dependency to `echo-host`.
- **Traversals dedupe** on `recordId` (`GROUP BY`), where the legacy executor could yield the same
  target twice when two anchors referenced it; the client deduplicated by id anyway.
- **The versionless type predicate seeks.** `buildTypeDxnCondition` bounds each form with
  `typeDXN >= form AND typeDXN < form || ';'` ahead of the exact `= OR LIKE` residual, so both the
  compiler and the legacy `queryTypes` path get `(spaceId=? AND typeDXN>? AND typeDXN<?)` instead
  of a partition scan.
- **Not done here**: phase 4 (EDGE indexer DO) and phase 5 (`ensurePropertyIndex`, contentless
  `ftsIndex`, `DeletionResolver` on the `dep` CTE). Benchmark results:
  `echo-client-e2e/BENCHMARKS.md`, "Query executor: memory vs sql".
