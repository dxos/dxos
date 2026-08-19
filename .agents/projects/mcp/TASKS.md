# mcp — Tasks

Goal: task-planning skill working with Composer so DESIGN and TASKS are Composer documents,
over the loop Claude ⇔ MCP ⇔ EDGE ⇔ Composer.
Design: [agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md](../../../agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md)

The tool-surface work-stream moved to the edge repo's `mcp-operations` project
(`edge:.agents/projects/mcp-operations/{DESIGN,TASKS}.md`); its Phase 2b is the dxos-side work
below. Dxos-side decisions — the two-host contract, third-party CLI plugins, and the two reload
stages — are in [DESIGN.md](./DESIGN.md); the loop design stays in the superpowers spec above.

## Milestone 6 — `dx mcp serve`, the local twin of the MCP server (mcp-operations Phase 2b)

Kills the per-edit bridge toll (dxos build → publish → edge install → worker restart → MCP
reconnect) and gives plugin authors a surface with no edge at all. Fidelity contract
(mcp-operations DESIGN §0.5): deltas from the deployed server are host-layer only — anything that
changes what a model sees lives in the shared package or it is a bug.

- [x] **`@dxos/mcp-server`** — the projection extracted out of `mcp-space-service/src/mcp/`:
      annotated operations as tools, opted-in skills as prompts, `skillLoad`, name/collision
      rules, ref widening, and the wire response passes. Hosts supply a `Gateway` (reach the
      registry, invoke an operation, name the session's spaces) and a transport; nothing else
      about the surface is theirs. 32 unit tests, including a parity test that fails if the
      annotation id drifts from `Operation.McpToolAnnotation`.
- [x] **`dx mcp serve`** — stdio host over the CLI's own plugin registry. Verified live against a
      real MCP handshake: 22 tools (project/task/outline verbs + `skillLoad`, plus the ported
      static toolkits), `codeProject` as a prompt, `skillLoad` returning the skill body and the
      identical text via `prompts/get`, ref parameters narrowed to their object shape, safety hints
      on every tool, and the shared server instructions on `initialize`.
- [x] **Static toolkits ported to the CLI** (2026-08-14) — `whoami`/`listSpaces`, the object CRUD,
      and `listPlugins`/`listTypes`/`listOperations`. Serving the projection alone left a client
      without the tools an agent reaches for first. Copied, not shared — see the factoring item
      below. Object CRUD is advertised and argument-validated but **not verified end-to-end**; that
      needs a profile with a space.
- [x] plugin-projects + plugin-tasks added to the CLI plugin set (and to the default profile), so
      the annotated operations are in the registry the command projects.
- [x] **Edge consumes the package** (2026-08-14, edge#888) — `mcp-space-service` keeps OAuth,
      grants, bindings and the trace feed; its copy of the projection is gone (966 lines deleted,
      66 added) and `callOperation`'s trace-sink flush became the gateway's invoke. Verified
      against the pkg.pr.new build of `26cadff6`: worker builds, workerd suite **90 passed**
      (the ledger's "92" was stale — no test files changed). Acceptance: edge's 92-test suite stays green with the
      package as the sole source of shape.
- [ ] **Fidelity check in CI** — one test running the same registry fixture through both hosts
      (edge worker + `dx mcp serve`), asserting identical `tools/list`, `prompts/list` and
      `skillLoad`. The contract enforced, not documented.
- [ ] **Static tool descriptors shared** (do this first) — the two hosts' `Tool.make` blocks are
      byte-identical; only the handlers genuinely differ. Moving the descriptors into the package
      deletes every existing copy and makes an unannotated tool impossible, with no dependency on
      the operations work. The annotation drift this already caused is the argument: DESIGN §1.1.
- [ ] **Static toolkits → plugin operations** — then the handlers. `whoami`, `listSpaces`, the
      object CRUD and the discovery tools are hand-written twice (TODOs in
      `cli/src/commands/mcp/{space,object,discovery}-tools.ts` and edge's `src/mcp/*-tools.ts`).
      Contributed as annotated operations they would project through `@dxos/mcp-server` like the
      project and task verbs. The object tools are the easy half — both hosts already only wrap
      `database.*` operations, differing in the invoke seam alone.

  The object group goes to **plugin-space**, whose verbs mirror the ECHO API (`Database.add` /
  `Database.remove` → `addObject` / `removeObjects`); `database.objectCreate` / `objectDelete`
  retire into them. Two blockers, not one: a declared service the handler never resolves, and an
  input/output shape carrying live objects or UI coordinates. Phases (PR #12616):

  - [x] **Phase 0** — 15 spurious `Capability.Service` declarations dropped from `SpaceOperation`.
        Declared services resolve eagerly (`ServiceResolver.resolveAll(...).pipe(Effect.orDie)`), so
        a spurious one dies on a host that cannot supply it. `Join` keeps its declaration:
        `HaloServicesLayer` requires it.
  - [x] **Phase 1** — `Capabilities.getAtomValueOption` / `updateAtomValueOption`. A headless host
        _has_ a capability manager; what it lacks is the app's UI capabilities. `removeObjects` now
        reads the layout optionally (unlinks and deletes headlessly; plank-closing and the undo
        record stay in the app), and `migrate` no-ops its progress flag.
  - [x] **Phase 2a** — `SpaceObjectOperation` leaf module (compute/echo/keys only) with
        `getObject`, `updateObject`, `queryObjects`. Outputs are named-field objects so a projected
        tool's `structuredContent` is a JSON object.
  - [x] **Phase 2b** — each mutating verb grew a wire-shaped alternative _beside_ its live-entity
        input rather than replacing it, so no in-process call site changed: `addObject` takes
        `create` (a `{ '@type', ...props }` draft instantiated against the space's type registry) or
        `object`, and a `Ref(Collection)` target; `removeObjects` takes `refs` or `objects`. The
        database comes from `Effect.serviceOption(Database.Service)` — reading the ambient context
        without declaring it, because declared services resolve eagerly and the app's call sites
        invoke with no spaceId. `createObject` is deliberately absent: a detached object cannot
        survive between two stateless MCP calls.
  - [x] **Phase 3** — all five annotated; `serialize.test.ts` asserts they render as JSON Schema
        **and** carry the annotation (the risk was `addObject`/`removeObjects`, whose inputs name
        `Database`/`Collection`/`Entity` — they serialize). `cli/.../object-tools.ts` deleted and
        `serve.test.ts` now asserts the five arrive by projection over a real MCP session. Edge's
        copy follows on the next `@dxos/*` pin bump.
  - [ ] **Retire `database.objectCreate` / `objectDelete`** — blocked on layering, not effort:
        the Database skill lives in `assistant-toolkit` (core), which cannot depend on plugin-space.
        Harmless meanwhile — they are unannotated, so they never reach the MCP surface. Moving the
        skill to a plugin is the fix.
  - [ ] **Deferred** — `expandDepth` on the read verbs. Both toolkits advertise it and no operation
        accepts it, so sending it fails the call today; not advertising it is already an
        improvement. Implement with ref-walking when it earns its place.

- [ ] **assistant-toolkit → plugins** (accounted 2026-08-15; do not defer long). 15 skills, ~34
      operations. Classify by _domain_, not by service dependency — `memory` and `project` are both
      `Database.Service`-only yet squarely assistant-scoped, which is what makes the service axis
      misleading.
  - [x] `database` skill — **CRUD half done.** plugin-space owns the **Database** skill (`add`, `get`,
        `query`, `update`, `remove` over its own verbs, `@dxos/plugin-space/skills`); the toolkit's
        five duplicates (`objectCreate`, `objectDelete`, `objectUpdate`, `query`, `load`) are gone and
        its skill is renamed **Database schema** for the residue. Two capabilities moved rather than
        being dropped: `queryObjects` gained `in`, and `getObject` became `getObjects` (array in, one
        call) — both covered by `plugin-space/src/operations/object-verbs.test.ts`.
  - [ ] `database` skill — **schema/relation/tag half still in the toolkit.** Duplicate check done
        (2026-08-15); every pair is the same app-facing/agent-facing split `addObject` already
        resolved, so the moves are known:
    - [x] `RelationDelete` — **retired, not moved.** `RemoveObjects` already says "objects,
          relations, or persisted types" and takes `Entity.Unknown`/refs. Straight duplicate.
    - [x] `TagAdd` / `TagRemove` / `SchemaList` — **relocated** to plugin-space as `addTag`,
          `removeTag` and `queryTypes`, all three annotated and on the Database skill.
          Correction to the earlier note: `queryTypes` does **not** retire the hosts' `listTypes`.
          They answer different questions — `listTypes` reports the types the _host registry_
          carries (typename + version, no space, no `Database.Service`), `queryTypes` queries the
          _space_ and returns schemas. Hence the distinct name; both survive.
    - [x] `RelationCreate` → **merged into `AddRelation`**, which now takes a live schema or a
          `typename`, and live ends or references. The three in-process call sites are unchanged.
          Output stays `Schema.Any`: the ends type as `unknown` while the schema input is
          `Schema.Any` (the pre-existing relation-schema TODO owns that), so the tests assert
          through a database query instead.
    - [x] `SchemaAdd` → **merged into `AddType`**, which now takes a live `type` or a `jsonSchema`,
          and reads its database from the ambient context when none is passed. The service blocker
          is gone: `Capability.getAllAvailable` and `Plugin.activateIfAvailable` (new in
          app-framework) read the app's contributions where they exist and return nothing where they
          do not, so `AddType` declares no services at all. The `addType` test proves it — it runs
          in `AssistantTestLayer`, which binds neither manager.
    - [x] `contextAdd`/`contextRemove` stayed, as `ChatContextSkill` (`org.dxos.skill.chatContext`).
          **The identity follows the verbs**, not the package: plugin-space's Database skill takes
          `org.dxos.skill.database`, so a chat already bound to that key keeps object CRUD instead of
          silently losing it. Same as `org.dxos.skill.connectors` keeping its key into
          plugin-connector, and matching how plugin-owned skills are keyed generally
          (`org.dxos.skill.inbox`, `.markdown`, `.chess`) — the long
          `org.dxos.plugin.<name>.skill.<x>` form is the exception, not the rule. Note DXN names
          reject hyphens in the final segment, hence `chatContext`.
  - [x] **Model fixtures re-recorded.** The two `chat-context` tests were not just stale — the split
        left them with no lookup verb (the skill exposes only `contextAdd`/`contextRemove`), so the
        agent could not resolve a name to a URI; both prompts now supply the URI directly. The remove
        test also compared a space-relative context ref (`echo:///<id>`) against a space-qualified
        `Obj.getURI`, so its absence assertion held whether or not the tool ran — both tests now
        compare on the object id and the remove test pins its starting state. The 134 conversations
        under `..._skills_database_skill/` were deleted: the suite segment is the test file's path
        flattened, so moving the file to `skills/chat-context/` made them unreachable on top of being
        stale.
  - [x] `connectors` → **plugin-connector**. Done. Instructions-only skill (no operations), moved to
        the plugin that owns the connectors it tells the model to prompt for; ConnectorPlugin
        contributes it through `AppCapabilities.SkillDefinition` and re-exports `ConnectorsSkill`.
  - [x] `discord` / `linear` — **deleted, not relocated.** Each advertised a tool
        (`org.dxos.function.discord.fetchDiscordMessages`, `org.dxos.function.linear.syncIssues`)
        whose handler set was registered nowhere in either repo, so invoking it failed with
        `NoHandlerError`; the only tests were off (`describe.skip`, `skipIf(!DISCORD_TOKEN)`), and
        plugin-discord and plugin-linear already own connector-based sync with registered handlers.
        The skill-manager test used `DiscordSkill` as its not-agent-enablable fixture — `AutomationSkill`
        now plays that part.
  - [ ] `project` — **deprecated**, superseded by plugin-projects. Primitive predecessor (artifact
        filing against a chat-bound project). Remove once `projects.eval.ts` and
        `sender-ledger.eval.ts` move to the plugin's skill.
  - [ ] Stays in assistant-toolkit: `memory`, `agent`, `agent-wizard`, `delegation`, `planning`,
        `alarm`, `skill-manager`, `browser`, `automation`, `websearch`. What is left is the chat
        runtime's own skills — which is what the package name claims.
  - [ ] **Gate (softer than first recorded):** `DatabaseSkill` is consumed by four `packages/core/`
        harnesses (`assistant-e2e` harness + `local-ai.test.ts`, `assistant-evals/skills.ts`,
        `functions-testing`) via `Ref.make(DatabaseSkill.make())`; they still bind only the toolkit's
        skill, so they no longer assemble what production ships — plugin-space's Database skill has
        the CRUD verbs. `assistant-e2e` and `assistant-evals` already depend on plugins
        (`plugin-assistant`, `plugin-crm`, …), so adding `@dxos/plugin-space` is no new direction;
        only `functions-testing` has no plugin dependency today.
- [x] **Observability as a registered mapping, not a call.** Done, in the `UndoMapping` shape:
      `ObservabilityMapping` (operation, event name, properties derived from input/output) is
      contributed through `Capabilities.ObservabilityMapping`, and plugin-observability's
      `InvocationListener` consumes `invoker.invocations` and sends the event — the operation
      definitions are untouched, so EDGE substitutes its own listener over the same stream. The
      open question resolved itself: the listener is a _subscriber_, not an invoker change, so it
      sees exactly the paths the invoker already publishes (successful invocations, not the
      `_invokeCore` path undo replays on). The five space operations no longer import
      plugin-observability, and `SpacePlugin`'s `observability` option now gates the registration
      rather than one handler's send (`SpaceOperationConfig.observability` deleted). - [ ] Follow-up: plugin-review's seven handlers and the two registry containers still send
      directly. Same conversion, no new machinery.
- [x] **plugin-studio navigation regression** — closed. `getArtifactsPath` was removed with
      `addObject`'s navigation output, and unlike the type-section cases `findTypeSectionPath` could
      not replace it: studio's url binding ends in the studio segment, not a typename. plugin-studio
      now contributes its own `AppCapabilities.NavigationTargetResolver`, resolving an Artifact to
      its child path under the virtual Artifacts node at `Position.first` (the Studio section lists
      every Artifact in the space regardless of collection membership, so it outranks the generic
      collection/database answers). `paths.test.ts` pins the path composition.
- [ ] **Space visibility factored out** — which spaces a session may target is decided twice and
      differently: the CLI filters `client.spaces` through `AppSpace.isVisibleSpace`, while edge's
      `space-tools.ts` hard-codes its own `SETTINGS_SPACE_TAG` constant plus `withoutHaloSpace` /
      `withinSessionContext` against the grant's space ids. Same intent — never surface the HALO
      space or the settings space as a target — reached by two unrelated code paths, so a change to
      the rule (a new internal tag, say) silently applies to one host only. One predicate, shared;
      it belongs wherever the tag constants live rather than in either host.
- [ ] **Registry construction shared** — `dx mcp serve` merges the CLI's curated
      `operationHandlers`; operation-service assembles its own list plus base types. Factor one
      assembly so both hosts register the same operations, skills and types.
- [x] **Watch/reload** — `dx mcp serve --watch` (Milestone 7); an edit no longer needs a restart.

## Milestone 8 — skills as the atomic MCP unit (user-directed 2026-08-19, PR #12616)

Direction from the 2026-08-19 review: the skill definition is the unit of projection, not the
operation. A host provides skill definitions; each opted-in skill becomes a prompt, and the
operations its `tools` list names become the tools. The `skillLoad` pointer in a tool description
derives from membership (the SEP-2640 shape) instead of the hand-maintained `mcpTool({ skill })`
field, so a skill and its tools cannot drift — which also closes the audit's "`Skill.tools` unused
by the projection" gap by construction. `Operation.mcpTool` keeps only per-operation metadata
(tool-name override, safety); it no longer decides inclusion, and the never-consumed `aspect`
field goes.

- [x] **Compute** — `Skill.Definition` gains `operations` (the definitions behind the ToolIds, so a
      registry-less host can serialize them); `Operation.mcpTool` drops `skill` and `aspect`.
      **Correction (user, 2026-08-19, twice):** the first cut added `optionalServices` for the
      `Effect.serviceOption` reads; a second cut satisfied required declarations from the calling
      context. Both mechanisms are gone. `addObject`/`addRelation`/`addType` declare
      `Database.Service` **required**, resolution stays strict (`Database.Service` materializes
      only from `InvokeOptions.spaceId`, or the parent process's environment for nested invokes —
      pre-existing machinery), and **every spaceId-less call site now passes
      `{ spaceId: db.spaceId }` in options**: ~60 create-object entries across ~35 plugins plus the
      direct handler sites. `removeObjects` stays undeclared: its space comes from the input itself
      (live entities or space-qualified refs), so it carries no `spaceId` tool parameter either.
- [x] **Projection** — `Gateway.SkillRecord` gains `tools`; operations project iff named by an
      opted-in skill's tools list; pointer sentence auto-appended (multi-skill aware); annotation
      optional (defaults: name = key's final segment, no safety claims; a malformed annotation
      degrades to defaults rather than hiding the skill's tool). `spaceId` ambient parameter only
      for operations declaring `Database.Service`
      (`@dxos/echo/Database/Service` on the wire, drift-pinned in projection.test) — the
      parameter's presence tells the agent which calls are space-addressed. SEP-2640 comment on
      `SkillLoad` updated to the current draft.
- [x] **Plugins** — `CodeProjectSkill.operations` lists the eleven project/task/outline verbs
      (plugin-projects → plugin-tasks was already a real dependency; `skill-keys.ts` died with the
      `skill:` fields); `DatabaseSkill` sets `mcpPrompt: true`. **Found on the way:** plugin-space's
      `plugin.node.ts`/`plugin.workerd.ts` never added the `SkillDefinition` module, so the
      Database skill was invisible to every headless host — annotations had been masking it.
      Verified over a live stdio session: 27 tools, `database` + `codeProject` prompts, pointer and
      spaceId placement as designed; `serve.test` 6/6.
- [x] **`DxMcpService`** (`@dxos/mcp-server/DxMcpService`) — `make({ skills })` yields the
      projected surface requiring only `Operation.Service`; skill definitions carry their
      operations, serialized to the same wire records the registry-backed Gateway serves, so both
      front doors drive one projection. The Gateway survives — edge reaches its registry over an
      RPC binding and cannot hold live definitions. The package moved to per-namespace subpath
      exports so wire-only hosts (`/Gateway`, `/Server`) never bundle the operation runtime.
- [x] **`mcpTool` justified down to its real payload** (user review, 2026-08-19). An audit found
      27 of 28 `name:` overrides byte-identical to the key's final segment (deleted; the one real
      override is `projectCreate`, whose key segment is a too-generic `create`) and `safety` to be
      the annotation's only load-bearing field — which is not an MCP concept but an operation fact.
      It generalized to **`Operation.mutation('none' | 'write' | 'destructive')`**, a first-class
      operation annotation beside `idempotent`/`visible` (id `org.dxos.operation.mutation`,
      drift-pinned in projection.test). The MCP projection maps it to
      `readOnlyHint`/`destructiveHint` as before and now also maps `Operation.idempotent` to
      `idempotentHint`. `mcpTool` keeps only `name`/`description` overrides (4 sites).
- [x] **One handler set per plugin, on the subpath convention** (user directive 2026-08-19).
      plugin-space carried two sets because `registry.add(handlers.map(Operation.serialize))`
      (cli `runtime.ts`, `assistant-test-layer.ts`) threw on any non-JSON-serializable input schema
      (`ImportSpace`'s `Uint8Array`), forcing a curated "serializable" subset beside the full set.
      Fixed at the root: **`Operation.serializable(operations)`** in compute serializes tolerantly
      (drop-with-warning), all four registration sites use it (cli runtime, assistant test layer,
      CLI mcp gateway — whose local twin died — and `DxMcpService`). plugin-space now exports one
      merged set as `@dxos/plugin-space/SpaceOperationHandlerSet` (the plugin-tasks pattern:
      `src/operations/<X>OperationHandlerSet.ts`, barrel `export * as`, package subpath); the
      public `./operations` subpath is gone. Six consumers repointed; single-element destructures
      (`const [x] = xs`) replaced with index access per user note.
- [x] **`NavigationResolver.forType`** (user question 2026-08-19: "does every plugin with a custom
      section need a resolver now?"). Findings: the resolver mechanism is a week old (fa36e263,
      2026-08-12) — nothing was "always true"; sections built with
      `TypeSection.createTypeSectionExtension` need NO resolver (plugin-space's generic
      `findTypeSectionPath` reads their url binding); only custom-shaped sections do, and of ~6 such
      plugins only inbox and studio had one. Added the helper to `@dxos/app-toolkit`
      (`NavigationResolver.forType`, 4 unit tests), converted studio + inbox, and filled the
      evident gaps: blogger (Publication), code (CodeProject), commerce (Provider, with a new
      `paths.ts` sharing the section segment with the graph builder). Judgment calls left open:
      crm (its section holds type-collection nodes, no per-object nodes — a resolver would target
      the type node, a different contract) and blogger's Post (lives under its Publication — needs
      a back-reference walk, not the type-at-section shape).
- [ ] **Shared operation→tool projection** (assistant ⇄ mcp) — deferred with a plan, not dropped.
      What blocks a naive extraction: the two surfaces are deliberately different models of the
      same operation. The assistant presents refs as LLM-friendly URI _strings_ (`RefFromLLM`,
      which normalizes to space-local form and is entangled with `ArtifactURI`), names tools by
      slugified `meta.name` (`create-task`), and massages JSON Schema for provider strict mode;
      MCP presents refs as envelope objects, names tools by annotation/key segment (`taskCreate`),
      and applies its own response passes. Converging any of these is a **model-facing change**:
      chat-side it invalidates every model fixture (`parameters.tools` is in the match key),
      MCP-side it changes client-visible schemas. Do it as its own PR: (1) extract the shared
      schema-massaging core (null-branch dropping, openness, empty-params) into `@dxos/compute`
      behavior-preserving; (2) audit whether MCP's emitted schemas have the optional-`anyOf:[T,
null]` defect the assistant already fixed — if so the shared core becomes a response pass;
      (3) decide whether tool _names_ should converge (fixture regeneration budget required).
- [ ] **Edge follow-through** — on the next `@dxos/*` pin bump the worker picks the reshape up via
      the package; its `SkillRecord` marshalling in operation-service gains `tools`.

Follow-ups from the 2026-08-19 audit (none block PR #12616):

- [ ] **`skillLoad` listing mode** (audit G2) — the model discovers a skill only via a tool
      pointer or by failing a `skillLoad` whose error lists names; a pure-workflow skill referenced
      by no projected tool is invisible. Make `skill` optional: omitted → return the listing
      (`name`, `description`, `key` per skill). One tool, two modes, pre-aligned with SEP-2640's
      `skills/list`/`skills/get` split. Mention the listing mode in `SERVER_INSTRUCTIONS` in one
      clause — stay under the 2KB truncation.
- [ ] **SEP-2640 tracking** (audit G3) — the draft has drifted from the shape the `SkillLoad`
      comment cited: skills are now `skill://` _resources_ with `skills/list` / `skills/get`
      methods, markdown + YAML frontmatter, optional resource manifests (SHA-256 digests) and
      dependency declarations; the single load tool is the _client's_ affordance. Additive path
      when it settles: declare the extension capability (Effect's `McpServer` forwards
      `serverInfo.extensions`), serve `skills/list`/`skills/get` and `skill://<name>/SKILL.md` off
      the existing `projectSkills` output (`SkillRecord` maps 1:1 onto the frontmatter), keep
      `skillLoad` as the polyfill indefinitely. Do not build the manifest/asset part until the PR
      settles. The stale Server.ts comment is fixed in the Milestone 8 projection work.
- [ ] **`code-project-skill.md` fs fallback** (audit G5) — the space-binding gate reads
      `.agents/projects/space.yml`, silently inapplicable on an fs-less client (claude.ai
      connector). One line: no filesystem → ask the user for the space.
- [ ] **CLAUDE.md fallback snippet** (audit) — the "point at the MCP server, no skills required"
      thesis holds for Claude Code today (`SERVER_INSTRUCTIONS` survives ToolSearch deferral; the
      `skillPointer` rides in each governed tool's description). Do **not** add a meta-skill or
      plugin shim; reserve a one-paragraph CLAUDE.md snippet as the fallback for harnesses that
      drop MCP `instructions`.

## Milestone 7 — third-party plugins and reload (design: [DESIGN.md](./DESIGN.md) §2-3)

A shipped `dx` must load plugins it was not compiled with, and those plugins' operations and
skills must reach the MCP surface. The MCP half is already done: the gateway reads
`Capabilities.OperationHandler` and `AppCapabilities.SkillDefinition`, so an enabled plugin
projects with no further work. The browser has the rest of the system (manifest, URL loader,
shared-scope import map, registry publish); this milestone is its node/bun half.

**Decided 2026-08-15 (user):** plugin management reaches **Composer parity** — a real default
enabled set, enable/disable, install from registry or URL, and a dev-plugin loop. The CLI does not
get its own lifecycle model. DESIGN §2.3.

### Plugin management (Composer parity)

Today `enable|disable|list` exist (contributed by the `system`-tagged `plugin-registry`, so always
reachable) and persist to `plugins/<profile>.yml` — but **no compiled-in plugin can occupy the
installed-but-disabled state**: of the 11 in `commands/plugin-defs.ts`, 7 are `system`-tagged core
(client, registry, space, connector, routine, observability, process-manager) and the other 4 are
`getDefaults()` (chess, sample, inbox, markdown). Every built-in is always on, which is why it
reads as though disabling does not exist. DESIGN §2.3.

- [x] **CLI-owned core set** (2026-08-15, PR #12606) — `ManagerOptions.core` added to
      app-framework, defaulting to the old `system`-tag derivation and dropping ids that name no
      registered plugin; threaded through `createCliApp`. `dx` now pins only client, registry,
      space and process-manager, so observability, connector and routine became disableable. 3 unit
      tests.
- [x] **Real default set** (2026-08-15, PR #12606) — the default set became an editorial choice:
      chess and sample are installed but off, so a fresh `dx --help` lists work verbs rather than a
      chess game. A `DX_LABS` env gate was tried and dropped (user, 2026-08-17) — the CLI does not
      need a labs channel; `dx plugin enable` is the way to turn a demo on.
- [x] **Persistence fix found on the way** (2026-08-15, PR #12606) — `loadEnabledPlugins` returned
      `[]` both for "no file" and "empty list", and `bin.ts` read `length > 0 ? saved : defaults`,
      so disabling every optional plugin silently restored the defaults on the next command. It now
      returns `undefined` for unconfigured; core ids are no longer persisted, since they are host
      policy rather than a user choice. Regression test included.

### Plugin loading

- [x] **Shared scope at startup** (2026-08-17, PR #12606) — `Bun.plugin`'s `build.module` over
      `DEFAULT_PACKAGES` and their enumerated subpaths, read from the new
      `@dxos/app-framework/SharedPackages` export so the CLI and the Vite plugin share one list.
      **A URL-installed plugin now loads**, which it did not before: bun auto-installs an
      unresolvable bare specifier from its own cache, and `build.module` takes precedence over
      that. An `onResolve` filter was tried first and measured to receive **zero** invocations —
      bun's runtime loader never consults it. Details and numbers in DESIGN §2.1.
- [x] **`dx plugin add` / `remove`** (2026-08-15, PR #12606) — `add <url>` fetches the manifest and
      snapshots the assets under `plugins/<id>/` via a staging directory (a half-downloaded install
      the loader would later import is worse than none); `add --dev <path>` reads a directory in
      place, falling back to its `dx.config.ts` when there is no built manifest. Enables by default,
      `--no-enable` stops at install, prints the resolved NSID, and refuses an id a builtin already
      claims unless `--dev`. `remove` deletes a copy or forgets a link by record kind and refuses a
      compiled-in plugin, pointing at `disable`. The two unbuilt cells (snapshot-from-path,
      live-from-URL) are refused with a message rather than half-implemented. 10 subprocess tests
      against a fixture plugin, including a real loopback manifest fetch + asset download.
- [x] **Register without importing** (2026-08-15, PR #12606) — the record caches the plugin's
      `Config2.Plugin` meta at install time, and startup builds a `Plugin.lazy` stub from it, so a
      `dx` invocation evaluates a plugin's module only once something enables it. Deliberately
      unlike the browser, where `UrlLoader.preload` imports every persisted remote entry at boot.
- [x] **Installed-remote persistence, one file** (2026-08-15, PR #12606) — `plugins/<profile>.yml`
      now holds `{ plugins: [{ id, enabled, source, meta }] }`, decoded as a union that still
      accepts the legacy bare `string[]` (without it, a decode failure falls through to the defaults
      and silently discards the user's choices). `source` is `copy` or `link` — copy versus
      reference is the distinction that decides what `remove` does.
- [x] **Never crash on a broken install** (2026-08-15, PR #12606) — the manager resolves lazy
      plugins inside its initialization chain, so a failed import became a `PluginInitializationError`
      that killed _every_ `dx` command, including the `plugin list` and `plugin remove` needed to
      recover. A failed import now degrades to a plugin contributing nothing, and `plugin list`
      reports it as `failed` with the underlying message. Regression test moves a linked checkout
      out from under its record.
- [x] **`plugin list` shows both axes** (2026-08-15, PR #12606) — installed / enabled / core plus
      any load-or-activation failure, in text and `--json`, replacing the collapsed status string;
      `--enabled` filters to the active set. `enable`/`disable` also became idempotent and now fail
      with typed, actionable errors instead of bare invariants. 11 subprocess tests over `runDx`.
- [ ] **`plugin remove`** — one verb for both install kinds: deletes the copy for a URL/registry
      install, forgets the reference for a `--dev` one, by the record's kind. Fails on a
      compiled-in plugin pointing at `disable`, mirroring `disable.ts`'s existing core check.
- [ ] **Decide isolation** (DESIGN §2.6) — third-party code runs in-process with the user's HALO
      keys, and MCP lets an external agent invoke it. Decide before third-party plugins ship:
      trusted-publisher-and-explicit-enable, or a worker boundary (which would also solve reload).
      The install/enable boundary above makes the cheap end a real consent step, but bounds
      nothing after enable.
      **Same question for third-party instruction text** (audit G4): `skillLoad` returns text the
      server instructions tell the model to follow, and `Skill` is an ECHO type a collaborator
      could edit in a space. Today projection is registry-only (`Gateway.listSkills` → registry),
      which is what makes it safe — but nothing states or tests that invariant. State it in
      mcp-server's README/DESIGN ("only registry-resolved skills project; database-resolved skills
      never do") and pin it with a test. Decide before user-authored skills exist.

### Reload, stage 1 — our own dev loop

- [x] **`dx mcp serve --watch`** — DONE, both builds. A supervisor holds the client's stdio and
      replays the MCP handshake into each reloaded child, so an edit is invisible to the client — no
      reconnect, and `tools/list_changed` / `prompts/list_changed` follow every reload. The planned
      "session dies with the process, client reconnects per edit" is not what happens: `bun --watch`
      reloads in place (same pid, same pipes, wiped realm), so the connection survives and only the
      session state is lost. The child also runs with `--conditions=source`, without which the
      watcher tracked `dist` and a plugin source edit reloaded nothing until a rebuild. Cost is a
      full server start per reload. Details in [DESIGN.md](./DESIGN.md) §3.
- [x] **`--watch` in the released binary** — DONE, and the reason the flag matters to plugin
      authors, who have `dx` rather than a checkout. A binary takes `--watch` as ordinary argv, so
      the supervisor re-runs it via `process.execPath` and arms recursive `fs.watch` over the
      directories the child reports: its `add --dev` (`link`) installs, the only on-disk code a
      shipped `dx` can see change. `copy` installs are skipped. Verified against a real compiled
      binary: `plugin add --dev` the fixture plugin, `mcp serve --watch`, edit the plugin, and the
      session keeps its 22 tools across the restart with no reconnect.

### Reload, stage 2 — external plugin authors

- [ ] **`dx plugin add --dev <path|url>`** — the dev loop is a flag on `add`, not a `link` verb
      (decided 2026-08-15, DESIGN §2.5): the locator dispatches itself, and the one bit that
      actually varies is copy-vs-reference. `--dev` sets `LoadedPlugin.dev`, which the manager
      already keys shadow-on-id-collision off (`PluginCatalog.#devPlugins` stashes the displaced
      plugin with its `wasEnabled` and restores it on remove), so
      `add --dev ./packages/plugins/plugin-markdown` tests the working copy rather than the
      compiled-in one. A path needs no manifest — every in-repo plugin's meta already comes from
      its `dx.config.ts`, the same `Config2.Plugin` shape a published manifest carries. Persist the
      reference per profile; one `remove` deletes a copy or forgets a reference by record kind.
- [ ] **Measure: can a compiled `dx` binary import on-disk TypeScript at runtime?** §2.1 measured
      ESM import from a compiled binary; TS transpilation inside a standalone executable is a
      separate question and it decides whether `add --dev <path>` needs a build step at all.
      Measure before designing around either answer.
- [ ] **Watch `plugins/<profile>.yml`; supervisor default on** (audit G1-A, ship first) — the
      running server never notices a `dx plugin enable|disable|add|remove` from another terminal:
      `Server.layer` reads the registry once and the `--watch` supervisor watches dev-install
      source dirs only. Add the launched profile's `plugins/<profile>.yml` to the supervisor's
      watch set and make the supervisor the default for `serve` (keep an opt-out). A plugin-set
      change → settle-debounced child restart → handshake replay → the client sees the new surface
      on the next `tools/list`. Reproduces the startup activation path exactly, so no
      hot-activation delta; in-flight requests get the existing `-32603`, acceptable for a
      human-driven change. ~20 lines.
- [ ] **Watch a dev install** — re-import on change with a cache-busting query, rebuild the
      projected layer, emit `tools/list_changed` / `prompts/list_changed` (already emitted at
      startup, already acted on by clients). Same machinery as `add --dev`, driven by a watcher.
- [ ] **Upstream: tool/prompt removal in `McpServer`** — it exposes `addTool`/`addPrompt` only, so
      a changed surface cannot replace the old one without rebuilding the server layer under the
      live transport. **Gate for in-process re-projection** (audit G1-B): the registry is
      append-only (`tools.push` + `toolMap.set`), so re-adding a name _duplicates_ the
      `tools/list` entry — worse than a no-op. Contribute `removeTool`/`replaceTool` upstream in
      the `unstable` module. In-process re-projection stays closed until this and the type
      re-registration below land; restart-on-change (above) covers plugin-set changes meanwhile.
- [ ] **Idempotent (or per-load scoped) type registration** — re-importing a plugin that registers
      ECHO types throws "Schema version already registered". Second half of the G1-B gate.
- [ ] **Edge open question (audit G1)** — is the worker's projection layer built per
      request/isolate or per worker lifetime? Per-request means recompute-on-`tools/list` is
      already live and G1 does not apply there; confirm in edge `mcp-operations`.

## Milestone 1 — local round-trip (current)

- [x] Leg 1: composer dev server syncing with local edge (ws 101, agents/create 200, live queue-replicator traffic)
- [x] Pull edge to origin/main; rebuilt stale dists; .env via op inject (CLOUDFLARE_API_TOKEN needed for FUNCTIONS_DISPATCHER remote proxy); wiped .wrangler + D1 migrations (UserAgent.ownerIdentityDid)
- [x] Identity: reused Composer profile (key from edge auth log; agent registered via composer reload); space BAF4N7HEHDPFFQ7Q377TT6CG4ASGP5IR6
- [x] MCP leg: all service bindings local [connected]
- [x] OAuth+MCP via mcp-smoke.mjs: register/PKCE/token → initialize → tools/list → whoami (composer identity)
- [x] createDocument+updateDocument → doc 01KYXPCFW1G3XX5J76PPGJYGHP live in Composer UI (verified visually)
- [x] MCP round-trip into the USER's identity/space (identity key from edge log; --halo-space bypass for un-agented identity) — doc visible in user's Composer
- [ ] Maintain TESTING.md (OAuth-stub identity-key path vs dx mcp connect device-invitation path) — created 2026-08-01, keep current as blockers clear
- [x] Reverse: Composer edit → readDocument ("WOW this worked!" typed in user's Composer, read back via MCP)
- [x] cloudflared tunnel :8791 — OAuth+whoami round-trip PASSED via https://degree-italic-italia-saskatchewan.trycloudflare.com (morning steps in TESTING.md)
- [x] Runbook = TESTING.md (+ morning steps section)

## Milestone 3 — overnight 2026-08-01 (user-directed)

- [~] E2E smoke script #1 (device-invitation path): scripts/e2e-invitation-smoke.mjs — legs 1-2 PASS. Leg 3 "Connecting…" hang FULLY DIAGNOSED + FIXED 2026-08-01, two stacked causes:
  1. FIXED (MERGED in #12428): `dx profile create` templates omit `runtime.client.edgeFeatures` → client silently falls back to MemorySignalManager (service-host.ts:444) → invitation never signaled. With `signaling: true` both peers meet in the edge swarm and exchange offer/answer (verified live).
  2. FIXED in this PR (#12432): the "bun p2p segfault" was NOT a bun bug — node-datachannel@0.30.0's darwin-arm64 binary crashes under BOTH bun 1.3.2 AND node 24 (the earlier "guard is correct" verdict was wrong: a fresh 0.32.3 install passes the loopback under both runtimes). Fix = catalog bump 0.30.0 → ^0.32.3 + remove the `isBun()` MemoryTransportFactory guard (local-client-services.ts). LIVE-VERIFIED: bun-hosted `halo share` → browser join now passes "Connecting…", shows the verification-emoji + auth-code step, and completes the dialog. Loopback repro (runs from anywhere via createRequire): .agents/projects/mcp/scripts/bun-rtc-loopback.mjs
  - Remaining (PARKED 2026-08-01, user redirected to plugin-tasks MCP work): ADMISSION fails after the transport fix — guest passes "Connecting…", shows verification emoji + auth-code entry, dialog closes, but the host never reaches SUCCESS and `dx device list` stays at 2 devices; guest falls back to a fresh auto-created identity (red error ring on avatar). Reproduced twice. Next diagnostic: LOG_FILTER=debug on the host through the auth-code window (named filters like `invitations-handler:debug` match nothing), plus guest-side shared-worker logs. Suspect the delegated/persistent admission path (share.ts forces persistent+delegated; the identity's EDGE Agent device is OFFLINE)
- [x] USER DIRECTIVE (overnight 2026-08-02): **MCP task verbs WORK — Path A (OAuth) fully verified end-to-end.** `e2e-task-smoke.mjs` drives createObject(TaskSet) → taskCreate ×2 (root + sub-task) → taskUpdate → taskAssign → taskComplete → taskList against the user's space; task sets attached to the root collection (navtree-visible), states/assignee verified via a second MCP session. Edge branch `mcp-task-tools` (commit fce14b9d) = task-tools.ts (5 verbs) + server-layer wiring + registry (TasksOperationHandlerSet + Task/TaskSet/Outline types); 52/52 workerd tests
  - THREE upstream defects found and FIXED (dxos branch, commits d5ec313260 + 1d3c3044f5): (1) `GeneratorAnnotation` object form (`{generator,args}`, used by `Task`) was rejected by the json-schema contract → `Operation.serialize` threw → EVERY space-scoped invocation on a registry containing task ops failed (not just listing: entrypoint.ts:188 builds records on the invoke path too); (2) plugin-tasks had no **workerd entry** (`#plugin` condition) so activating it dragged React `.pcss` into the worker bundle — added `TasksPlugin.workerd.ts` mirroring plugin-markdown; (3) the task verbs were **not remotely invocable**: inputs took live ECHO objects (a ref envelope can't decode into one) and outputs returned live proxies (arrive as `{}` — the RPC layer returns handler output raw). Inputs are now `Ref.Ref(...)`, outputs `Entity.toJSON` snapshots (matches `database.objectCreate`); regression test added (`operations/serialize.test.ts`)
  - DEV-ONLY local wiring (NOT committed to edge): plugin-tasks + react-ui-task are unpublished, so both are packed locally into `~/Code/dxos/edge/temp-tarballs` with deps rewritten to pkg.pr.new, plus a pnpm override pinning `@dxos/echo` to a local build carrying fix (1). Flip the operation-service dep back to `catalog:dxos` + add the catalog entry once they publish
- [ ] Path B (device invitation) STILL BLOCKED — but one layer deeper than before: with the transport fix live the guest now reaches auth (verification emoji + code entry) and the host reaches `READY_FOR_AUTHENTICATION` + "introduced host invitation", then the submitted code never arrives (no further host log; `dx device list` stays at 2; the guest silently falls back to creating its own identity). Reproduced 3×. Next: instrument the guest side (shared-worker logs) around auth-code submission, and check whether the swarm connection survives past introduction
- [x] E2E smoke script #2 (OAuth-stub path): PASSING, fully self-contained — scripts/e2e-oauth-smoke.mjs bootstraps a fresh browser identity (playwright), harvests key+space from edge-dev.log (new-spaces-only filter; busiest-space alone grabs the user's), OAuth+MCP creates text+document, attaches to root collection, asserts title visible in the same browser context (Collections node must be expanded first)
- [ ] FINDING: raw createObject makes ORPHANS — not attached to the space root collection, so invisible in the navtree (old createDocument did CollectionModel.add). Script works around via updateObject on the collection objects[] (racy full-array replace). API fix candidates: attach option on createObject, or curated task/document verbs (task-plugin spec)
- [ ] Design: claude skill ⇄ Composer space sync — TASKS document per project; registry.yml optionally carries the ECHO DXN (spaceid/objectid) of the TASKS doc
- [ ] Design/track: dedicated task-list plugin — reconcile plugin-outliner vs plugin-projects (different notion of project); consider task/project-specific MCP verbs vs the generic object verbs
- [~] USER DIRECTIVE 2026-08-01: prepare for `TaskOperation` from `claude/competent-curie-20057f` — REVIEWED (spec updated with the resolution): plugin-tasks subsumes plugin-outliner; TaskSet (parent-edge containment) + Task@0.2.0 (Actor assignee) + Outline/Journal in @dxos/types; verbs `taskCreate/taskUpdate/taskComplete/taskAssign` + `createOutline/convertToTask/quickEntry` (+ ProjectOperation). Edge side (mine, MILESTONE-5 §7.3): after that branch lands + uniform pin bump — register @dxos/types Outline/TaskSet/Task@0.2.0 in operation-service baseTypes, register TasksPlugin handlers (worker-safety: create/update/complete/assign audited CLEAN — effect/compute/echo/types only; `quick-entry` imports app-toolkit AppSpace + plugin-client — needs a bundle check before full-plugin registration, else schema-only + explicit handler set), then project the verbs as MCP tools (or generically via the planned `McpToolAnnotation`). Identity-through-the-call is the edge prerequisite for assignee-bearing writes
- [ ] OBSOLETED by the above once competent-curie lands: edge branch `operation-service-outliner` (schema-only Outline via `@dxos/plugin-outliner/types` + interim pin) — do NOT open that PR; Outline will import from @dxos/types instead. The `./types` export on plugin-outliner (rides #12428) is harmless
- [ ] Land #12423 first (auto-merge armed), keep working in this worktree

## Milestone 4 — project + task verbs over MCP (2026-08-03)

- [x] Edge MCP **project tools**: `projectCreate` / `projectGet` / `projectList` (mcp-space-service/src/mcp/project-tools.ts), projecting `org.dxos.plugin.projects.operation.create` + the generic database ops; wired into server-layer. 57/57 workerd tests (5 new)
- [x] Edge worker can now REGISTER Composer plugin handler sets. Four upstream gaps fixed to get there:
  1. dxos plugin-projects had no **workerd plugin entry** — added `ProjectsPlugin.workerd.ts` (+ `#plugin` workerd condition, vite entry, `ProjectOperationHandlerSet` export, `@dxos/types` dep); plugin-space's existing workerd entry imported the `#capabilities` barrel (pulls React) → now imports the capability module directly, and `operations/definitions.ts` imports `SpaceForm` from its leaf module instead of the `../types` barrel (that barrel re-exports `capabilities.ts` → react-ui)
  2. edge registry was **all-or-nothing on serialization**: `space.importSpace`/`share`/`snapshot` carry `Uint8Array`/`Blob`/`CancellableInvitation` payloads with no `jsonSchema` annotation, so `Operation.serialize` threw and killed EVERY operation. `serializableHandlers()` now drops them with a warning (applied at all three call sites: registry records, listOperations, invoke path)
  3. `projects.create` declares `Capability.Service` — the worker never provided it ('Service not found: @dxos/app-framework/CapabilityManager'). The registry now exposes `capabilities` and the entrypoint provides it per invocation
  4. nested `Operation.invoke` (create-project → `SpaceOperation.AddObject`) always dispatched REMOTELY and failed the `has no deployedId` invariant. `withLocalOperations` now resolves worker-registered handlers **in-process** (also required for argument identity: these inputs carry live ECHO objects and the db handle), falling back to the runtime service otherwise
- [x] dxos: `scaffoldProject` now creates an owned **TaskSet** ('Tasks') alongside instructions + artifacts, so a project comes with its task ledger (templates.test.ts extended)
- [x] e2e rewritten as `scripts/e2e-project-task-smoke.mjs`: projectCreate → taskCreate ×2 (root + sub-task) → taskUpdate → taskAssign → taskComplete → taskList → projectList/projectGet
- [ ] **BLOCKER (live stack, not code): `database.objectCreate` HANGS in the worker** — BISECTED 2026-08-03: NOT caused by the new registrations (removing ProjectOperationHandlerSet + SpaceOperationHandlerSet still hangs) and NOT the missing-live-peer theory (holding a Composer tab open for the space hangs identically). The write itself lands (`begin change`/`end change` on the ObjectCore are logged) and the request then never settles, so the stall is after the mutation — in the flush/replication ack. Remaining suspects in order: the @dxos pin bump f8637f1df3 → f10b1ce757 (yesterday's working runs were on the older pin) and the grown local `.wrangler` state. Next: reinstall at the old pin with the same identity to confirm, then diff the db-service write path across the two pins. Repro: any `createObject` against a space created today ("Workers runtime canceled this request because it detected that your Worker's code had hung"). Reproduced with a bare createObject (no attach), so it is upstream of the project work — it also blocks `CollectionModel.add` (root-collection filing) and therefore `projects.create` via AddObject. Task verbs consequently fail with 'Invalid argument `ids`' (they receive `echo:///undefined` from the failed create). NOT yet bisected: candidates are the @dxos pin bump f8637f1df3 → f10b1ce757, the freshly bootstrapped identity/space (queries return, writes hang), or the newly registered space handler set. Next: bisect by reverting the pin with the same identity, and check the db-service side of the hung write

## Milestone 5 — passkey auth + space management (user-directed 2026-08-03)

- [x] #12443 MERGED 2026-08-03 05:06Z (squash 71aa2a68): plugin-projects workerd entry + `ProjectOperationHandlerSet` export, task set in `scaffoldProject`, plugin-space worker-safe imports. Unblocks edge#789 once plugin-projects publishes

Spec: `edge:packages/services/mcp-space-service/DESIGN.md` §4.2–4.6 (audit, hub, passkey design,
space session, open questions) and §9 (milestones M6–M9).

- [x] Hub identity/access-control audit — KEY FINDING: there is **no server-side passkey
      verification in hub-service today** (EDGE does have it — see the correction below). The hub's `Identity`/`Passkey` tables are annotated vestigial
      ("recovery passkeys now live as HALO credentials on the client"); `@simplewebauthn/server`
      is a dependency nothing calls. Real passkeys are created client-side by
      `plugin-client/src/operations/create-passkey.ts` with `rp.id = location.hostname` — i.e.
      bound to Composer's serving origin — and are HALO _recovery_ credentials, not account
      credentials. Hub access control is admin-key routes plus verifiable-presentation auth
      (`hub-protocol/src/middleware.ts`, with `allowEphemeralIdentity` for invitation bootstrap)
- [x] DESIGN.md extended: §4.1 (Composer signed-challenge) marked SUPERSEDED — booting Composer
      to approve a connection is too slow; identity moves to a hub-hosted server-side endpoint
- [x] ANSWERED by Josiah on edge#789 (2026-08-03) — two of the earlier decisions are SUPERSEDED:
      (1) NO new storage: account-grade credentials are HALO credentials held by the **agents
      service**; do not extend `Account`, revive `Passkey`, or touch the hub schema. Auth composes
      `IdentityRecovery` (agents/prisma/schema.prisma:27) + `verifyWebauthnSignature`
      (sdk/edge-crypto/src/webauthn.ts:24) + hub `lookupAccount`; `@simplewebauthn/server` comes
      OUT of hub-service. (2) RP ID stays **composer.space** via Related Origin Requests —
      `composer.space/.well-known/webauthn` (application/json) lists `https://auth.dxos.network`, so
      existing passkeys work with NO re-registration. (3) My audit was WRONG that no server-side
      passkey verification exists: `db-service/src/worker/api-handler/recovery.ts:199` does it
      today (in EDGE, not the hub). (4) Passkeys were never being deprecated; the two `TODO`s mean
      "delete these two models" — `Passkey` came from an old demo app and never shipped
- [ ] M6 passkey auth from Claude (reshaped): harden `verifyWebauthnSignature` (it checks
      challenge + signature but NOT `rpIdHash`, `clientDataJSON.origin`, UV flag or signature
      counter — load-bearing once a second origin asserts); add registration with per-credential
      labels + a revocation surface (`createRecoveryCredential` has neither); serve the
      well-known file; MCP `/authorize` delegation + `/authorize/callback`; `DX_AUTH_BASE_URL`.
      FIRST TASK = the dev-origin problem: local credentials are scoped to `localhost` by
      `rp: { id: location.hostname }` (plugin-client/src/operations/create-passkey.ts:49), so the
      well-known file on composer.space cannot reach them — more than a config change.
      E2E via CDP virtual authenticator **plus one manual Touch ID pass** before M6 closes
- [ ] M7 identity through `invokeOperation` (prerequisite for trusting assignee-bearing verbs)
- [ ] M8 space management: sticky session (KV `session:<grantId>:currentSpace`) then CRUD; needs
      the `space.create`-in-workerd spike first
- [ ] M9 Claude connector-directory listing (self-serve custom-connector URL is the interim path)
- [x] ASK JOSIAH — ANSWERED (see above). Note: RORs support is not universal (clients need only
      5 unique eTLD+1 labels; we are far from the limit) — check the device-support matrix and
      keep a fallback before committing the UX
- [ ] BLOCKER #12446 (dmaretskyi): `database.objectCreate` hangs after the write lands; blocks M8
      live acceptance, not M6

## Milestone 2 — task-planning ⇄ Composer documents (next)

- [x] MCP object CRUD + discovery (edge PR #785 MERGED 2026-08-01 — incl. integration-suite port preserving #758 guards + uuid@14 vitest fix): createObject/getObject/updateObject/deleteObject/queryObjects + listPlugins/listTypes/listOperations; Task+ExternalProject registered; live-verified full Task/ExternalProject lifecycle in user's space
- [x] markdown.update widened to any text-bearing document (dxos, rides #12423); outline edits via MCP activate on next edge @dxos pin bump ≥ dd552dfc74
- [x] deviceInvitationCode race fix MERGED into #12423 (claude/funny-chaplygin-89274c; onboarding is single param owner + reset-and-join dialog); note: primary-checkout composer serve still runs main without the fix
- [ ] Shared composer space to track projects and tasks (tracked 2026-08-01)
- [ ] ExternalProject rename (tracked 2026-08-01)

- [ ] Prototype: task-planning skill reads/writes DESIGN.md/TASKS.md as Composer documents via MCP
- [x] Outline text edits via MCP: RESOLVED in source (markdown.update widened, rides #12423; edge README claim fixed in #785). Runtime condition only: the running mcp/operation-service stack edits outlines once its @dxos pin is ≥ dd552dfc74 — until then `updateObject.edits` on an outline fails at runtime; `properties` CRUD unaffected
- [ ] Edge @dxos pin bump ≥ dd552dfc74 (now on dxos main) — activates outline text edits via updateObject.edits; routine dep-bump covers it
- [x] Local edge checkout back on main; dev stack restarted 2026-08-01 (previous run died after ~11h40m: wrangler node OOM — heap-limit crash, known long-run miniflare growth; remedy = restart, no code fault)
- [ ] Reference: edge PR #781 (mcp-space-service README: commands, deploy, dx CLI round-trip)

## Backlog

- [x] Composer: deviceInvitationCode RACE — FIXED (claude/funny-chaplygin-89274c merged into #12423): onboarding is the single param owner + reset-and-join dialog. Runtime note: any composer served from a checkout without the fix (e.g. primary checkout on main) still hangs
- [ ] CLI under node: tsx chokes on `.tpl` imports from @dxos/assistant (bun-only text loader) — blocks testing invitations outside bun
- [x] CLI: `halo share` — printing + open-failure surfacing were already fixed in the re-registered version (landed with #12423); added the missing joinable URL print (live-verified 2026-08-01)
- [x] CLI: halo create/share re-registration LANDED with #12423 (plugin-client/src/commands/halo/index.ts)
- [x] `listSpaces` verified WORKING 2026-08-01 (returns the identity's spaces); `[]` for identities without a UserAgent row (post-wipe) — see TESTING.md sharp edges. NOT a code bug: registry normalizes hex→DID on lookup (DX-995)
