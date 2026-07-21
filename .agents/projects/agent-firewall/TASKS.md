# Agent Firewall — Tasks

Confine AI agent reads to a space allowlist; let a personal-space (tier-1) chat read across the
user's spaces. Design: `docs/design/agent-firewall.md`. Branch: `claude/exciting-sammet-327268`.

## Done

- [x] `Hypergraph.Service` (optional) carrying a per-session read allowlist; `Hypergraph.scopedLayer`.
- [x] `ScopedHypergraph` — narrow-only scoped view (getDatabase, sync resolution, query fan-out).
- [x] `Database.resolve` / `query` / `load` confined via the allowlist (deny foreign; multi-space fan-out).
- [x] Scope-aware index source (per-space fan-out; host does single-space full-text only).
- [x] `Hypergraph.spaceIds()` membership source; tier-1 allowlist = `scopedLayer(graph.spaceIds())`.
- [x] Feed/queue reads confined (`Feed.query` foreign-feed denial via `queryTargetsForeignSpace`).
- [x] Per-session `readScope` threaded: `useChatProcessor` → `AiChatProcessor` → `getSession` →
      `AgentProcess`; personal space ⇒ `'membership'` (via `AppSpace.isPersonalSpace`).
- [x] Membership system-prompt clause (tools say "the space"; tier-1 told they span all spaces).
- [x] Deterministic unit tests (`echo-client/src/hypergraph.test.ts`) + agent-level tests
      (`assistant-toolkit/.../agent-firewall.test.ts`, 4 scenarios).
- [x] Verified live in Composer: personal-space chat reads across spaces.
- [x] Merged `origin/main` (commits `e601db3f6e`, `ccb820944e`); branch compiles.

## Blocked / next (post-merge rework)

- [ ] **Re-adapt scoped-query path to main's query planner.** Main now requires an explicit `from()`
      clause and handles feeds via query sources. The scoped-graph read path regressed — 5
      `hypergraph.test.ts` cases fail (unscoped everything(), multi-space fan-out, full-text, feed,
      spaceIds). Fix: bind `from(allowlist)` for unscoped queries in `ScopedHypergraph`; keep
      per-space fan-out for full-text (host single-space limit); confirm feed reads via
      `SpaceQuerySource`.
- [ ] Regenerate `agent-firewall.conversations.json` positive fixture (`ALLOW_LLM_GENERATION=1`) —
      the membership system-prompt clause changed the prompt; the 3 tier-0 fixtures are unaffected.
- [ ] Full repo build + test green; then open PR (deferred per user).

## Deferred (future phases)

- Attenuating spawn (Phase 3), per-agent principal + revocation (Phase 4), credential confinement
  (Phase 5), T1→T0 delegation (Phase 6), Subduction for remote agents (Phase 7). See design doc.
