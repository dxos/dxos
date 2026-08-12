# effect-smol — Tasks

_Resume: Phase 3 — edge's **build is green (83/83 moon tasks)**; its **package-level suites are green** against a locally linked dxos, but the **`packages/services/edge/test` integration suite still fails** (the earlier "green" reading was a runner-timeout artifact — see the correction under "Run the edge test suites"). dxos itself is green: build, node `:test` (555 moon tasks), browser, workerd, and the `model-fixture` suites now replay clean; two flaky `plugin-review` storybook scenarios remain. Edge was verified against dxos **before** the tool-surface and JSON-Schema changes recorded under "Model fixtures", so it needs re-running once this lands — `edge:ai-service/.../tool-schema.test.ts` pins that surface. Next: D7 — publish the dxos branch so edge's `catalog:dxos` pins can replace the local tarball overrides._

Migrate `dxos/dxos` from Effect 3 to Effect 4, then `dxos/edge`. The _why_, the decisions
(D1–D7) and the findings (F1–F4) live in [DESIGN.md](./DESIGN.md) — this file is the ledger.

Migrating on the pre-release line (`4.0.0-rc.108`) — **not** gated on GA (D8).

## Phase 0: Audit and spike — DONE

Establish the size of the problem and de-risk the two unknowns (persisted schemas, the AST).

### Tasks

- [x] **Audit Effect usage across the monorepo** — 2,884/10,456 files, 208/322 packages, per-module
      import counts, ecosystem v4 availability. Numbers in DESIGN.md §Scope.
- [x] **Resolve the `@effect-atom` question** (D2) — absorbed into the v4 train
      (`effect/unstable/reactivity` + `@effect/atom-react@4`); every symbol in use is covered.
- [x] **Port `@dxos/effect`'s `ast.ts` to the v4 AST** — 449 LOC, public API only, clean `tsc`.
      Shipped as `packages/common/effect/src/internal/{ast,schema-ast}.ts`.
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

- Findings F1–F4: [DESIGN.md](./DESIGN.md); durable rules: `.agents/skills/effect/v4-schema.md`.
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
- [x] **Prototype the `org.dxos.type.schema` `0.1.0` → `0.2.0` migration** — verified across the
      whole corpus, including a half-migrated space. Only the transform was modelled; wiring it to
      `Migration.define` / `Database.runMigrations` needs a live database and is the Composer-ship
      step. The spike is gone, so the transform is recorded here verbatim — it is the whole of it:

  ```ts
  // `Type.Type` entities store `{ name?, jsonSchema }`. The migration rewrites that payload from
  // the v3 JSON Schema encoding to v4's `SchemaRepresentation`. Idempotent by construction: a
  // payload already in the v4 encoding is returned untouched, so a re-run — or a space another
  // peer already migrated — is a no-op.
  const transform = (entity: StoredType): StoredType =>
    isRepresentationDocument(entity.jsonSchema)
      ? entity
      : { ...entity, jsonSchema: writeStoredSchema(readStoredSchema(entity.jsonSchema)) };
  ```

  The two formats are structurally distinguishable — a representation document carries
  `{ representation, references }`, which a v3 JSON Schema document never has — so no version field
  needs adding to already-written data. Note this depends on the deferred `SchemaRepresentation`
  write path (see DESIGN.md §Deferred); until that lands there is no v4 encoding to migrate _to_.

- [x] **Sweep EDGE for transitive consumers of `toJsonSchema` output**
  - Exactly one: `ai-service/src/generation/tools/types.ts:73`. The `graphQuery/cypher`
    `.properties[...]` hits are Cypher graph data, not JSON Schema. The shape contract does
    extend past that call into the model-provider SDK via `parameters:`.
- [x] **Validate the decoder against a real corpus**
  - All 18 ECHO types exported by `@dxos/types` (Person, Organization, Message, Task, Event,
    Transcript, Thread, Channel, File, Outline, 5 relations, …), emitted by `toJsonSchema` on
    effect 3.21.4 — 38 refs, 43 enums, 14 patterns, both `/schemas/*` sentinels. It cannot be
    regenerated: v4 emits no sentinels, so they survive only in stored data and in this fixture.
  - Now permanent, against the shipped decoder:
    `packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3-corpus.json` +
    `json-schema-v3.test.ts` (60 tests). Every type decodes to `Objects`, keeps its declared
    property set, per-property optionality and type identity; the three sentinels and the ref DXN
    are asserted directly. Those decoder branches had no coverage in-package before.
