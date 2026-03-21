# Daily Summary Plugin — Implementation Summary

## What Was Built

A Composer plugin that generates daily activity summaries as Markdown documents by querying
recently modified ECHO objects and placing the results in a "Summaries" collection.

Two layers of work:
1. **ECHO timestamp APIs** — new infrastructure for querying objects by creation/modification time
2. **Plugin** — operation, blueprint, and plugin wiring that uses those APIs

---

## Phase 1: ECHO Timestamp APIs

### Problem

ECHO had no public API to query objects by when they were created or last modified.
Automerge tracks change clocks internally, but these weren't surfaced through the
ECHO query system.

### Changes

**`packages/core/echo/echo/src/internal/Entity/timestamps.ts`** (new)
- `EntityTimestamps` interface with `createdAt` and `updatedAt` as optional `Date` values.
- `getTimestamps(entity)` reads timestamps from the object meta index via an internal symbol.

**`packages/core/echo/echo/src/Filter.ts`**
- Added five timestamp filter builders:
  - `Filter.updatedAfter(date)` / `Filter.updatedBefore(date)`
  - `Filter.createdAfter(date)` / `Filter.createdBefore(date)`
  - `Filter.updatedBetween(from, to)` — composes `updatedAfter` + `updatedBefore` via `and()`
- Accept `Date | number` (epoch ms). Produce `{ type: 'timestamp', field, operator, value }` AST nodes.

**`packages/core/echo/echo-protocol/src/query/ast.ts`**
- Added `FilterTimestamp` AST node type:
  ```
  { type: 'timestamp', field: 'createdAt' | 'updatedAt', operator: 'gte' | 'lte', value: number }
  ```

**`packages/core/echo/echo-pipeline/src/query/query-planner.ts`**
- Timestamp filters are extracted during query planning and forwarded to the index engine
  as a time-range constraint.

**`packages/core/echo/echo-pipeline/src/query/query-executor.ts`**
- Applies timestamp post-filtering when the index doesn't handle it natively.

**`packages/core/echo/echo-pipeline/src/filter/filter-match.ts`**
- Runtime matching for `FilterTimestamp` nodes against object metadata.

**`packages/core/echo/index-core/src/indexes/object-meta-index.ts`**
- Extended `ObjectMetaIndex` to support time-range queries via `updatedAfter`/`updatedBefore`
  constraints, using the SQLite-backed index for efficient lookups.

**`packages/core/echo/echo-db/src/echo-handler/echo-handler.ts`**
- Wires the `ObjectTimestampsId` symbol onto reactive proxy objects so `getTimestamps()` works.

**`packages/core/echo/echo-db/src/proxy-db/database.ts`**
- `Database.getObjectTimestamps()` method for programmatic access.

**`packages/core/echo/echo-query/src/query-lite/query-lite.ts`**
- Mirrored timestamp filter statics on `FilterClass` for type compatibility with the
  query-lite subsystem.

### Tests

- `packages/core/echo/echo/src/Filter.test.ts` — 10 tests for timestamp filter AST generation,
  Date/number input, composition with `and()`.
- `packages/core/echo/index-core/src/indexes/object-meta-index.test.ts` — extended with
  time-range query tests.
- `packages/core/echo/echo-pipeline/src/filter/filter-match.test.ts` — timestamp match tests.

---

## Phase 2: Daily Summary Plugin

### Structure

```
packages/plugins/plugin-daily-summary/
├── moon.yml
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                         # Public exports: meta + DailySummaryPlugin
    ├── DailySummaryPlugin.tsx            # Plugin definition
    ├── meta.ts                          # Plugin metadata
    ├── translations.ts                  # i18n strings
    ├── TRIGGERS.md                      # Docs on wiring a cron trigger
    ├── blueprints/
    │   ├── daily-summary-blueprint.ts   # Blueprint definition (key, operations, instructions)
    │   └── functions/
    │       ├── definitions.ts           # GenerateSummary operation schema
    │       └── generate.ts              # Handler: query → build markdown → create doc → add to collection
    ├── capabilities/
    │   ├── blueprint-definition-module.ts  # Contributes blueprint to AppCapabilities
    │   └── settings/
    │       └── settings.ts              # KVS-backed settings (summaryHour, summaryMinute)
    └── types/
        ├── schema.ts                    # DailySummarySettingsSchema (Effect Schema)
        └── capabilities.ts              # DailySummarySettings type capability
```

### How It Works

**`GenerateSummary` operation** (`generate.ts`):
1. Computes a cutoff timestamp from `lookbackHours` (default 24).
2. Queries `Database.runQuery(Query.type(Obj.Unknown).select(Filter.updatedAfter(cutoff)))`.
3. Builds a markdown string listing each modified object by type and name.
4. Creates a `org.dxos.type.document` (Markdown document) using a local schema definition
   matching plugin-markdown's `Markdown.Document`. This avoids importing `@dxos/plugin-markdown/types`
   which transitively pulls in browser-only `@dxos/ui-editor` dependencies.
5. Finds or creates a collection named "Summaries" via `CollectionModel.add()`.
6. Adds the document to the collection.
7. Returns `{ id: DXN, objectCount, date }`.

**Blueprint** (`daily-summary-blueprint.ts`):
- Key: `org.dxos.blueprint.daily-summary`
- Exposes `GenerateSummary` as an AI tool with instructions for the agent.

**Plugin** (`DailySummaryPlugin.tsx`):
- Registers: blueprint definition, settings module, translations.
- No custom types, no custom surfaces — documents render via plugin-markdown.

### Composer Integration

`packages/apps/composer-app/src/plugin-defs.tsx` — imports and registers `DailySummaryPlugin`.

### Tests (17 passing)

| File | Tests | What |
|------|-------|------|
| `generate.test.ts` | 5 | Creates markdown doc, creates/reuses Summaries collection, includes previous summary, date naming |
| `daily-summary-blueprint.test.ts` | 3 | Blueprint key, operations, make() |
| `definitions.test.ts` | 3 | Operation key, metadata, services |
| `schema.test.ts` | 3 | Settings validation (full, empty, partial) |
| `translations.test.ts` | 1 | Plugin translation keys |
| `meta.test.ts` | 2 | Plugin id and fields |

---

## What's NOT Done

### No Automatic Scheduling

The plugin does **not** create a `Trigger.Trigger` object for cron-based scheduling.
The `GenerateSummary` operation can only be invoked:
- Manually by an AI agent via the blueprint
- Programmatically via `FunctionInvocationService.invokeFunction()`

To add automatic daily invocation, a module needs to:
1. Read `summaryHour`/`summaryMinute` from settings
2. Create a `Trigger.Trigger` with `spec: { kind: 'timer', cron: '0 ${hour} * * *' }`
   referencing the `GenerateSummary` operation
3. Update the cron when settings change

The existing `TriggerDispatcher` from `plugin-automation` handles execution.
See `TRIGGERS.md` for the trigger shape.

### No Previous-Summary Chaining

Each invocation is standalone. To chain summaries (passing yesterday's summary as
`previousSummary` input), the trigger input template would need to query the most
recent summary document from the Summaries collection.

### No AI-Enhanced Summaries

The current handler builds summaries mechanically (list of type+name). The blueprint
instructions tell the agent to structure highlights/details/statistics, but the handler
itself doesn't call an LLM. A future version could use the AI service to generate
natural-language summaries from the raw object list.
