# effect-smol — Tasks

_Resume: Phase 3 — edge's **build is green (83/83 moon tasks)** and its **test suites are green** against a locally linked dxos, after fixing two production defects the type-checker could not see (see "Production defects the test run surfaced"). dxos itself is green on build, node `:test` (233 projects), browser (153 tests) and workerd; two `plugin-review` storybook scenarios remain. Next: D7 — publish the dxos branch so edge's `catalog:dxos` pins can replace the local tarball overrides. Uncommitted: none._

Migrate `dxos/dxos` from Effect 3 to Effect 4, then `dxos/edge`. The _why_, the decisions
(D1–D7) and the findings (F1–F4) live in [DESIGN.md](./DESIGN.md) — this file is the ledger.

Migrating on the beta (`4.0.0-beta.105`) — **not** gated on GA (D8).

## Phase 0: Audit and spike — DONE

Establish the size of the problem and de-risk the two unknowns (persisted schemas, the AST).

### Tasks

- [x] **Audit Effect usage across the monorepo** — 2,884/10,456 files, 208/322 packages, per-module
      import counts, ecosystem v4 availability. Numbers in DESIGN.md §Scope.
- [x] **Resolve the `@effect-atom` question** (D2) — absorbed into the v4 train
      (`effect/unstable/reactivity` + `@effect/atom-react@4`); every symbol in use is covered.
- [x] **Port `@dxos/effect`'s `ast.ts` to the v4 AST** — 449 LOC, public API only, clean `tsc`.
      `.agents/projects/effect-smol/spike/src/ast.ts`.
- [x] **Write the v3-persisted → v4 decoder** — 279 LOC, 20 tests over a fixture generated from
      `@dxos/echo` on HEAD (not hand-written). Handles the v3-only sentinels (`/schemas/any`,
      `/schemas/unknown`, `/schemas/{}`), `/schemas/echo/ref`, `propertyOrder`, both annotation
      namespaces.
- [x] **Size the write path** — v4's emitter is not a drop-in; `SchemaRepresentation` round-trips
      losslessly instead (needs a `representation` annotation on declarations + explicit revivers).
- [x] **Mixed-format dispatch** (D4) — `src/dispatch.ts`, 5 tests; formats are structurally
      distinguishable, and the v3 → v4 rewrite is lossless for identity, optionality, validation
      and the ECHO `Ref` DXN.
- [x] **Confirm EDGE's schema surface** (D6) — writes zero types, reads zero stored schemas;
      needs no compat decoder.
- [x] **Confirm the release mechanism** (D7) — EDGE consumes `@dxos/*` from pkg.pr.new at a commit
      SHA; no npm publish or local link needed.

### References

- Spike + full findings: `.agents/projects/effect-smol/spike/REPORT.md`
- Branch `claude/effect-4-migration-audit-pq2m8z`, commits `275d4fc6`, `082684f4` (no PR — user
  asked for none).

## Phase 1: De-risk on v3 — DONE

Work that pays off whether or not v4 ever lands, and shrinks Phase 3 materially. All done on v3.

### Tasks

- [x] **Consolidate `effect/SchemaAST` importers behind `@dxos/effect`** — commit `d79d6bad`.
  - New curated facade `packages/common/effect/src/internal/schema-ast.ts` re-exports the 60
    symbols actually used, surfaced as `SchemaAST` from the package index.
  - 77 consumer files across 26 packages repointed; the only direct importers left are the 4
    inside `@dxos/effect` itself. F1's blast radius drops from 80 files to one module.
  - Added `@dxos/effect` to the five packages that lacked it (`react-ui-canvas-editor`,
    `introspect-tools`, `plugin-thread`, `echo-protocol`, `compute-hyperformula`); no cycle.
  - 180 moon build tasks green across all 27 touched projects; `effect`/`echo`/`schema`/
    `conductor`/`echo-panproto` tests green.