- [x] **Apply Tier 1 renames that v3 already supports** — **not applicable, nothing to do.**
  - Checked every v4 target name against `effect@3.21.4`: `Effect.catch`, `result`, `callback`,
    `catchCause`, `catchDefect`, `tapCause`, `Layer.tapCause`, `Stream.catch`, `result`,
    `fromEffectRepeat`, `catchCause`, `Scope.provide` are all absent.
  - The three that DO exist are semantic traps, not free renames: v3's `Effect.catchIf` is
    predicate-based recovery (not v4's `catchSome` replacement), and v3's `Layer.effect` /
    `effectDiscard` are distinct from `Layer.scoped` / `scopedDiscard` (v4 merges them because
    every layer is scoped). Renaming any of them on v3 would change behaviour.

### References

- The spike's v3 corpus and its decode coverage now live in `@dxos/echo`
  (`src/internal/JsonSchema/json-schema-v3-corpus.json` + `json-schema-v3.test.ts`).

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
      failing and none skipped. Clearing it also required retiring the pinned `dfx@0.113` (peers
      `effect@3.21.4`), the last `effect@3` in the tree.
- [x] **Bump dfx instead of replacing it** — reverses the `@dxos/discord-client` detour.
      That package was written on a false premise ("dfx has no v4 release"): `dfx@1.0.0` shipped
      2026-02-20 peering `effect >=4.0.0-beta.101`, six months earlier, and Phase 3 had already
      bumped edge to `dfx@1.0.15` against v4. Catalog now carries `dfx@^1.0.15`, the package is
      deleted, and both consumers are back on dfx. Neither argument for keeping it survived:
      the `discord-api-types` interop break is edge-specific (its vitest uses `deps.inline`), and
      dxos loads dfx at runtime in `discord-source.test.ts` without it.
  - Only real port work: dfx hard-codes `Authorization: Bot <token>`, so the `Bot` -> `Bearer`
    rewrite returns to the proxy fetch layer (`proxy-http-client.ts`) — upstreaming it to dfx is
    still the right fix. `DiscordRESTMemoryLive` supplies the rate-limit store dfx needs.
  - `generate-fixtures.ts` reads the Discord body off `DiscordRestError.data`; the pre-migration
    `[cause]` probe was wrong for dfx 1.x too.
  - The lockfile has zero `effect@3` references, so this does not reintroduce the two-runtime
    hazard the replacement was meant to remove.
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
  - **These are FLAKY, not deterministic (2026-08-11).** CI has now run the suite on consecutive
    commits: `c8d9b4b6` failed four of them across all three moon attempts, and `cf745a8b` passed
    the whole storybook job with no relevant change between. A local run gave three failures on one
    attempt and four on the next, alongside `Browser connection was closed` errors. The set also
    varies — `Scenario Table Cell Edit` and `Suggesting Swap` both failed on `c8d9b4b6` even though
    the note above records `tableCellEdit` as passing, so "which scenarios fail" is not a stable
    signal to reason from. Treat the timing (each failure burns its full 15s `waitFor` twice, ~33s)
    as the primary clue and re-verify any hypothesis across several runs before believing it.
- [x] **Close out the storybook/browser tail** — browser and workerd suites pass; the browser CLI
      host (`react-ui-terminal`, `plugin-devtools/CliPanel`) landed from main after the branch cut
      and needed porting off `@effect/cli`/`@effect/platform`. Form validation now runs against the
      schema's TYPE side (callers hold decoded values). `AgentDelegationStrategy` was declared a
      singleton while its only consumer reads it with `getAll` — two legitimate providers collided
      once the scheduler fixes let both activate; it is a registry capability now.

The three "Tier" rows below were the **original up-front estimate**, written before the port started.
They are superseded by the work actually recorded above — kept for the estimate-versus-actual record,
not as open work. The one genuinely outstanding item from that plan is the layer-memoization audit.

- [x] **Tier 1 — mechanical rewrites** (est. ~2–3 wks): module paths, API renames, the 433 atom files.
      Landed via the codemods in `tools/codemods/` (see "Tier 3 codemod" and "Build the remaining
      codemods" above).
- [x] **Tier 2 — services and runtime** (est. ~3–6 wks): `Context.Tag` → `ServiceMap.Service` (126
      class decls), `ManagedRuntime`/`Runtime<R>` (`RuntimeProvider`, `dynamic-runtime`), `Cause`,
      forking, `FiberRef` → `Context.Reference`. Done — the workspace builds (325/325) and the node
      suite passes (555 moon tasks).
- [ ] **Tier 2 — layer memoization audit** (F3) — the one part of the original plan still open.
  - Shared MemoMap across `Effect.provide` produces no compile errors, only shared-instance bugs.
  - Audit `Layer.succeed`/`effect`/`mergeAll` sites and the composition convention; add
    `Layer.fresh` where isolation was implicit.
- [x] **Tier 3 — Schema rewrite** (est. ~6–12 wks): call-site migration plus `ast.ts`,
      `schema-validator.ts`, `json-schema.ts`, `react-ui-form` — all ported and green. The deeper
      change the estimate implied (adopting `SchemaRepresentation` for stored schemas) was
      deliberately scoped out; it is tracked under "PR review follow-ups" below.
- [ ] **Add the annotation-resolver lint rule** (F2) — reading `ast.annotations` directly is wrong
      for any refined type.
- [x] **Remove the spike's `as any` casts** before any of it ships — moot: the spike code never
      shipped verbatim. The ported modules were rewritten in-package and their casts audited in the
      branch review (`003058bb`); the spike itself has since been deleted.
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

## Model fixtures — DONE

`model-fixture` is a deliberately non-required workflow (see the header of
`.github/workflows/model-fixture.yml`). It is now green: `DX_RUN_MODEL_FIXTURE_TESTS=1 moon run
'#model-fixture:test'` passes every tagged suite (`agent-runtime` 41, `assistant-toolkit` 93, `ai` 91,
`assistant` 53, `plugin-commerce` 36, `plugin-assistant` 168), and the full node suite is green.

Re-recorded against a live provider: `agent-runtime/AgentService.test.ts` (13),
`assistant-toolkit` `skills/database/skill.test.ts` (20) and `skills/memory/skill.test.ts` (3).
The other tagged suites never needed re-recording — they build toolkits with `Tool.make` directly
rather than projecting operations, so nothing in their requests changed.

- [x] **Regenerated the `assistant-toolkit` and `agent-runtime` fixtures against a live provider.**
      A recorded conversation is keyed on its parameters plus prompt, and v4 changed _what the
      request contains_, so every request in those suites missed. Two independent shifts:
  - Tool `inputSchema` emission (optional properties become nullable `anyOf`, an empty `required`
    is dropped, `Schema.Number` gains the non-finite string branch). **Already ported** — run the
    replay with `DX_DUMP_FIXTURE_TOOLS=<dir>` and feed the dump to
    `tools/codemods/migrate-model-fixture-tools.mjs`, which replaces a stored schema only where it
    matches one observed being replaced. 295 schemas across 55 fixtures.
  - The JSON Schema of registered ECHO types, which the agent's prompt embeds verbatim (the
    `Type.Type` meta-schema now serializes with `$defs` and nullable unions, and
    `Schema.Record(…, Any)` no longer emits `additionalProperties`). This is prompt content, not
    parameters: rewriting it to match would keep a response the model produced for a _different_
    prompt, so the tests would assert nothing. That needs a real re-record, not a codemod.
    Regenerate with
    `DX_ANTHROPIC_API_KEY=… DX_UPDATE_MODEL_FIXTURES=1 moon run <project>:test -- <file>`.
    **Regenerate the whole file, never with `-t`** — the suites call
    `EntityId.dangerouslyDisableRandomness()` at module scope, so the ID sequence depends on how
    many tests ran before; a single-test regeneration writes fixtures with IDs that do not match
    the full-file run and corrupts the rest of the suite (see the `regenerate-model-fixture`
    skill).
- [x] **Four production defects the live regeneration surfaced**, each blocking the re-record and none
      a fixture problem. The tool surface was broken end to end on this branch; the suites could not
      have been re-recorded without these.
  - **Optional tool parameters were advertised and validated as required.** In v4 optionality rides
    on an AST node's `context`, and `assistant`'s `mapSchemaTypeForLLM` rebuilt every ref-bearing
    node by hand (`new SchemaAST.Arrays/Objects/Union(…)`) passing only `annotations`, dropping
    `context`. The database skill's `query` therefore emitted `required: ['in']` for a
    `Schema.optional(Schema.Array(Ref))`; a model that legitimately omitted `in` had its call
    rejected with `Missing key at ["in"]`, the agent gave up, and 7 of 20 tests failed on
    unrelated-looking assertions (`expected false to be true` on a deletion that never ran). Fixed
    by delegating recursion to `@dxos/effect`'s `mapAst`, which already carries
    annotations/checks/encoding/`context` across a rebuild, plus its now-exported `retainContext`
    for the wholesale `Ref` → `RefFromLLM` swap. Regression-tested at the primitive level in
    `packages/common/effect/src/ast.test.ts` (`mapAst` keeps `optional`/`optionalKey`/`mutableKey`)
    and at the projection level in `assistant/src/tool-runtime/services.test.ts`.
  - **Audit the other hand-rolled AST rebuilds for the same `context` loss.** Found by
    `grep -n 'new SchemaAST\.(Objects|Union|Arrays)('` — each passes `annotations` but omits
    `checks`/`encoding`/`context`. Not fixed here because the intent differs per site and each wants
    its own test; only the first rebuilds a _property's_ type, which is where optionality is lost:
    - `compute/conductor/src/util/ast.ts` `getPropertyKeyIndexedAccess` — synthesizes a property
      type as `new SchemaAST.Union(types, mode)` for indexed access over a union of structs, so an
      optional property in the members comes back required. Same shape as the defect above.
    - `echo/src/internal/Type/manipulation.ts` (`addFieldsToSchema`, `updateFieldsInSchema`,
      `updateFieldNameInSchema`) and `ui/react-ui-table/src/util/schema.ts` `narrowSchema` — copy
      property signatures verbatim (so per-key modifiers survive) but drop the object node's own
      `checks`/`encoding`/`context`; `narrowSchema` also drops annotations and index signatures.
    - `ui/react-ui-form/src/util/properties.ts` `unwrapOptional` — drops `context` deliberately
      (that is the point) but takes `isMutable` with it; confirm that is intended.
  - **A persisted open record decoded back as a closed struct.** `Operation.serialize` stores
    `inputSchema: JsonSchema.toJsonSchema(operation.input)` and the tool surface is built from the
    _deserialized_ operation, so every operation schema round-trips through ECHO. v4 emits no
    `additionalProperties` when a record's value type is unconstrained (`Any`/`Unknown` serialize to
    the empty schema), so `toEffectSchema` rebuilt `Schema.Struct({})` and the database skill's
    property bag silently stopped accepting keys — which then re-emitted as v4's empty-struct `anyOf`
    and was rejected by the provider. Real data loss, not just a wire nit. Fixed on both sides in
    `echo/src/internal/JsonSchema/json-schema.ts`: `restoreOpenRecord` states `additionalProperties:
true` for an object node that declares neither `properties` nor `additionalProperties`, and
    `objectToEffectSchema` reads `true` back as a record with an unconstrained value. Round-trip
    fidelity is pinned by a test in `json-schema.test.ts`.
  - **A parameterless tool emitted a schema the provider rejects.** `EMPTY_PARAMETERS_SCHEMA` guarded
    against v4's empty-struct emission (`{anyOf: [{type:'object'}, {type:'array'}]}`) with a
    `toJsonSchema` annotation — but **v4 honours only a fixed annotation whitelist**
    (title/description/default/examples/format/…, see `internal/schema/annotations.ts`), so the
    workaround was inert and the `anyOf` reached the wire, where its `{type:'object'}` branch has no
    `additionalProperties`. Since all tools travel in one payload, ONE parameterless operation failed
    every request. Fixed by spelling it `Schema.Record(String, Never)`, whose natural emission is
    `{type:'object', additionalProperties:false}`.
  - **What the model was told and what we validated had diverged.** rc.108 describes a tool through
    the provider's structured-output codec (`prepareTools` → `tryToolJsonSchema`, applied
    unconditionally — NOT gated on `strict`) while `Toolkit.handle` validates the model's arguments
    against the untransformed `parametersSchema`; `LanguageModel`'s `codecTransformer` reaches
    `generateObject` only. So a record was advertised as an array of `[key, value]` pairs but validated
    as an object (`Expected object`), and an optional key was advertised nullable-and-required but
    validated as absent-or-`T` (`Expected string`/`Expected array`). Independently, **v4 core emits
    `Schema.optional(T)` as `anyOf: [T, null]` yet its decoder rejects `null`** — it advertises a value
    its own validator refuses. Disabling strict does not help; both rewrites are unconditional.
    Fixed by projecting operations to **dynamic tools** (`Tool.dynamic`), whose JSON Schema
    `Tool.getJsonSchema` returns verbatim, so we state the contract the model is actually held to —
    optional keys as bare types omitted from `required`, open records as
    `{type:'object', additionalProperties:true}`, exactly the pre-migration shape. A dynamic tool skips
    parameter validation, so `makeToolExecutionService` now decodes the arguments itself at the single
    boundary where they arrive, which also restores the `Ref`-from-URI coercion every ref-taking
    operation depends on (`ref.tryLoad is not a function` without it). `Tool.Strict` stays `false`
    because that contract is what strict mode forbids. Two call sites had to stop assuming
    user-defined tools: `makeToolExecutionService`'s `handlersFor` and
    `ai/src/resolvers/ChatCompletionsAdapter.ts`'s `toolsToRequest` (which would otherwise drop every
    operation-backed tool from an OpenAI-compatible request).
    Discarded after checking: `config.strictJsonSchema` is not an escape hatch — rc.108 spreads it
    into the request body and the API rejects it as an extra input.
