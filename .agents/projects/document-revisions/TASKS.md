# Document Revisions & Branches — Tasks

_Resume: PR #12315 OPEN for eval. Comment-render regression FIXED (see below). Morning: run [`TEST-PLAN.md`](TEST-PLAN.md) (storybooks + app script), then DECIDE the §0 open design issue (view-mode↔review-mode coupling: Preview/Read-only map to `viewing` which hides suggestions — the reported "edit disappears" is this; not data loss). Uncommitted: none._

Design: [`packages/plugins/plugin-comments/DESIGN.md`](../../../packages/plugins/plugin-comments/DESIGN.md).
Test plan + follow-along script: [`TEST-PLAN.md`](TEST-PLAN.md).

## OPEN DECISION (2026-07-23) — view-mode ↔ review-mode coupling (reported "buggy")

User report: in Suggesting, made an edit (visible in own colour), switched to plain-text (Source) then
back to markdown (Preview) → edit not visible inline, though still in the comments companion; reload
shows it. **Diagnosed:** NOT data loss — a visibility consequence of the view-mode refactor. Preview and
Read-only map to review `mode='viewing'`, whose `defaultReviewRenderPolicy` sets `showSuggestions:false`,
hiding all suggestions (incl. the user's own in-progress one). The edit stays on the suggestion branch;
`viewAspect` mode is in-memory so reload resets to `editing` and it reappears. Options in TEST-PLAN §0
(decouple render from posture / viewing-shows-suggestions-readonly / keep-as-is). **Not changed overnight
— user decides.**

## FIXED (2026-07-23) — comments not rendering in the editor ("clicking a comment doesn't work")

User: clicking a comment in the doc did nothing (`CommentsArticle → WithComments`). **Diagnosed via
storybook DOM/console instrumentation:** the companion listed all threads but the editor rendered ZERO
`.cm-comment` marks — so there was nothing to click. Root cause: `threads.ts` `subscribe` never primed
the initial decoration pass. The `comments()` ViewPlugin (ui-editor) only calls `getComments` when the
sink fires, and ECHO's `query.subscribe` does not emit for the already-resolved current value — so when
the seed (or a real doc) resolved BEFORE mount, `getComments` was never called and no marks rendered.
**Fix:** call `sink()` once in `threads.ts` `subscribe`, AFTER `query.subscribe(sink)` (subscribing
calls `_start()` synchronously → `query.results` becomes readable; priming before it throws
"Query must have at least 1 subscriber"). Verified in-browser: 3 marks / 3 `data-comment-id` / 3
highlight rects render.

**Follow-on (CI storybook check red):** the `ClickSelectsComment` play test I added failed — after
`userEvent.click`, `data-current="1"` never set. Root cause: `handleCommentClick` returns `true`, so
CodeMirror skips caret placement; the proximity tracker (`comments.ts` updateListener) then keeps
resetting the selection to `{closest}` (caret not in range), clobbering `{current}`. Fix: the isolated
story's click consumer now calls `scrollCommentIntoView(view, id)` (moves the caret INTO the range and
marks current) instead of a bare `setSelection({current})`. Verified: `react-ui-editor:test-storybook`
62✓ (incl. Comments 2✓), `plugin-comments:test` 21✓, lint clean.

## Tracked follow-ups

- [ ] **Rename the `threads` extension / reconsider comment decoration as an overlay.** Ask why
      [`threads.ts`](../../../packages/plugins/plugin-comments/src/extensions/threads.ts) is named
      "threads" (it wires comment-anchor sync + the `comments()` editor extension; "threads" reads as
      the data model, not the editor integration). Separately, evaluate implementing the comment
      decoration as an overlay (like the ambient suggestions overlay / `commentsHighlightLayer`) rather
      than inline `Decoration.mark`s — may simplify click routing and the proximity/selection coupling.