- [x] **Pin the LLM-facing `toJsonSchema` output shape** (D5, F4)
  - `packages/core/echo/echo/src/internal/JsonSchema/json-schema-shape.test.ts`, 5 tests.
  - Pins what the readers depend on: constraints and `description` at the TOP LEVEL of each
    property (not nested under `allOf`), optional fields as the bare type omitted from
    `required` (not `anyOf: [T, null]`), literal unions as a flat `enum`, and a flat document
    with no `$ref`/`definitions`. Full echo suite green (493 passed).
- [x] **Prototype the `org.dxos.type.schema` `0.1.0` → `0.2.0` migration**
  - `spike/src/migration.ts` + `test/migration.test.ts` (5 tests). Idempotent by construction —
    an already-v4 payload is returned by identity, so a re-run, or a space another peer already
    migrated, is a no-op. Verified across the whole corpus, including a half-migrated space.
  - Only the transform is modelled; wiring to `Migration.define` / `Database.runMigrations`
    needs a live database and belongs in Phase 2.
- [x] **Sweep EDGE for transitive consumers of `toJsonSchema` output**
  - Exactly one: `ai-service/src/generation/tools/types.ts:73`. The `graphQuery/cypher`
    `.properties[...]` hits are Cypher graph data, not JSON Schema. The shape contract does
    extend past that call into the model-provider SDK via `parameters:`.
- [x] **Validate the decoder against a real corpus**
  - `corpus-v3.json`: all 18 ECHO types exported by `@dxos/types` (Person, Organization, Message,
    Task, Event, Transcript, Thread, Channel, File, Outline, 5 relations, …), emitted by
    `toJsonSchema` on effect 3.21.4 — 38 refs, 43 enums, 14 patterns, both `/schemas/*` sentinels.
  - `test/corpus.test.ts`, 73 tests: every type decodes to `Objects`, keeps its declared property
    set and per-property optionality, keeps its type identity, and survives a v3 → v4 rewrite
    with an unchanged property shape.
