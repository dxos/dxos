# Daily Summary Plugin — Implementation Summary

## What Was Built

A Composer plugin that generates AI-powered daily activity summaries as Markdown documents.
It queries recently modified ECHO objects, sends them to an LLM for summarization, and
places the resulting document in a "Summaries" collection. If a summary for the current day
already exists, it updates the existing document instead of creating a duplicate.

Two layers of work:
1. **ECHO timestamp APIs** — infrastructure for querying objects by creation/modification time
2. **Plugin** — AI-powered operation, blueprint with predefined structure, settings UI, and plugin wiring

---

## Phase 1: ECHO Timestamp APIs

### Problem

ECHO had no public API to query objects by when they were created or last modified.
Automerge tracks change clocks internally, but these weren't surfaced through the
ECHO query system.

### Changes

**`packages/core/echo/echo/src/Filter.ts`**
- `Filter.updated({ after?, before? })` — timestamp filter for last-modified time
- `Filter.created({ after?, before? })` — timestamp filter for creation time
- Accept `Date | number` (epoch ms). Produce `{ type: 'timestamp', field, operator, value }` AST nodes.

**`packages/core/echo/echo-protocol/src/query/ast.ts`**
- Added `FilterTimestamp` AST node type:
  ```
  { type: 'timestamp', field: 'createdAt' | 'updatedAt', operator: 'gte' | 'lte', value: number }
  ```

**`packages/core/echo/echo-pipeline/src/query/query-planner.ts`**
- Timestamp filters extracted during query planning and forwarded to the index engine.
- Throws clear errors for unsupported compositions (`not(timestamp)`, `or(timestamp, ...)`).

**`packages/core/echo/echo-pipeline/src/query/query-executor.ts`**
- Routes timestamp filtering through the SQL index via `indexEngine.queryByTimeRange()`.
- Defensive check: throws if unsupported timestamp compositions reach the filter step.

**`packages/core/echo/echo-pipeline/src/db-host/automerge-data-source.ts`**
- Uses `A.diff` to only emit genuinely changed objects, preventing spurious `updatedAt` bumps.

**`packages/core/echo/index-core/src/indexes/object-meta-index.ts`**
- Extended `ObjectMetaIndex` to support time-range queries via `updatedAfter`/`updatedBefore`
  constraints, using the SQLite-backed index for efficient lookups.

### Tests

- `packages/core/echo/echo/src/Filter.test.ts` — timestamp filter AST generation, Date/number input, composition.
- `packages/core/echo/echo-db/src/query/query.test.ts` — end-to-end timestamp query tests including error cases.
- `packages/core/echo/echo-pipeline/src/filter/filter-match.test.ts` — timestamp pass-through behavior.

---

## Phase 2: Daily Summary Plugin

### Structure

```
packages/plugins/plugin-daily-summary/
├── SUMMARY.md
├── moon.yml
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                                    # Public exports: meta + DailySummaryPlugin
    ├── DailySummaryPlugin.tsx                       # Plugin definition (capabilities wiring)
    ├── meta.ts                                      # Plugin metadata (id, name, icon)
    ├── translations.ts                              # i18n strings
    ├── TRIGGERS.md                                   # Docs on wiring a cron trigger
    │
    ├── blueprints/
    │   ├── daily-summary-blueprint.ts               # Blueprint definition + SUMMARY_STRUCTURE prompt
    │   ├── daily-summary-blueprint.test.ts
    │   └── functions/
    │       ├── index.ts                             # Lazy OperationHandlerSet export
    │       ├── definitions.ts                       # GenerateSummary operation schema
    │       ├── definitions.test.ts
    │       ├── generate.ts                          # Effect handler: AI summarization + upsert
    │       ├── generate.test.ts
    │       └── generate-imperative.ts               # Imperative handler for settings UI button
    │
    ├── capabilities/
    │   ├── index.ts                                 # Barrel exports for all capabilities
    │   ├── blueprint-definition/
    │   │   ├── index.ts                             # Lazy export
    │   │   └── blueprint-definition.ts              # Contributes blueprint to AppCapabilities
    │   ├── react-surface/
    │   │   ├── index.ts                             # Lazy export
    │   │   └── react-surface.tsx                    # Settings surface (article role)
    │   └── settings/
    │       ├── index.ts
    │       └── settings.ts                          # KVS-backed settings (summaryHour, summaryMinute)
    │
    ├── containers/
    │   ├── index.ts                                 # Barrel export
    │   └── DailySummarySettings/
    │       ├── index.ts
    │       └── DailySummarySettings.tsx              # Settings UI with "Generate Now" button
    │
    └── types/
        ├── index.ts
        ├── schema.ts                                # DailySummarySettingsSchema (Effect Schema)
        ├── schema.test.ts
        └── capabilities.ts                          # Settings capability definition
```

