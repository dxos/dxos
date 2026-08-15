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
  - [ ] `database` skill splits: the CRUD/query/schema/relation/tag half → **plugin-space**;
        `contextAdd`/`contextRemove` stay (they bind `Harness.HarnessService`). The only skill whose
        split runs _through_ it rather than between skills.
  - [ ] `discord` → plugin-discord, `linear` → plugin-linear, `connectors` → plugin-connector —
        destination plugins already exist, so these are relocation with no new packages and the
        dependency direction (plugin → core) already correct. Lowest risk; do first.
  - [ ] `project` — **deprecated**, superseded by plugin-projects. Primitive predecessor (artifact
        filing against a chat-bound project). Remove once `projects.eval.ts` and
        `sender-ledger.eval.ts` move to the plugin's skill.
  - [ ] Stays in assistant-toolkit: `memory`, `agent`, `agent-wizard`, `delegation`, `planning`,
        `alarm`, `skill-manager`, `browser`, `automation`, `websearch`. What is left is the chat
        runtime's own skills — which is what the package name claims.
  - [ ] **Gate:** `DatabaseSkill` is consumed by four `packages/core/` harnesses (`assistant-e2e`
        harness + `local-ai.test.ts`, `assistant-evals/skills.ts`, `functions-testing`) via
        `Ref.make(DatabaseSkill.make())`. They must assemble the _same_ skill production ships, or
        the evals stop testing what runs. Settle this before moving anything.
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
- [ ] **Watch/reload** — see Milestone 7; today an edit still needs a restart.

## Milestone 7 — third-party plugins and reload (design: [DESIGN.md](./DESIGN.md) §2-3)

A shipped `dx` must load plugins it was not compiled with, and those plugins' operations and
skills must reach the MCP surface. The MCP half is already done: the gateway reads
`Capabilities.OperationHandler` and `AppCapabilities.SkillDefinition`, so an enabled plugin
projects with no further work. The browser has the rest of the system (manifest, URL loader,
shared-scope import map, registry publish); this milestone is its node/bun half.

### Plugin loading

- [ ] **Shared scope at startup** — register `DEFAULT_PACKAGES` through `Bun.plugin`'s module
      registry so a plugin's bare specifiers resolve to the host's already-loaded instances.
      Proven to work inside a compiled binary, and to win over a copy in the plugin's own
      `node_modules` (DESIGN §2.1). Generate the list from the same source the Vite plugin reads —
      two contracts would drift.
- [ ] **`dx plugin add <url|name>`** — fetch manifest, download assets under
      `~/.config/dx/plugins/<id>/`, import, validate `meta`, register. `enable/disable/list`
      already exist but resolve only against compiled-in plugins.
- [ ] **Installed-remote persistence** — `plugins/<profile>.yml` records enabled ids; the
      `RemotePluginView` records (id, url, version) that live in `localStorage` in the browser need
      a file-backed equivalent.
- [ ] **Decide isolation** (DESIGN §2.3) — third-party code runs in-process with the user's HALO
      keys, and MCP lets an external agent invoke it. Decide before third-party plugins ship:
      trusted-publisher-and-explicit-enable, or a worker boundary (which would also solve reload).

### Reload, stage 1 — our own dev loop

- [ ] **`dx mcp serve --watch`** — supervise a child process, restart on change. The stdio session
      dies with the process, so the client reconnects per edit; acceptable for our own loop.
      `moon run cli:dev` already runs `dx` from source, so this is a supervisor plus a watcher.

### Reload, stage 2 — external plugin authors

- [ ] **`--dev-plugin <manifest-url>`** — the CLI equivalent of the browser's `devEntry` dev
      manifest: re-import on change with a cache-busting query, rebuild the projected layer, emit
      `tools/list_changed` / `prompts/list_changed` (already emitted at startup, already acted on
      by clients).
- [ ] **Upstream: tool/prompt removal in `McpServer`** — it exposes `addTool`/`addPrompt` only, so
      a changed surface cannot replace the old one without rebuilding the server layer under the
      live transport.
- [ ] **Idempotent (or per-load scoped) type registration** — re-importing a plugin that registers
      ECHO types throws "Schema version already registered".

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