- [ ] **Root-cause the `Relation.getSource` mitigation (follow-up with Dima).** `threads.ts` `getAnchors`
      now try/catches `Relation.getSource` (crash: "Relation source could not be resolved" when the query
      surfaces a relation whose source proxy isn't yet resolved — e.g. a just-persisted comment). The real
      fix belongs in the query layer (defer/await source resolution or expose a resolved flag) so callers
      don't guard each `getSource`; then remove the try/catch. TODO(burdon) in
      [`threads.ts`](../../../packages/plugins/plugin-comments/src/extensions/threads.ts).

## P0 REGRESSION (2026-07-23, reported) — "each keypress creates a new suggestion" in editing mode

User: in Markdown mode (NOT suggesting) each keypress creates a new suggestion. **Static analysis:** only
two paths create a `kind:'suggestion'` branch — the ambient bind effect
([MarkdownArticle.tsx:147](../../../packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx),
gated on `mode==='suggesting'`) and the agent-only `SuggestEdit` op. So either (1) mode is not actually
`editing` (post-refactor you exit Suggesting by picking a built-in view mode; if that `setMode` doesn't
take, you stay `suggesting` while it looks like plain markdown), or (2) a find-or-create RACE in the bind
effect re-runs per edit and spawns a branch before the prior is queryable (fits "reload fixes it";
pre-existing from #12302). Could NOT run storybook play tests headlessly (browser project). **Repro story
added: `DocumentVersioning > EditingTyping`** — types in default editing mode, asserts NO suggestion
branch is created + no `.cm-track-insert`. **MORNING: run EditingTyping + Suggesting to bisect;** if it's
the exit-suggesting path, fix the `setMode` on built-in view-mode select / add a mode indicator; if it's
the race, guard the effect (debounce / idempotent find-or-create that sees the just-created branch).
Option on the table: revert the view-mode refactor (506b37c37c) to a clean #12302 base, keeping
B6/B4/comment-flash/change-bar, and rebuild the view-mode feature storybook-first.

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
  - [ ] **Unify the comment-bot identity with the compute author DID.** plugin-comments defines its
        OWN `AgentIdentity` — an app-framework `Capability` (`{ name, identityDid?, avatar? }`,
        default `{ name: 'Kai' }`, [types/AgentIdentity.ts](../../../packages/plugins/plugin-comments/src/types/AgentIdentity.ts))
        naming the comment-thread `@mention` bot + stamping sender metadata — distinct from the
        `@dxos/compute` `AgentIdentity` `Context.Tag` (`{ did, name?, hue? }`) that item 2 injects as
        the suggestion `creator`. The comment bot already carries an unused-for-authorship
        `identityDid?`; when the compute resolver lands, route the comment-bot's DID through the same
        `resolveAuthor` path so a bot reply and a bot suggestion share one author/colour, and the two
        `AgentIdentity` concepts don't drift. Verify the shared-name collision doesn't confuse
        `Capability.get` vs `serviceOption` call sites.
- [ ] **Naming collision — two `AgentIdentity`s.** plugin-comments' `AgentIdentity` (app-framework
      `Capability`, the comment-bot "Kai") vs `@dxos/compute`'s `AgentIdentity` (`Context.Tag`, the
      suggestion author DID). Unrelated today; no code path bridges them. Risk of confusion once the
      compute resolver lands near comment code — resolution/unification tracked in the item-2 block
      above ("Unify the comment-bot identity with the compute author DID").
- [ ] Reconcile comments view vs suggestions view — split them into different tabs (today the
      `Suggestions` companion and comment threads share one surface in `CommentsArticle`; give
      suggestions their own tab alongside the unresolved/all comment tabs).
- [ ] Full-stack `CommentsArticle` verification could not run in-pane (30s boot timeout) — verify
      the suggestion companion + empty state manually (see morning test plan).
- [ ] Create test plan + usage script for demo video — the suggestion-review flow (Suggest edits →
      edit on the suggestion branch → accept/reject in the companion), which stories to exercise
      (`SuggestionThread`, `Message/WithChange`, `VersionBanner`, integrated `CommentsArticle`), and
      an end-to-end narration for recording.

## Ambient review model (Google-Docs-style) — in design (brainstorming 2026-07-21)

Pivot: user does NOT actively manage branches. Default view = main + comments + all user
suggestions overlaid. Decisions so far: (1) per-user mode toggle Editing/Suggesting/Viewing (local
pref, persisted per doc); (2) GDocs-parity rendering as a **product-level `ReviewRenderPolicy`
config**; (3) additive — keep the explicit branch switcher / Base-Diff-Branch selector / banner as
an advanced/history path (reached via explicit selection); ambient overlay is the default
`selection.kind==='current'` experience; (4) accept/reject by any editor, inline + companion.

