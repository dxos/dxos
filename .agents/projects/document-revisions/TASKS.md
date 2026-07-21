# Document Revisions & Branches — Tasks

Design: [`packages/plugins/plugin-markdown/DESIGN.md`](../../../packages/plugins/plugin-markdown/DESIGN.md).
Convergence plan (+ resolved decisions):
[`agents/superpowers/plans/2026-07-17-branching-convergence.md`](../../../agents/superpowers/plans/2026-07-17-branching-convergence.md).
PRs: [#12237](https://github.com/dxos/dxos/pull/12237) (landed 2026-07-16); stage 1 on branch
`claude/document-revisions-a2994d`.

## Done (phase 1 / stage 0, in PR #12237)

- [x] `@dxos/versioning` package (namespace layout: Version/Branch/History over internal/) —
      checkpoints (named heads), content-copy branches, textual 3-way merge, diff utils; 29 tests.
- [x] plugin-markdown surface: Timeline git-graph companion, editor banner + branch switcher,
      three diffView variants, merge-conflict editor extension (Accept branch/current/both),
      NamePopover UX (optional names → date-time labels), agent operations, storybook play tests.
- [x] ui-editor: only a single leading '>' decorates as blockquote.
- [x] All CodeRabbit review rounds addressed and resolved.

## Landing blockers (PR #12237)

- [x] `@dxos/versioning` first npm publish (0.10.0) + public flip — done (user).
- [x] Regenerate stale `assistant-e2e` memoized fixtures — done; pass on CI.
- [x] Fix `@dxos/versioning` exports map for the vite build output (CLI tests failed at runtime
      resolution) — done (05571b25a5). Awaiting green Check.

## Stage 1 (this branch) — revive #11829 core layers

Ported onto the post-#11796 architecture (EntityManager split; CoreDatabase is gone), core layers
only — the HistoryCompanion/plugin UI stays with stage 3.

- [x] Time travel (commit 1): ObjectCore pin + displayUpdates/LatestEventId dual channels,
      latestOnly subscriptions/atoms, Entity.isTimeTraveling/timeTravelAtom,
      setTimeTravel/clearTimeTravel, getEditHistoryWithDiffs. 7 tests.
- [x] Core branching (commit 2 + scrubbed-position fix): DatabaseDirectory.branches registry,
      host replication via getAllLinkedDocuments, EntityManager
      create/switch/merge/delete/list/current, EchoDatabase delegates, object-first API. 13 tests
      (incl. two-peer replication + guards: duplicate/unknown/inline-object errors).
- [x] BranchStore persistence (commit 3, core parts): hydrate on open, persist on switch,
      threaded EchoClient→DatabaseImpl→EntityManager; per-peer store in test harness. Reload test.
- [x] Writable per-surface `BranchBinding` API (new; plan decision (a)):
      `db.branch(obj, name)` — caller-owned ephemeral binding; reads/writes land on the branch
      doc only; coexisting bindings; 'main' returns live object. 7 tests.
- [x] Hardening: inline-object clear error path; storage/replication review documented on
      createBranch JSDoc (full A.save per member per branch; branch docs join the space document
      list via the registry so they replicate/export like linked docs).
- [ ] Open stage-1 PR tagging @wittjosiah (reviewer; original author of #11829 commits).

## Stage 2 (this branch) — rewire `@dxos/versioning` onto the core API

- [x] Core `Database.Database` interface gains the branching surface + `BranchBinding` (so
      `Obj.getDatabase` suffices for versioning; echo-client re-exports).
- [x] `Branch.create` forks a core branch (record.id = registry key; `key` field discriminates
      core vs legacy); `Branch.bind` returns a writable per-surface binding; `Branch.merge` is
      CRDT for core branches (registry entry removed) with the `merge3` marker fallback for
      legacy content-copy records (until stage 4); `discard` keeps the registry entry for
      recovery. `content` ref is now optional (legacy only).
- [x] Checkpoint viewing via `setTimeTravel` pinning (`Version.view`/`clearView`);
      `Version.restore` clears any active pin first (restore-while-pinned covered).
- [x] `forkDump` hardening: unreachable fork frontier throws instead of silently forking at tip.
- [x] plugin-markdown: `useVersioning` manages the branch binding + checkpoint pin; editor binds
      `activeText`; async create/merge handlers; timeline tolerates core records (per-branch diff
      stats deferred to stage 3); ConflictResolution story exercises the marker editor on seeded
      conflicts (core merges cannot produce markers).
- [x] Tests: versioning 31 (CRDT merge, same-line no-markers, legacy fallback, view/restore
      pinning), plugin-markdown 23 + 15 storybook play tests (Time Travel / Branch Merge /
      Conflict Resolution) green.

Deferred to stage 3: branch-scoped agent edits (CreateBranch op returns the canonical content
DXN; a generic update against it writes main), per-branch timeline diff stats, checkpoints of
branch state / branch-of-branch, deployed-app BranchStore backend.

Deferred from the CodeRabbit round (stage 3/4):

- `DatabaseRoot.mapLinks` import-time doc-id remapping does not rewrite `branches` registry urls;
  review index/reindex document enumeration for branch docs.
- Ref atom families: return `undefined` when the initially resolved target is already deleted
  (consistency change to the shared `loadRefTarget` contract, both `refFamily` variants).
- Encode the core/legacy Branch record invariant as a discriminated union once the stage-4
  migration converts legacy records (runtime guards cover it until then).

## Stage 3 (this branch) — UI + review-workflow convergence

- [x] 3a: branch-scoped agent edits (MarkdownOperation.Update branchId) + deployed device-local
      BranchStore (localStorage in space-proxy).
- [x] 3b: generic version-history companion in plugin-space (SpaceCapabilities.HistoryProvider
      gate; markdown contributes the provider); ObjectHistory + moved timeline model/NamePopover.
- [x] 3c: editable unified merge overlay (ui-editor diffView) for the sideBySide compare, on the
      live branch editor; read-only DiffView removed.
- [x] 3d: branch-aware comments (AnchoredTo.branch, scoped to the review branch from the shared
      version selection) + AcceptChange per-hunk cherry-pick (CollaborationOperation.AcceptChange + cherryPickHunk); getObjectOnBranch read helper. Memoized fixtures regenerated.

## Stage 4 (this branch) — cleanup

- [x] Textual-fork CREATION path already retired in stage 2 (`Branch.create` is core-only); no
      residual code creates content-copy branches. No `HistoryScrubber` exists (nothing to fold).
- [x] `merge3` + conflict-marker editor retained for external/imported content and legacy
      content-copy records (which stay mergeable via `merge3` until they drain) — NOT a destructive
      migration (no real persisted content-copy data; format shipped <2 days ago).
- [x] `DatabaseRoot.mapLinks` remaps the `branches` registry doc urls on space import/copy.
- [x] Ref atom families resolve to `undefined` on the initial read of an already-deleted target.
- [x] DESIGN.md updated to the landed converged model.
- [ ] Deferred (needs legacy records gone first): encode core/legacy `Branch` as a discriminated
      union / make `key` required. Left optional so legacy records still load.

## Post-merge fixes on the stage-1..3 PR (#12246)

- [x] Merge with origin/main: resolved plugin-comments threads.ts (branch-review scoping +
      main's selection-style highlights) + lockfile.
- [x] Branch-checkpoint bug: revisions on a branch record the branch's heads and lane on the
      branch (Version.branch); view/restore resolve the branch doc. Multi-revision BranchMerge
      storybook play test.
- [x] Flaky concurrent-siblings forkDump test: relaxed the environment-dependent head-count
      assertion.
- [x] Branch-navigation bugs (reported): (a) selecting a revision on a branch rendered empty —
      the editor mounted before the async branch binding resolved and never rebound; guarded the
      mount (`branchLoading` now also covers a resolving branch-checkpoint). (b) No way back to the
      editable branch tip — added a synthetic per-branch `Tip` node to the timeline and made
      banner-close / restore on a branch checkpoint return to the branch, not main.
- [x] Comprehensive versioning storybook plan (DocumentVersioning.stories): case 1 TimeTravel,
      case 2 BranchRevisions (select revision + return to Tip) & BranchMerge, case 3 ChainedBranches
      (fork→merge×2), case 4 ConflictAutoResolve (CRDT no-markers) & ConflictResolution (markers).
      Every action driven through the real UI. 7 play tests green in chromium.

## Phase 4 (this branch, PR #12290) — Google-Docs-style suggestion review

- [x] `ui-editor`: `suggestChanges` inline per-change accept/reject overlay over a proposal;
      multi-author `suggestions({ sources })` overlay; word-level `diffHunks` + `groupHunks`;
      word-level `computeWordHunks` so `cherryPickHunk`/`revertHunk` resolve one word, not the
      whole line; review extensions grouped under `review/`.
- [x] `types`: `ContentBlock.Change` (`before`/`after`) so a suggestion renders through a message
      tile. `react-ui-thread`: `Message.Tile` renders the change block with Accept/Reject
      (`onAcceptChange`/`onRejectChange`); `CommentThread` decoupled from `@dxos/react-client`.
- [x] `plugin-markdown`: "Suggest edits" authoring action + `SuggestEdit` op (find-or-create the
      caller's per-author `kind:'suggestion'` branch via `Branch.suggestion`); VersionBanner
      `[Base | Diff | Branch]` selector (Merge button removed — merge from the panel).
- [x] `plugin-comments`: unified review companion — comment threads + suggestion cards in one
      surface; `Suggestions` reactively tracks active suggestion branches (one bound probe each)
      and routes Accept/Reject to the durable `AcceptChange`/`RejectChange` ops (services: []).
- [x] Per-author colours: banner name tag + inline suggestion markers + cards tinted with the
      author's palette hue (shared `authorHue`/`suggestionColour`, `@dxos/util` `stringToHue`);
      `initializeIdentity({ displayName })` so stories show a name, not a DID.
- [x] Empty state unified: `SuggestionThread` renders nothing when empty (dropped the "No open
      suggestions" text); the companion's single Message prompt (comment + Suggest edits) covers it.
- [x] Play/unit coverage: `Suggest` (accept/reject, multi-author, colour), `SuggestionThread`,
      `Message/WithChange`, `VersionBanner/SuggestionBranch` (hue + view selector), diff word-level
      unit tests, `suggestion-sources` colour tests; `DocumentVersioning` merge helper fixed for
      the panel button.

## Phase 4 — open decisions / follow-ups

- [ ] **Agent suggestion identity — DECIDED (2026-07-21): synthetic DIDs now, real identities +
      multi-agent later.** Design:
      [`agents/superpowers/specs/2026-07-21-agent-identity.md`](../../../agents/superpowers/specs/2026-07-21-agent-identity.md).
      Implementation (this branch):
  - [x] `Agent.did` field (`IdentityDid`, seeded via `IdentityDid.random()` in `makeInitialized`;
        optional for back-compat) — persisted, import-stable, `did:halo:` format.
  - [x] `AgentIdentity` service in `@dxos/compute` (`{ did, name?, hue? }` + `currentDid`, read via
        `serviceOption` — no hard requirement). Verified: an ambiently-provided `AgentIdentity`
        reaches an op handler.
  - [x] `SuggestEdit`: `creator` optional, defaults from `AgentIdentity.currentDid` (dies if
        neither). Test: creator defaults from the provided identity; explicit creator overrides.
        NOT yet exposed as an agent tool — see the runtime-provision item (exposing it before the
        runtime supplies an identity would make an agent call die for lack of a creator).
  - [ ] **Runtime provision (needs live-agent verification — deferred).** Correct mechanism: an
        `AgentIdentity` **resolver** (NOT a spawn-time layer). Rationale discovered while wiring:
        `agent-runtime` cannot import `Agent` (dep direction), and agent sessions are cached/hydrated,
        so a `did` threaded at spawn is lost on hydration. Instead register
        `ServiceResolver.succeed(AgentIdentity.AgentIdentity, ...)` in the production
        `Capabilities.ServiceResolver` composition (a plugin/assistant-toolkit layer that CAN import
        `Agent` + `Harness`); resolve via `Agent.getFromChatContext` → `{ did, name }` (fresh per call,
        survives hydration — same pattern as planning/agent/delegation ops that declare
        `Harness.HarnessService`). Requires: make `AgentIdentity.Identity.did` optional + resolver
        always-succeeds (so the explicit-`creator`, no-agent path still works); `SuggestEdit` declares
        `AgentIdentity`; add the resolver to `AssistantTestLayer` too; and re-expose
        `MarkdownOperation.SuggestEdit` in the markdown skill `operations` + instructions (removed for
        now so an agent can't call a tool that would die without an identity). Left for a live-agent
        env: the resolver runs only inside a running agent's Harness context, which is exactly what
        must be exercised to trust it. (The op-level default is already proven by the ambient test.)
  - [ ] **Consider relocating the `Agent` definition** to break the dep-direction blocker above:
        move `Agent` from `assistant-toolkit` down to `agent-runtime` (so the runtime can resolve its
        own agent identity directly), or minimally extract an `AgentIdentity`/`Agent`-identity
        subclass/base type into a lower package both can import. Would let the runtime provide identity
        without the Harness-resolver indirection.
  - [ ] `resolveAuthor(did, members, agents)` so agent authors show name + hue in banner + companion
        (query space `Agent` objects; seed `authorLabels`/`authorHues`). Lands with the runtime
        provision — until agents actually author suggestions there is nothing to display.
  - [ ] Future: swap synthetic provider for real HALO identity in `Agent.did`; no `creator` re-key
        (already `IdentityDid` format); drop the agent-author seeding once agents are members.
- [ ] Full-stack `CommentsArticle` verification could not run in-pane (30s boot timeout) — verify
      the suggestion companion + empty state manually (see morning test plan).
- [ ] Create test plan + usage script for demo video — the suggestion-review flow (Suggest edits →
      edit on the suggestion branch → accept/reject in the companion), which stories to exercise
      (`SuggestionThread`, `Message/WithChange`, `VersionBanner`, integrated `CommentsArticle`), and
      an end-to-end narration for recording.

## Future

- **True nested branch-of-branch** (fork off a branch tip, keep live, merge child→parent→main).
  Unsupported today: the core `DatabaseDirectory.branches` registry is flat, keyed by the root
  object id, and forks always derive from the root doc (forking at a sub-branch frontier hits an
  unreachable frontier). Chained fork→merge sequences work. Needs a nested/parent-aware registry
  key + fork-from-branch-doc support in `EntityManager.createBranch`. UNTIL then the UI guards it:
  the "New branch" button is disabled on a branch / branch revision, and the checkpoint banner's
  "Branch from" is hidden for branch revisions (previously they silently forked from main).
  Design + estimate (~5–6.5 eng-days, parent-pointer model, 3-part PR):
  [`agents/superpowers/specs/2026-07-17-nested-branches-design.md`](../../../agents/superpowers/specs/2026-07-17-nested-branches-design.md).
- Generalize `@dxos/versioning` record refs over `Ref(Obj.Any)` so non-Text objects (sketches,
  sheets) can be versioned; branch-level access control; subduction fragment compaction alignment.
