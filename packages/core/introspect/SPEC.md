# DXOS Plugin Introspection — Build Spec

## Goal

Build a system that exposes structured knowledge of the DXOS monorepo (packages, symbols, plugins, surfaces, capabilities, intents, schemas, idioms) to two consumers:

1. **An MCP server** so LLMs can query it while writing DXOS/Composer code
2. **A Composer plugin** so human authors get the same information in-app

Both are thin adapters over a shared core. Build the core and the MCP server first; the Composer plugin comes later.

## Architecture

```text
packages/devtools/
  introspect/               ← index + query + curation (no transport, no UI)
  introspect-mcp/           ← MCP adapter (Node, stdio + HTTP)
  introspect-composer/      ← Composer plugin (later — out of scope for v1)
```

Three layers inside `core`, separated cleanly:

- **Index layer** — walks the monorepo, parses TS, extracts plugin metadata. Outputs a normalized in-memory graph. Watches files for changes.
- **Query layer** — pure functions over the index. Returns plain data, no formatting or truncation. This is the API both adapters consume.
- **Curation layer** — hand-authored data (idioms, canonical examples, anti-patterns) loaded from markdown/JSON files in the repo.

The MCP adapter does only: tool schema definitions, parameter validation, response shaping for token budgets, and stable ref formatting. Everything else lives in core.

## Non-goals for v1