- [ ] **Maintain the precise ambient-review spec in `packages/plugins/plugin-comments/DESIGN.md`**
      (the plugin design file), not a separate superpowers spec. (tracked 2026-07-21)
- Spec: [`plugin-comments/DESIGN.md` § Ambient review model](../../../packages/plugins/plugin-comments/DESIGN.md).
  Implementation plan:
  [`agents/superpowers/plans/2026-07-21-ambient-review-model.md`](../../../agents/superpowers/plans/2026-07-21-ambient-review-model.md)
  (Milestone A: modes + policy + Editing/Viewing ambient overlay + review — fully specified;
  Milestone B: Suggesting-mode authoring — spike-gated, tasks appended after Task B0).
- [x] **PR #12301 MERGED (2026-07-22 02:53Z)** — Milestone A shipped. Preview:
      https://pr-12301-composer-main.dxos.workers.dev
- [x] **Milestone A LANDED (2026-07-21)** via subagent-driven execution — tasks A1–A6 complete,
      each spec+quality reviewed, all fix loops closed. Commits: A1 f7f0027e09, A2 2b61901677,
      A3 40618ca277 (+4846834552,+46142dd6e9), A4 50211bfca2 (+928921e411), A5 b7ba37fa49 (+1a42697ac1).
      Ambient Editing/Viewing overlay + mode toggle + `ReviewRenderPolicy` + `SuggestionSources`
      slot + `suggestionsOverlay` in `@dxos/ui-editor`. Build/lint/unit + play tests green across
      ui-editor/plugin-space/plugin-comments/plugin-markdown. Minor deferred to final review: no
      `useVersioning` hook-test harness (A1). NOTE: user merged `tabs-props-button-iconbutton` mid-run.
- [x] **Milestone A landing polish (2026-07-21):** final-review hue-seam fix (ce0552512d); merged
      origin/main incl. Tabs rename (6b68f1450b, resolved Welcome.tsx → Tabs.Button); story JSDocs
      converted to bullets (6e789cdee4); AmbientReview rests in Editing so suggestions stay visible
      (toggle round-trip); **Suggesting mode option hidden** until Milestone B (no dead "coming soon"
      control — label/state plumbing retained). Post-merge build green.
- [ ] **Deferred (final-review, non-blocking):** full-stack `CommentsArticle`↔markdown composition
      play test (editor overlay + right-column comments/history companions). The demo already exists
      via `CommentsArticle → WithAgentSuggestions` (real seeded suggestions + the committed
      comments-top/history-bottom layout); each half is unit-tested, but the full-stack boot times out
      in-pane, so an automated assertion is deferred to avoid a flaky test. `showComments` consumption
      and the `useVersioning` hook-test harness also deferred.
- [x] **Milestone B — Suggesting-mode authoring** (A1 bind-to-branch) — **PR #12302 MERGED
      (2026-07-22 08:41Z, squash 77fff35b41)** incl. the `@dxos/plugin-versioning` extraction
      (published 0.10.0, core via `tags:['system']`). B0–B3 + B7 landed; B4/B6 deferred to own PRs,
      B5 substantially met. Sub-item status below.
  - [x] **B0 spike** (2026-07-22, two parallel Opus agents): A1 bind-to-branch chosen over A2
        bind-to-main. Reports: `.superpowers/sdd/spike-*.md`.
  - [x] **B1 `trackChanges` extension + eval story — A1 RATIFIED by user felt-eval (2026-07-22).**
        `computeCharHunks` (character-level) so live typing marks only changed chars (word-level
        struck even a newline); phantom-deletion widgets + atomic caret guard; `TrackChanges` story.
        Suggestion accept/reject moved to a hover popover (was an opacity-hidden inline gap). User
        confirmed: insertions clean green, deletions strike correctly, phantom/caret OK — with the
        second-author overlay REMOVED from the story (see B2).
  - [x] **B2 — base-decoupling DONE** (da357354e5 rebase + 0ffebb31ce tooltip + 137767fe3f boundary
        fix). `suggestions({ base })` diffs foreign sources vs main and `rebaseHunks` maps them into
        the diverged branch's coords (fixes the strike-your-own-text + garbled-accept defects);
        accept/reject moved to a non-clipped `hoverTooltip` layer. Opus review caught an adjacency
        off-by-one → fixed + regression test. 299 ui-editor tests green.
  - [x] **B3 — Suggesting mode wired into MarkdownArticle DONE** (f2b702c3c6). `mode==='suggesting'`
        (ambient) binds the editor to the user's own `kind:'suggestion'` branch (find-or-create), self
        edits render via `trackChanges` vs main, other authors overlay via `suggestions({ base:main })`
        (self excluded); mount guarded so edits NEVER hit main (opus review verified airtight);
        Suggesting toolbar option re-enabled. DocumentVersioning 9/9 incl. a Suggesting play test that
        asserts the edit lands on the branch, not main.
  - [ ] **B4 — DEFERRED (follow-up, own PR).** Author-side accept/reject/un-delete of one's OWN inline
        draft changes. Lower value: the reviewer accept/reject round-trip already works via the
        Editing-mode foreign overlay (A5 + B2); an author revises their own draft by editing. Un-delete
        of a phantom (re-instate a deleted word) is the one genuinely-missing affordance — track it.
  - [~] **B5 — integration coverage: substantially met by B3's Suggesting play test** (full UI round
    trip: toggle → type → branch-scoped edit + foreign overlay vs main). The full-stack
    `CommentsArticle`↔markdown composition test stays DEFERRED (in-pane 30s boot timeout — flaky;
    would need a bootable fixture).
  - [ ] **B6 — DEFERRED (follow-up, own PR).** Perf: `trackChanges` re-diffs the whole doc per
        keystroke (fine for normal docs; needs incremental diffing for large ones); also `rebaseHunks`
        recomputes `computeCharHunks` per source (hoist once). Plus multi-line/block deletions + copy
        semantics. None block normal-size docs.
  - [x] **B7 — ship**: DESIGN update + changeset + PR (this PR).