- [x] **Apply Tier 1 renames that v3 already supports** — **not applicable, nothing to do.**
  - Checked every v4 target name against `effect@3.21.4`: `Effect.catch`, `result`, `callback`,
    `catchCause`, `catchDefect`, `tapCause`, `Layer.tapCause`, `Stream.catch`, `result`,
    `fromEffectRepeat`, `catchCause`, `Scope.provide` are all absent.
  - The three that DO exist are semantic traps, not free renames: v3's `Effect.catchIf` is
    predicate-based recovery (not v4's `catchSome` replacement), and v3's `Layer.effect` /
    `effectDiscard` are distinct from `Layer.scoped` / `scopedDiscard` (v4 merges them because
    every layer is scoped). Renaming any of them on v3 would change behaviour.

### References

- Spike now at 106 tests: `.agents/projects/effect-smol/spike/`.

## Phase 2: Migrate dxos/dxos

Against `effect@4.0.0-beta.105`. The branch stays red until the port completes — that is expected,
not a regression to chase.

### Stage 2a: bump and measure

- [x] **Bump the catalog to the v4 train** — `effect@4.0.0-beta.105` plus the 10 `@effect/*`
      packages that ship a v4 beta. `strict-peer-dependencies=true` makes this all-or-nothing:
      the 11 absorbed packages had to leave all 142 manifests in the same change, the
      `@effect-atom/atom@0.5.3` patch had to go with the package (it only widened peer ranges),
      and `ioredis` needed `^5.9.0` for `@effect/platform-node@4`.
      **`pnpm install` resolves cleanly under strict peers** — the first hard gate of Phase 2.
- [x] **Take a compiler-derived error census** — `moon exec --on-failure continue :build`.
      NOTE: a failing package skips everything downstream, so a census only ever measures the
      current _frontier_, never the whole repo. First frontier: 150 errors / 56 files across
      5 packages (`keys`, `effect-atom-solid`, `effect-zod`, `crx-protocol`,
      `vendor-kbn-handlebars`). `@dxos/keys` is the deep one — 30 errors, all Schema renames.
- [x] **Build the Tier 1 codemod** — `tools/codemods/effect-4-tier1.mjs`, applied:
      **1,143 rewrites across ~530 files** in two passes (782 effect renames, then 361 more once
      the file selector was widened to catch files importing only from `@effect-atom`).
      Covers module paths (`effect/Either`→`Result`, `JSONSchema`→`JsonSchema`,
      `TestClock`/`FastCheck`→`effect/testing/*`, `T*`→`Tx*`, `Mailbox`→`Queue`, all
      `@effect-atom/*`→`effect/unstable/reactivity/*`), flat member renames
      (`Effect.catchAll`→`catch` ×153, `either`→`result` ×44, `catchAllCause`→`catchCause` ×26,
      `Layer.scoped`→`effect` ×22, `Scope.extend`→`provide` ×17, `Effect.async`→`callback` ×16,
      …) and the binding renames those imply (`Either`→`Result`, `Registry`→`AtomRegistry`,
      `Result`→`AsyncResult`).
      Deliberately excluded: anything needing judgement (Schema variadic→array, `Context.Tag`→
      `ServiceMap.Service`, layer memoization). Zero `@effect-atom` references left in source.

### Stage 2b: the port — IN PROGRESS

The frontier moves one package at a time: a failing package skips everything downstream, so each
cleared package _raises_ the visible error count rather than lowering it. Progression so far —
5 packages / 122 errors → (keys ported) 9 packages / 552 → (Schema codemod) 9 packages / 528.

- [x] **Port `@dxos/keys`** — 30 errors → 0, 66 tests pass (`cd308198`). Establishes the idioms the
      rest of the port repeats: `Schema.Schema<A,I>`→`Codec`, `filter`→`refine` (messages are
      strings now, not thunks), `annotations`→`annotate`, `pattern`→`check(isPattern)`,
      `SchemaClass`→`Codec`, `JSONSchema.make`→`SchemaRepresentation.toJsonSchemaDocument`, and
      `class Foo extends Schema…{static}` → schema value + `Object.assign`'d statics, since v4
      schemas are values rather than extensible classes.
- [x] **Tier 3 codemod** — `tools/codemods/effect-4-schema.mjs`, 1,539 rewrites / 330 files
      (`4fa9dd1a`). Formatting verified clean.
- [x] **Variadic → array constructors** (~277 sites) — done by a TypeScript-parser codemod after a
      hand-rolled paren scanner corrupted two files. Five of the nine codemods now parse with
      `typescript` rather than regex, for exactly that reason.
- [x] **Build the remaining codemods** — `tools/codemods/`, applied in order:
      `effect-4-verified-renames` (194 rewrites / ~100 files, each pair mined from the official
      guide and checked against the installed `.d.ts` before applying),
      `effect-4-rpc-flat-tags` (66), `effect-4-context-service` (44),
      `effect-4-mutable-struct` (41 structs + 7 records), `effect-4-default-runtime` (31),
      `effect-4-die-message` (19), `effect-4-struct-ops` (18), `effect-4-tool-parameters` (14),
      `effect-4-orelse-effect` (9).
- [x] **Clear the `@dxos/effect` facade** — the SchemaAST compat layer now covers the v4 AST, and
      `@dxos/keys`, `@dxos/echo` and their dependents build on it.
- [x] **Replace `effect/GlobalValue`**, the absorbed-module imports (`@effect/sql/*`,
      `@effect/experimental/Reactivity`, `@effect/opentelemetry/Tracer`, `@effect/ai/*`,
      `@effect/cli/*`, `@effect/platform/KeyValueStore`) and `effect/ConfigError`.
- [x] **`@dxos/echo` green** — the whole suite passes (493 tests). Six v4 regressions behind it,
      all in the JSON-schema round-trip, all now covered by the existing tests:
  - Cyclic schemas blew the stack. v4 walks `Suspend` eagerly and terminates on node identity, and
    the `toJsonSchema` annotation the `$ref` short-circuit relied on is honoured only on _checks_,
    never on a node. The rewrite is memoized per suspended AST; real cycles land in `$defs`.
  - A bare `Schema.Number` lost every annotation — v4 encodes it to `number | "NaN" | ±"Infinity"`
    inside the serializer, past where the type-side annotations are readable. `toCodecJson` now
    runs first so the encoding is materialized where the existing flattening can carry them over.
  - `Format.Currency` came back without `multipleOf`/`format`/`currency`; an empty struct
    serialized as `anyOf: [object, array]` and read back as a union; `id` was prepended rather than
    appended, reordering every ECHO object's properties on a round-trip.
  - `Ref.isRefType` always returned `false` (it read the v3 merged `jsonSchema` annotation), which
    silently disabled ref handling in `react-ui-form`, the assistant tool runtime, `sdk/schema` and
    `plugin-routine`.
  - `Schema.optional` is not idempotent in v4 — it nests `(T | undefined) | undefined`, which broke
    `unwrapOptional`/`getBaseType` and left `Obj.setValue` unable to see an optional array.
- [x] **Port `react-ui-form`** (33 errors → 0) and **`app-toolkit`** (18 → 0). Both needed
      `Schema.extend`, which v4 dropped in favour of a fields-level `fieldsAssign`; the AST-level
      `SchemaAST.assignFields` added to `@dxos/effect` covers the call sites that only hold a
      `Codec`. Unit tests green in both. `react-ui-form`'s 10 storybook integration tests still
      fail on `queryInvitations` / `ECONNREFUSED :3000` — the client stack behind them is not
      ported yet, so they are frontier-blocked rather than a regression.
- [x] **Port the frontier down to 263/324 passing build tasks** — `agent-runtime`, `react-ui-form`,
      `app-toolkit`, `react-ui-canvas-editor`, `plugin-deck`, `react-ui-table`, `plugin-doctor`,
      `cli-util`, `devtools`, `plugin-client`, `plugin-registry`, `plugin-space`, `plugin-calls`,
      `plugin-search`, `plugin-preview`. Two systematic codemod mistakes accounted for most of it:
  - `X.mapFields(Struct.omit(['k']))` cannot infer the struct from a bare key list, so the result
    collapses to `{}`. The data-first `mapFields((fields) => Struct.omit(fields, ['k']))` infers.
  - `Schema.mutable` is arrays-only in v4; on a struct or a record it collapses the same way.
    Structs go through `mapFields(Struct.map(Schema.mutableKey))`, records through `mutableKey`.
- [x] **Vendor the CLI printer** — see [D8](./DESIGN.md#d8--vendor-the-cli-printer-do-not-carry-effect3-for-rendering).
      `@effect/printer`/`@effect/printer-ansi` are staying on the Effect 3 line (0.51.0, 2026-07-30,
      peers `effect: ^3.22.1`) and v4 ships no counterpart; they were catalog-pinned dependencies of
      four packages, not transitive via `@effect/cli`. `cli-util` now carries a `Doc`/`Ansi` pair
      covering the 18 members in use — the same escape-string approach Effect's own v4 CLI took. No
      reflow, since nothing built a `group` or a soft line.
      **Worth a human look at the CLI's rendered output (`dx fn list`, `dx trigger`).**
- [x] **Clear the remaining frontier** — the workspace builds: 325/325 moon build tasks, none
      failing and none skipped. Clearing it also required replacing `dfx` (no v4 release, peers
      `effect@3.21.4`) with `@dxos/discord-client`, which retired the last `effect@3` in the tree.
- [x] **Run the test suites** — first full pass since the port; it surfaced 13 real product bugs,
      not test noise. The three widest: `RpcClient.make` takes its client id from a process-global
      counter (the RpcPort protocol hard-coded `0`, so only the first client in a process ever
      received responses); the v4 rpc client is flat-keyed by prefixed tag, not nested per service
      (every method derived by `makeServicesFromRpc` was `undefined`); and `app-framework`'s
      per-role surface subscription lost its equality when `Data.array` was dropped, so one
      contribution re-rendered every Surface.
- [x] **Close out the node test tail** — every failure chased to a root cause, all of them real: - `app-framework`: a scoped dependency pass returned before its loads settled; a wave
      re-loaded a module its plugin had just auto-disabled; `enable` and `disable` raced on the
      same plugin, leaving it enabled with no modules. - `compute-runtime`: `Scope.close` never settles when it interrupts a joined fiber from
      inside that fiber's own run loop, which is exactly where a handler that wakes its caller
      inline puts `suspend`. - `@dxos/effect`: `SchemaAST.resolve` reads only the LAST check's annotations, so an
      annotation set before a `Schema.check` vanished (plugin-ibkr lost a field mapping). - `echo-client`: v4 hashes an unmarked object structurally, so `Atom.family(db)` walked the
      whole entity graph and threw; `DatabaseImpl` is now marked by-reference. - `cli`: `Command.runWith` takes the arguments, not raw argv; root flags must be
      `withSharedFlags` to parse before a subcommand; `Command.provide` wraps only the handler it
      is applied to, so it must come AFTER `withSubcommands` (or the service must be ambient). - `assistant-toolkit`: `Schema.Void` now serializes to `{ type: 'null' }`, so the
      undeclared-output check missed and `completeJob` rejected every real payload. - Test-side: `FetchHttpClient.Fetch` caches `globalThis.fetch` for the life of the process
      (new `TestHelpers.withStubbedFetch`); v4 does not memoize a layer across `Effect.provide`
      calls (`Layer.build` + provide the context instead).
- [ ] **Two `plugin-review` storybook scenarios** — `Scenario Bold Wrap` and `Scenario Table Suggest`
      render zero `.cm-suggest-insert` overlay widgets in the browser tier. Ruled out: the diff logic
      (the same scenario definitions pass headless, 60/60), the migrated `viewAspect` codec (probed
      directly — round-trips), and the `doc-handle-proxy` change-event gate (removed, rebuilt, same
      failure). This branch's diff to `plugin-review`/`ui-editor`/`versioning` is mechanical renames.
      Not A/B-able locally: branch switching is off-limits and the sandbox runs a symlinked Chromium
      revision, so browser-tier timing differs from CI.
  - Narrowing for whoever picks this up: `tableCellEditScenario` drives the SAME
    `expect-clean-insert` step and PASSES, so neither the step nor the overlay pipeline is broken
    outright. What separates the two failures from every passing scenario is that both change more
    than one point: `boldWrap` types `**` at two positions that must MERGE into one hunk, and
    `tableSuggest` types a multi-line block. Both also pass their earlier `expect-own-branch` step,
    so the edit reaches the branch — only the overlay is empty. Suspect hunk merging/splitting at
    the overlay boundary rather than the diff or the codec.
  - `SuggestionWidget.toDOM` returns an element with NO `.cm-suggest-insert` child when the
    proposal's text is newline-only (`core.length === 0`) — a plausible way to render "zero
    widgets" that is worth eliminating first, though neither scenario's proposal looks newline-only
    on paper.
- [x] **Close out the storybook/browser tail** — browser and workerd suites pass; the browser CLI
      host (`react-ui-terminal`, `plugin-devtools/CliPanel`) landed from main after the branch cut
      and needed porting off `@effect/cli`/`@effect/platform`. Form validation now runs against the
      schema's TYPE side (callers hold decoded values). `AgentDelegationStrategy` was declared a
      singleton while its only consumer reads it with `getAll` — two legitimate providers collided
      once the scheduler fixes let both activate; it is a registry capability now.

- [ ] **Tier 1 — mechanical rewrites** (~2–3 wks): module paths, API renames, the 433 atom files.
- [ ] **Tier 2 — services and runtime** (~3–6 wks): `Context.Tag` → `ServiceMap.Service` (126 class
      decls), `ManagedRuntime`/`Runtime<R>` (`RuntimeProvider`, `dynamic-runtime`), `Cause`,
      forking, `FiberRef` → `Context.Reference`.
- [ ] **Tier 2 — layer memoization audit** (F3)
  - Shared MemoMap across `Effect.provide` produces no compile errors, only shared-instance bugs.
  - Audit `Layer.succeed`/`effect`/`mergeAll` sites and the composition convention; add
    `Layer.fresh` where isolation was implicit.
- [ ] **Tier 3 — Schema rewrite** (~6–12 wks): call-site migration plus `ast.ts`,
      `schema-validator.ts`, `json-schema.ts`, `react-ui-form`.
- [ ] **Add the annotation-resolver lint rule** (F2) — reading `ast.annotations` directly is wrong
      for any refined type.
- [x] **Remove the spike's `as any` casts** before any of it ships — moot as written: the spike code
      never shipped verbatim. The ported modules were rewritten in-package and the casts audited in
      the branch review (`003058bb`); the spike keeps its own casts and stays out of the build.
- [ ] **Dispatch pkg.pr.new on the branch** (D7) — `workflow_dispatch`, since the workflow only
      auto-triggers on `main`.

## Phase 3: Migrate dxos/edge

Branch `claude/effect-4-migration-audit-pq2m8z` in `dxos/edge` (no PR — user asked for none).

### Tasks

- [x] **Link edge against the local dxos build** — `node ./scripts/link-packages.mjs <DXOS> --all
--install` writes 315 `file:.local-pack/*.tgz` overrides into the root `package.json`. This is
      the stand-in for D7 below, not a replacement for it.
- [x] **Fix moon execution under `/workspace`** — moon's WASM toolchain maps virtual `/workspace`
      to the real workspace root, so a checkout whose own path starts with `/workspace` doubles the
      prefix (WASI errno 44). Moved to `/home/user/edge`; documented in edge's `TROUBLESHOOTING.md`.
- [x] **Migrate EDGE to v4** — no compat decoder needed (D6). `moon exec :build` is green at 83/83.
      Cleared, in frontier order: `edge-protocol`, `edge-platform`, `edge-trace`,
      `mcp-space-service`, `mcp-introspect-service`, `crawler-service`, `discord-service`,
      `operation-service`, `transcription-service`, `hub-protocol`, `ai-service`,
      `registry-service`, `db-service`, `functions-service`, `kms-service`, `agents`,
      `hub-service`, `edge`.
- [x] **Scope the `effect` override away from v3-only dependents** — a blanket `effect: 'catalog:'`
      drags `@prisma/config` onto v4, where its variadic `Schema.Union(a, b)` throws at load and
      every `:prisma` task dies. Pinned back with `'@prisma/config>effect': 3.21.4`, which must
      live in the root `package.json` as well: pnpm ignores `pnpm-workspace.yaml`'s `overrides`
      whenever the root manifest declares its own.
- [x] **Bump `dfx` to 1.0.15** — 0.113 peer-depends on `effect ^3.13` and cannot type-check against
      v4 at all. The REST surface changed with the major:
      `getChannelMessages(...).pipe((x) => x.json)` is now `listMessages(...)`.
- [ ] **Run the edge test suites** (`:test`, node + workerd) and fix what the migration broke.
      First run: 100 projects green, 4 failing (`edge` 22/35 files, `mcp-space-service` 4/4,
      `crawler-service` 2/6, `db-service` 1/15). Root causes and fixes below; the two under
      "production defects" would have shipped broken.
      **Correction:** the "103 completed, 0 failed" run previously recorded as green was
      interrupted by the runner's own 30-minute timeout, which dropped `edge:test`'s failure from
      moon's tally. Every complete post-relink run of the `edge` integration suite fails —
      package-level suites are genuinely green, `packages/services/edge/test` is not. Two causes,
      one fixed, one open (see "Edge integration-suite regressions" below).
- [ ] **Repoint `catalog:dxos` at the dxos branch SHA** (`edge:pnpm-workspace.yaml:104`) — blocked
      on D7, and the reason the tarball overrides above are a WIP shim rather than the answer.
- [x] **Verify the ai-service tool-schema path** still passes its description check (F4) —
      unchanged: `description` sits on the property itself, `required` lists the non-optional
      fields, no `$ref`/`definitions`. Pinned by
      `edge:ai-service/src/generation/tools/tool-schema.test.ts` so a regression shows up as a test
      failure rather than a model quietly losing parameter guidance.
- [ ] **Decide the MCP tool-failure contract** — v4 gives a failed tool no `structuredContent`, so
      the machine-readable `code` now rides `content[0].text` as a `code: message` prefix. Any
      client parsing `structuredContent.code` needs updating, or the failures need remodelling into
      each tool's success schema.
- [ ] **Decide whether MCP sessions need a Durable Object** — the session map is isolate-local, and
      Cloudflare does not guarantee an identity keeps landing on the same isolate.
- [ ] **Consider simplifying `createDoSqlTransactionLayer`'s body** — v4's `@effect/sql-sqlite-do`
      backs `SqlClient.withTransaction` with `ctx.storage.transaction()` when the client is built
      with `storage`, which is the same thing this layer hand-rolls. The layer itself stays either
      way: `SqlTransaction` is a DXOS service that exists so a platform runtime can supply its own
      implementation, and only its body could delegate to `SqlTransaction.layer` instead. Left
      alone here because it changes production transaction semantics. (3 call sites: `feed-space`,
      `indexer`, `do-sedimentree-storage`.)

### Production defects the test run surfaced

Both are v4 behaviour changes that the type-checker could not catch, so a green build said nothing
about them.

- **Every MCP session was dead on arrival.** `mcpHandler` built the server layer, served one
  request and disposed it. The 2025-06-18 streamable-HTTP transport keeps its session map inside
  that layer, so the `mcp-session-id` returned by `initialize` pointed at a map that no longer
  existed and every follow-up call 404'd. Now cached per `(env, identity)` — the toolkits capture
  both when their layers are built, and an identity is the only safe sharing boundary for a
  session.
- **Typed tool failures were swallowed.** `McpServer` forwards a declared failure's text only when
  it is an `Error`, substituting a generic "internal server error" otherwise. `ToolFailure` was a
  plain `Schema.Struct`, so `space_not_in_context` / `invalid_request` / `operation_failed` all
  collapsed to that string. It is now a tagged error carrying its code in the message.

### Other test-only fixes

- **`ERR_MODULE_DYNAMIC_SPEC` across every workerd bundle** — see the dxos-side change below.
- **`crawler-service`** reached the Hono validator through `@dxos/edge-platform`'s barrel, whose
  `cloudflare:workers` import cannot resolve in the node pool; it now uses a new `./api` subpath.
  The package also lacked the `vite.config.ts` its siblings have, so vitest was collecting the
  compiled `dist/test/*.test.js` alongside the sources.
- **`discord-api-types`** joined `vitest.shared.ts`'s CJS-interop lists: its `v10.mjs` re-exports a
  CJS bundle member by member, and without interop every binding — including the
  `PermissionFlagsBits` dfx reads at import time — is `undefined`.
- **`db-service`** asserted on a `SqlError` message that v4 now derives from a structured `reason`.

### Edge integration-suite regressions (found by the post-review test audit)

- **FIXED — `McpTestClient` predated the session transport** (edge commit `99a6699`). The
  integration client sent no `Accept` header (v4 406s without both media types) and no
  `mcp-session-id`. It passed earlier only because the harness's mtime-stamped worker-bundle cache
  served a stale pre-migration server; the relink invalidated the stamp and surfaced it. The
  session-scoping test now passes with the fix.
- **FIXED — echo-client doc load deadlocked inside workerd: missing ready beacon.**
  `RepoProxy` gates every `updateSubscription` (which carries the document-load `addIds`) on the
  first batch received from `DataService.subscribe`. The echo-host `DataService` emits an empty
  `{ updates: [] }` batch as that beacon, but the `functions-runtime-cloudflare` adapter — the
  implementation every worker-side echo-client talks to (`WorkerSpaceService`,
  `trace-feed-writer`, MCP sessions) — registered the subscription without emitting it, so
  document loads waited forever and workerd killed the requests as hung. One-line fix in
  `data-service-impl.ts` plus a regression test pinning the beacon as the subscribe contract's
  first emission. Diagnostic ruled out along the way: stale/mixed test bundles (the harness's
  mtime-stamped bundle cache had also masked failures — moon task hashes ignore `node_modules`,
  so relinks never invalidate cached "green" runs), the `sql-sqlite` Migrator narrowing (restated
  byte-equivalent to upstream; reverting it re-breaks bundle loading), and contention.

### dxos-side changes this phase required

- `plugin-space` now re-exports `SpaceOperationHandlerSet` from `./plugin`, matching
  `plugin-projects` and `plugin-tasks` (commit `b60667a6`).
- `sql-sqlite` no longer star-re-exports `Migrator` (commit `5df45d61`). Effect 4 folded
  `fromFileSystem` into `effect/unstable/sql/Migrator`, where v3 kept it in a separate
  `Migrator/FileSystem` module. Its dynamic `import()` of a template-literal path is a specifier no static
  module loader can resolve, and `export *` materializes the whole namespace, so the dynamic import
  rode into every bundle and workerd rejected the entire worker. **This broke real deploys, not
  just miniflare**; it cost 21 of the 22 `edge:test` failures and all 4 `mcp-space-service` node
  tests.

## Phase 4: Ship

Order matters — EDGE ships before Composer.

### Tasks

- [ ] **Land the dxos PR; do not ship Composer.**
- [ ] **Repoint edge at the landed SHA; land and ship EDGE.**
- [ ] **Ship Composer with the type migration** (D4).
- [ ] **Retire the v3 decoder** — gated on space coverage, not a release date; a space nobody opens
      keeps v3 documents indefinitely.

## Review follow-ups deferred (from the comprehensive branch review)

- [ ] `effect-zod`: replace the hand-rolled `AnyAst` structural type (and its cast) with v4's real
      `SchemaAST` discriminated union — verified possible, medium-size rewrite.
- [ ] `devtools/cli`: collapse the two hand-rolled `readRootFlag` argv scanners and the
      `commandConfigLayer` shadow-parse; evaluate v4 `GlobalFlag`/`withGlobalFlags` as the native
      mechanism for `json`/`verbose`/`logLevel`.
- [ ] `client-services` logging test converges the subscribe race with an emit-poll loop; a
      deterministic fix needs a registration-ready signal on `queryLogs`.
- [ ] `react-ui-canvas-compute` `TriggerShape as any` (existing TODO): derive the interface from
      the schema instead.
- [ ] `db-service` `createDoSqlTransactionLayer` body could delegate to v4's storage-backed
      `withTransaction`; left because it changes production transaction semantics.
- [ ] MCP sessions remain isolate-local; durable sessions need a Durable Object.

## Open questions

- [ ] Ride the beta, or wait for `effect` GA? No GA after ~6 months and 105 betas.
- [ ] `effect/unstable/*` has no semver guarantee even post-GA — acceptable for `cli`, `rpc`, `sql`,
      `ai`, `reactivity`?
- [ ] Is `packages/common/effect-atom-solid` deletable in favour of `@effect/atom-solid`?