- Composer plugin UI (different milestone)
- Daemon mode (in-process is fine for now; design the query API so a daemon can be slotted in later)
- Auth/multi-tenancy on the MCP server (assume [localhost](http://localhost))
- Indexing dependencies outside the monorepo
- Fine-tuning, embeddings, or vector search — this is structured retrieval only

## Core package: `@dxos/introspect`

### Tech choices

- TypeScript, ESM
- `ts-morph` for semantic TS analysis (resolving re-exports, following type aliases, reading JSDoc)
- Tree-sitter or `ts-morph` directly for symbol extraction — pick one, don't mix
- `chokidar` for file watching
- Reads Moon's project graph for the package list (don't reimplement package discovery)
- Effect Schema parsed via the schema's own AST where possible, falling back to source extraction

### Public API

Export a single `createIntrospector(options)` factory:

```ts
type IntrospectorOptions = {
  monorepoRoot: string;
  watch?: boolean; // default true
  curationPath?: string; // default <root>/.dxos-introspect/
};

type Introspector = {
  ready: Promise<void>; // resolves when initial index is built
  dispose: () => void;

  // Package & symbol
  listPackages(filter?: PackageFilter): Package[];
  getPackage(name: string): PackageDetail | null;
  findSymbol(query: string, kind?: SymbolKind): SymbolMatch[];
  getSymbol(ref: SymbolRef, include?: SymbolInclude[]): SymbolDetail | null;

  // Plugin ecosystem
  listPlugins(filter?: PluginFilter): Plugin[];
  getPlugin(id: string): PluginDetail | null;
  listSurfaces(): Surface[];
  listCapabilities(): Capability[];
  listIntents(): Intent[];

  // Schemas
  listSchemas(packageName?: string): SchemaSummary[];
  getSchema(typename: string): SchemaDetail | null;
  findSchemaUsage(typename: string): SchemaUsage[];

  // Composition
  whatWorksWith(ref: PluginRef | SurfaceRef | CapabilityRef): CompositionResult;
  traceIntent(id: string): IntentTrace;
  findExamples(pattern: IdiomPattern): Example[];

  // UI
  listUiComponents(packageName?: string): UiComponent[];
  getComponent(ref: ComponentRef, include?: ComponentInclude[]): ComponentDetail | null;
  findStylingTokens(query: string): StylingToken[];

  // Idioms
  listIdioms(): IdiomSummary[];
  getIdiom(name: string): Idiom | null;

  // Fallback
  searchCode(query: string, scope?: ScopeFilter): CodeMatch[];
};
```

All return types are plain serializable data. No classes, no functions, no Promises in the result objects. The MCP adapter will JSON-serialize them directly.

### Refs

Use stable string refs everywhere so results round-trip cleanly:

- `SymbolRef`: `"@dxos/echo-schema#Expando"`
- `PluginRef`: `"plugin:dxos.org/plugin/markdown"`
- `SurfaceRef`: `"surface:article"`
- `CapabilityRef`: `"capability:dxos.org/capability/intent-resolver"`
- `ComponentRef`: `"@dxos/react-ui#Button"`

Provide `parseRef(s)` and `formatRef(parts)` helpers; don't let adapters string-manipulate refs themselves.

### Indexing details

- Read Moon's project graph (`moon query projects --json` or read `.moon/cache`) for the package list. Fall back to globbing `packages/**/package.json` if Moon isn't available.
- Per package: resolve `main`/`exports`, parse exported declarations with ts-morph, capture name + kind + signature + JSDoc + source location.
- Plugins are identified by packages that export a default `definePlugin(...)` call or have a `meta.ts` matching the plugin shape. Detect both the current and any legacy shapes present in the monorepo — inspect a few real plugins before finalizing detection.
- Surfaces, capabilities, intents: parse from the plugin's `capabilities` array and the `defineCapability` / `contributes` calls. These should be statically analyzable; if a plugin builds capabilities dynamically, log it and skip rather than guess.
- Schemas: find calls to `Schema.Struct`, `S.Struct`, `TypedObject`, etc. — confirm the actual constructors used by inspecting the codebase. Capture typename, version, fields, and references to other schemas.

### File watching

- Watch `packages/*/src/**/*.ts` and `packages/*/package.json`.
- On change, reindex only the affected package and any packages that re-export from it.
- Debounce 200ms.
- Expose an `onUpdate(listener)` event for adapters that want to push changes (the MCP server can ignore this; the Composer plugin will use it).

### Curation layer

A `.dxos-introspect/` directory in the repo root with:

```text
.dxos-introspect/
  idioms/
    plugin-scaffold.md
    intent-handler.md
    surface-contribution.md
    echo-query.md
    capability-provider.md
    ...
  canonical-examples.json   # maps idiom name → [SymbolRef | PluginRef]
  anti-patterns.md           # known bad patterns to flag/explain
```

Idiom markdown files have frontmatter:

```yaml
---
name: intent-handler
related: [capability-provider, plugin-scaffold]
---
```

Body is the explanation + template code. The query layer parses these on startup and on file change; no schema validation beyond frontmatter required fields.

### Tests

- Unit tests for the query layer against a small fixture monorepo (3–4 fake packages, 2 fake plugins) committed to the repo
- Snapshot tests for representative query results
- Integration test that runs against the actual DXOS monorepo and checks: at least N plugins detected, no parse errors logged, all known surfaces present
- No tests for the index file watcher — it's hard to test reliably and mostly glue

## MCP package: `@dxos/introspect-mcp`

### Tech choices

- `@modelcontextprotocol/sdk` (TypeScript)
- Stdio transport for local LLM tools
- HTTP transport behind a flag for browser clients (Composer's existing MCP integration if relevant)
- Node 20+

### Tool surface

Each tool maps to one or two query layer methods. Keep parameter names matching the query API. Tools to implement:

```ts
list_packages(filter?)
get_package(name)
find_symbol(query, kind?)
get_symbol(ref, include?)

list_plugins(filter?)
get_plugin(id)
list_surfaces()
list_capabilities()
list_intents()

list_schemas(package?)
get_schema(typename)
find_schema_usage(typename)

what_works_with(ref)
trace_intent(id)
find_examples(pattern)

list_ui_components(package?)
get_component(ref, include?)
find_styling_tokens(query)

list_idioms()
get_idiom(name)

search_code(query, scope?)   # last resort, log usage
```

### Response shaping

This is the MCP adapter's main responsibility beyond plumbing.

- Default responses target ~500 tokens. If a result would exceed that, truncate with a note like `"truncated: 47 more results, refine query or use get_*"`.
- `get_symbol`, `get_plugin`, `get_schema`, `get_component` accept an `include` array. Default returns signature + one-line summary. Caller asks for `["source"]`, `["examples"]`, `["callers"]` etc. to expand.
- `find_examples` always returns refs + short excerpts; the model calls `get_symbol` to expand.
- Log every tool call with params and response size to a rolling file. This data drives future tool additions.
- Log every `search_code` call separately — these are the queries the structured tools failed to answer, and the highest-priority signal for what to build next.

### Tool descriptions

Tool descriptions are read by LLMs to decide when to call. Write them to be specific about _when_ not just _what_:

> `find_symbol`: Find an exported symbol (function, class, type, hook, schema, capability) by name or partial name across all DXOS packages. Use this when the user references something by name and you need to locate which package owns it before reading more. Returns refs you can pass to `get_symbol`.

Don't write generic descriptions — they reduce trigger accuracy.

### Config

Read config from `.dxos-introspect/mcp.config.json` if present:

```json
{
  "monorepoRoot": "...",
  "transport": "stdio" | "http",
  "httpPort": 3947,
  "logPath": ".dxos-introspect/logs/"
}
```

CLI flags override config file. Sensible defaults: stdio, monorepo root inferred from cwd up to nearest `pnpm-workspace.yaml`.

### Tests

- One integration test per tool that boots the server with a fixture monorepo and round-trips a request
- Snapshot the tool list and response shapes — these are the contract with LLM clients
- No mocking — call the real core against fixtures

## Build order

1. Stub `core` package with the query API types and empty implementations that throw "not implemented"
2. Build the index: package walking, symbol extraction. Get `listPackages` / `getPackage` / `findSymbol` / `getSymbol` working end-to-end against the real monorepo
3. Stub the MCP server with just those four tools. Confirm Claude Code can connect and call them
4. Add plugin detection: `listPlugins` / `getPlugin`. This is where the work concentrates — examine real plugins before designing the detector
5. Add surfaces, capabilities, intents — these all follow from the plugin parser
6. Add schemas
7. Add the curation layer + idioms (write 3 idiom files alongside the code so the loader has something real to test against)
8. Add `findExamples` and composition queries (`whatWorksWith`, `traceIntent`)
9. Add UI components and styling tokens
10. File watcher last — everything works without it, it's just a quality-of-life addition

Each step ships independently. Don't move on until the previous step is callable from the MCP server and returns reasonable results against the actual repo.

## Things to verify against the real monorepo before finalizing design

The model writing this code should not assume — it should read actual DXOS source first to confirm:

- The exact shape of `meta.ts` and how plugins are defined today (current API, plus any legacy shapes still in use)
- How capabilities are defined and discovered
- How surfaces are contributed and consumed
- How intents are dispatched and resolved
- Which Effect Schema constructors are actually used (`S.Struct`? `Schema.Struct`? `TypedObject`?)
- What Moon's project graph output looks like in this repo
- Whether `react-ui` or another package is the canonical UI primitives source
- The styling token system — semantic tokens, OKLCH theme — and where it's defined

Spend the first 30 minutes reading code, not writing it. Note anything surprising in a `DESIGN-NOTES.md` at the package root.

## Open questions to surface, not guess

- Should plugin IDs be the package name or the `id` field in `meta.ts`? Check what's actually unique and stable.
- Are there plugins outside `packages/plugins/`? If so, how are they discovered?
- Is there an existing introspection or devtools package whose work this duplicates? If yes, extend it rather than starting fresh.

If any of these are ambiguous after reading code, ask before deciding.

## Definition of done for v1

- `pnpm -F @dxos/introspect-mcp start` boots an MCP server
- Claude Code configured with the server can: list packages, find any exported symbol, list all plugins with their surfaces and capabilities, get schema definitions, retrieve idioms
- Running against the real monorepo produces no parse errors and detects every plugin currently in `packages/plugins/`
- Adding a new plugin to the monorepo shows up in `list_plugins` within 1s (with watch mode) or after restart (without)
- A new contributor can read the three idiom files and the README and understand how to add a fourth idiom