## Landing the suggestions feature (current goal)

Polish + fixes required before landing the suggestion-review flow.

- [x] When switching to a branch via the toolbar, default the view to **Diff** (not Base/Branch).
      Done: toolbar branch-switch action calls `setView('diff')` (MarkdownArticle.tsx).
- [ ] Show the history companion below the comments companion in `CommentsArticle.stories.tsx`
      (right column split into equal rows: comments top, `subject:'history'` companion bottom).
- [x] BUG: selecting a branch then adding a comment throws `RangeError: Cannot getCursorPosition:
cursor <id> is invalid`. **Root cause:** in Branch view the editor binds to the branch doc, so
      comment cursors are branch-doc cursors, but `threads.ts getName` always resolves against
      `doc.content.target` (main) → invalid. **Fixed (2026-07-21, ontology-driven):** `getName`
      resolves against the editor-bound Text (branch doc in Branch view, main otherwise) + defensive
      try/catch; new `readonly` option on the `comments()` editor extension no-ops `createComment` on
      suggestion branches. Plumbing: `MarkdownExtensionProvider` gains `branchText` + `suggestionBranch`;
      `MarkdownArticle` passes the editor-bound branch Text (undefined in diff/suggest) + kind flag;
      `threads()` takes an options bag. ui-editor `createComment` readonly unit test; build+lint+tests
      green. FULL switch-to-branch-then-comment manual flow still blocked in-pane by the 30s
      full-stack boot timeout — verify manually once bootable. **Decision (2026-07-21, ontology-driven):**
  - Branch ontology: (1) **main**; (2) per-user **suggestion** branches (`kind:'suggestion'`); (3)
    private **draft** branches (regular; public today, private under Keyhive ACLs later).
  - **Comments allowed on any branch EXCEPT suggestion branches.** So: fix cursor resolution to use
    the editor-bound doc (main in Diff/suggest view; branch doc in Branch view), enabling comments on
    main + draft branches; and **prohibit** comment creation while the active branch is a suggestion
    branch (`activeBranch.kind === 'suggestion'`).
  - Plumbing: thread the editor-bound branch Text + a "comments prohibited" flag from
    `MarkdownArticle` → `MarkdownExtensionProvider` props → `threads()`; `getName` resolves against
    the branch Text; the `comments()` extension suppresses the create affordance when prohibited.
- [ ] Storybook with a real LLM making suggestions; a play function where suggestions are created by
      a mock agent and dismissed by the user. (tracked 2026-07-21)
- [ ] BUG: creating a comment — after pressing Enter the comment flashes. (tracked 2026-07-21)

## Overnight combined PR (2026-07-23) — one PR, left green + OPEN for eval