- [x] **`agent-runtime`'s `recovers queued tool results after reload` no longer hangs.** Diagnosed:
      the timeout was NOT a fixture miss. The test waited via `waitForTaskToAppear()` for a second
      research task after reload, and that wait can never be satisfied on **either** path — on reload
      `agent-process.ts` (~L268) redelivers a queued result as a synthetic `<result pid=N>` **text**
      block instead of re-issuing the tool (main's design, `76dd26df`), and on the racier path the
      result is consumed before the shutdown so nothing is redelivered at all. The wait was copied
      from the sibling `restart during tool call`, where the tool _is_ re-issued because it was still
      pending. Replaced with an assertion that the tool did not run twice; the suite replays green
      against the committed fixtures, so no new fixture was needed.
- [ ] **Pin the agent redelivery path by construction, not by timing.** The path itself is now
      _covered_: `recovers queued tool results after reload` exercises the synthetic-redelivery branch
      (confirmed by the `[synthetic] <result pid=N>` block in the run, and
      `grep -rl 'result pid=' .store/conversations` now returns the first fixture that has ever
      recorded that shape), and the assertion reads the ASSISTANT's reply and requires `nasdaq` — a
      fact only the tool result carries, so it cannot pass on an abandoned turn the way the previous
      `toContain('cyberdyne')` did (the prompt itself says "Cyberdyne").
      What remains is determinism. Which path runs is still a race between `onChildEvent` persisting
      the `tool_result` and `processManager.shutdown()`; it landed on redelivery in 10 of 10 uncached
      replay runs and in every live run, but by timing rather than by construction. If a scheduling
      change flips it, the corpus holds no fixture for the other path, so it fails as a miss rather
      than degrading. Pinning it needs a seam in `agent-process.ts` that holds the turn loop while a
      result sits queued — `AlarmManager` already takes an injectable `setAlarm`/`now`
      (see `agent-process.test.ts`), so withholding the wake is the likely lever. Alternatives
      considered and rejected as too invasive for the migration PR: a test-only knob on
      `AgentProcessOptions`, and an alarm-suspension capability on `ProcessManager`/`ProcessHandle`
      (real control-plane surface, and those files already carry migration churn).
      **The logic itself no longer depends on the race.** `agentEventToPrompt` and
      `dropReportedToolResults` are extracted from `onAlarm` and pinned in
      `agent-service/redelivery.test.ts` (7 tests, no model call): the synthetic `<result pid=N>` /
      `<error pid=N>` encoding, the `disposition: 'synthetic'` marking, and the rule that only a
      REPORTED result at the HEAD of the queue is dropped — a result that was never reported must
      survive, or recovery loses the value. So a future timing flip costs the e2e run's coverage of
      that branch, not the guarantee.

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

## PR review follow-ups (dmaretskyi, #12521)

Raised on the PR and explicitly deferred there.

- [ ] **Drop `id` from serialized JSON schemas.** It is emitted today as a property and listed in
      `required` (visible throughout the v3 corpus fixture). Removing it is a wire-format change:
      it touches `json-schema-shape.test.ts`, the stored-document read path, and the LLM boundary,
      so it wants its own change with the decoder's tolerance settled first.
- [ ] **Adopt `SchemaRepresentation` for stored schemas.** Deliberately NOT part of the Effect 4
      migration — see the correction below — but de-risked, and the findings are worth keeping.
  - **It is not needed to migrate to v4.** ECHO normalizes v4's emitter defaults back to the v3
    shape (`stripUndefinedMember`, `inlineAllOf`), so the stored JSON Schema format is unchanged by
    the migration and **zero** stored data needs rewriting. The `0.1.0` → `0.2.0` migration is not
    independently necessary: it exists solely as the vehicle for this change. Adopting
    representations creates the only migration rather than consolidating two.
  - The standing reason to do it anyway is correctness, not v4: the JSON Schema write path
    **loses the `Ref` payload**, which representations preserve.
  - **Proven to round-trip losslessly** over the 18-type stored corpus (schema → representation →
    JSON → schema, plus idempotence on a second pass), including reference targets. That work was
    reverted from the migration branch; the corpus test that remains is the oracle for redoing it.
  - Two things that cost time and will again:
    - The `Ref` declaration needs a `representation: { id, payload }` annotation or serialization
      fails outright (`Missing key at ["references"][…]["representation"]`). The payload must be
      the **resolved** target URI + version, NOT the constructor arguments — a ref built from a
      `typename` and one built from the equivalent `echoUri` are the same reference and must
      persist identically, or the round-trip is not idempotent.
    - Revivers are explicit for **built-in checks too** — roughly 30 of them across string shape,
      identifier formats, numeric bounds and collections. None are installed implicitly; a missing
      one fails the load (`Missing reviver for effect/schema/isPattern`) rather than degrading.
  - Storage and the LLM wire format diverge under this change: D5 keeps `toJsonSchema` emitting
    v3-style JSON Schema for the model boundary regardless. Guard that internal persistence
    annotations never leak into the emitted document.
  - Scope beyond the meta-schema: ~20 `toJsonSchema` producer sites (operations, compute nodes,
    instructions, table projections), some read cross-repo by EDGE. Needs coordination.
- [ ] **Evaluate v4's JSON Schema importer against the hand-rolled decoder.** It exists:
      `SchemaRepresentation.fromJsonSchemaDocument(document, options): Schema.Top` (`@since 4.0.0`),
      "imports a JSON Schema Draft 2020-12 document as a runtime schema". Not a drop-in for
      `toEffectSchema`, for three reasons worth checking before committing to it:
  - ECHO's stored documents are draft-07 (`$schema: .../draft-07/schema#`), so they would route
    through `JsonSchema.fromSchemaDraft07` first — that path exists but is untested here.
  - Its own docs call import "best-effort", with built-in declarations and checks reconstructed
    via **importer-owned revivers** — the same explicit-reviver requirement the write path has.
  - It knows nothing of ECHO's `/schemas/echo/ref` or the v3-only `/schemas/any|unknown|{}`
    sentinels; those need custom revivers, and the sentinels exist only in already-stored data.
    The v3 corpus test is the oracle for any such swap — it pins exactly these cases.
- [ ] **`QueryResultEffect` → `Yieldable`.** Blocked upstream, not by us: `effect@4.0.0-beta.105`
      exports no `Yieldable` and no `asEffect`; the interface in `migration/yieldable.md` is not in
      this beta. `Effectable.Prototype` (`@since 4.0.0`) is the current sanctioned mechanism and is
      what v4's own `Config` uses. Revisit when `Yieldable` ships.
- [ ] **Support constructor defaults in `Obj.make` for echo types** — dmaretskyi, own PR.

## Open questions

- [ ] Ride the beta, or wait for `effect` GA? No GA after ~6 months and 105 betas.
- [ ] `effect/unstable/*` has no semver guarantee even post-GA — acceptable for `cli`, `rpc`, `sql`,
      `ai`, `reactivity`?
- [ ] Is `packages/common/effect-atom-solid` deletable in favour of `@effect/atom-solid`?