### How It Works

#### AI-Powered Summarization (`generate.ts`)

The Effect handler invoked through the blueprint:

1. Computes a cutoff timestamp from `lookbackHours` (default 24).
2. Queries `Database.runQuery(Query.type(Obj.Unknown).select(Filter.updated({ after: cutoff })))`.
3. Builds a list of object descriptions (type + name).
4. Sends descriptions to `LanguageModel.generateText` with the `SUMMARY_STRUCTURE` system prompt.
   - Uses `claude-haiku-4-5` for fast, cheap summarization.
   - AI layers provided locally via `Effect.provide(Layer.mergeAll(AiService.model(...), ...))`.
5. **Upsert**: queries for an existing `org.dxos.type.document` with `name === "Daily Summary — {date}"`.
   - If found → updates the existing document's text content in place.
   - If not found → creates a new document and adds it to the "Summaries" collection.
6. Returns `{ id: DXN, objectCount, date }`.

#### Predefined Summary Structure (`SUMMARY_STRUCTURE`)

Defined in `daily-summary-blueprint.ts` and used as the LLM system prompt:

- **Highlights** — 2-4 bullet points of significant changes
- **Activity by Category** — objects grouped by type with brief context
- **Statistics** — total count, breakdown by type, time window

#### Document Naming

Documents are named `Daily Summary — {Month} {Day}` (e.g., "Daily Summary — March 20").
This enables the upsert logic: running the generator multiple times on the same day
updates the existing document rather than creating duplicates.

#### Settings UI (`DailySummarySettings.tsx`)

A container component rendered in Composer's plugin settings panel via `react-surface`:

- **"Generate summary now"** button — triggers immediate summary generation.
- Uses `useClient()` to get the default space, then calls `generateSummaryInSpace()`.
- The imperative generator (`generate-imperative.ts`) uses template-based formatting
  (no AI) for instant results. Same upsert behavior as the Effect handler.

#### Blueprint (`daily-summary-blueprint.ts`)

- Key: `org.dxos.blueprint.daily-summary`
- Exposes `GenerateSummary` as an AI tool.
- Instructions tell the agent to use the generate tool for summarization.

#### Plugin (`DailySummaryPlugin.tsx`)

Registers four capabilities:
- `AppPlugin.addBlueprintDefinitionModule` — blueprint with AI tool
- `AppPlugin.addSettingsModule` — KVS-backed settings (summaryHour, summaryMinute)
- `AppPlugin.addSurfaceModule` — settings UI with generate button
- `AppPlugin.addTranslationsModule` — i18n strings

No custom ECHO types — documents render via plugin-markdown.

### Composer Integration

`packages/apps/composer-app/src/plugin-defs.tsx` — imports and registers `DailySummaryPlugin`.

### Tests

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
The `GenerateSummary` operation can be invoked:
- Via the **"Generate now" button** in plugin settings (imperative, no AI)
- By an **AI agent** via the blueprint tool (AI-powered)
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