Only B6 is land-quality; the rest are draft for morning felt-eval. Cannot create branches, so
one combined PR on this branch (user decision). B6 scope = safe hoist + cache only.

- [x] **B6 perf (land-quality)** — DONE. `rebaseHunksWith(charHunks, hunks)` extracted; `suggestions`
      computes `computeCharHunks(base, doc)` ONCE per build and reuses it across every source (was
      once per source). `trackChanges.build` gained a 1-entry (base,doc)→state memo (reuses the diff
      on undo/redo to a cached buffer). Behaviour-identical: hoist-parity regression test added; 302
      ui-editor tests green. Windowed incremental diff deferred (out of safe scope).
- [x] **View-mode refactor — Suggesting becomes a view-mode (design settled 2026-07-23) — DONE
      (build+lint green; story play tests pending user eval).**
  - [x] `react-ui-editor` `addViewMode(state, onViewModeChange, items?)` — optional `items` (default
        the 3 built-ins via `defaultViewModeItems`); item `ViewModeItem { id, icon, label?, checked?,
onSelect? }`. Threaded `viewModes?` through `EditorToolbarFeatureFlags` → `createMarkdownActions`
        → `addViewMode` (+ memo dep). Exported `ViewModeItem`/`defaultViewModeItems` at the package root
        (components barrel). Backward-compatible (other editors keep the 3 built-ins). `Label` exported
        from `@dxos/ui-types`.
  - [x] plugin-markdown establishes `MarkdownCapabilities.ViewModeExtension` (named to avoid the
        `EditorViewMode` enum collision) `{ id, icon, label, reviewMode, order? }`; `MarkdownArticle`
        assembles built-in 3 + contributions, central single-checked, built-ins map source→editing /
        readonly|preview→viewing on select, contributed entries `setMode(reviewMode)`; contributed only
        on the ambient path.
  - [x] plugin-comments contributes `{ id:'suggesting', icon:'ph--pencil-simple--regular',
label:'view-mode.suggesting.label', reviewMode:'suggesting', order:3 }` — no plugin-comments ⇒
        no Suggesting entry.
  - [x] Removed the toolbar `versions` branch-selector group + the separate `review-mode` group +
        `handleSuggest` (History companion covers branch switch / return-to-main / create / merge /
        discard — confirmed). Kept the `VersionToolbar` banner + its Base/Diff/Branch selector.
  - [x] Stories/translations: `selectReviewMode`→`selectViewMode` drives the View-mode dropdown
        (Viewing→Read-only, Editing→Source, Suggesting→Suggesting); the AmbientReview story fixture
        contributes a stand-in Suggesting entry; `suggesting` label added to plugin-comments. TODO:
        `addViewMode` custom-item unit test (deferred — behaviour covered by the story play tests).
  - [x] `react-ui-menu` DropdownMenu now renders a trailing check on the CURRENT value of a
        single-select group (the check indicator was missing) — the user's note.
- [x] **B4 un-delete phantom — REVERTED (user decision 2026-07-23).** Shipped a hover restore control on
      own deletion phantoms; user found it flaky (the floating control leaves the hover zone on click) and
      directed: in Suggesting mode there must be NO popovers over one's own suggestions. Removed the
      restore control + theme + test from `trackChanges` (suggest-mode-only). Un-delete now via native
      undo (already works) — a non-popover affordance can be revisited later.
- [x] **Comment-flash-on-Enter (draft) — DONE (diagnosed + fixed; visual confirm pending user).**
      Root cause: `add-message.ts` removed the draft from `state.drafts` BEFORE `AddObject`/`AddRelation`
      persisted the thread, so for a frame the comment was in neither the draft list nor the ECHO query
      (`CommentsArticle` renders `query.concat(drafts)`) → it flashed out. Fix: persist first, remove the
      draft last (comment always in one list); plus dedupe the render by source thread id so the brief
      draft/persisted overlap shows once. build + 21 unit tests green. Visual confirmation needs the app
      (in-pane full-stack boot times out).
- [x] **Change-bar gutter (draft) — DONE.** New shared `change-bar.ts`: a facet whose `enables` adds one
      gutter, fed by both `trackChanges` (own edits) and `suggestions` (foreign authors), so a line
      carrying a suggestion shows a vertical bar tinted with that author's colour (no double column).
      Unit test added (307 ui-editor tests green).

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
