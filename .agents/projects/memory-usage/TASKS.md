# Composer Memory Usage — Tasks

_Resume: Phase 4 (idle churn) is the largest remaining pool; Phase 3 continues opportunistically. Uncommitted: none._

**Target: 300–400 MB resting footprint for an idle tab, 500 MB ceiling.**
Composition model and measurement rules: DESIGN.md. Industry comparison:
RESEARCH.md.

## Phase 1: Measurement — complete

- [x] CDP harness: per-context heap with forced GC, per-process RSS,
      `memory-infra` dumps, heap-snapshot aggregation and constructor diffs,
      retainer paths, boot census with coverage + sourcemap attribution,
      persistent-profile mode for returning-tab runs.
- [x] Baselines per serving mode: dev ~330 MB total heap, production ~122 MB
      at fresh boot; both flat over idle soaks.
- [x] Plugin-tier curve: barebones / minimal / full differ by ~150 MB RSS —
      the floor is core, not plugin count.
- [x] Ledgers for the reported tab, from user-captured traces and snapshots:
      1,444 MB (DevTools open), 1,887 MB (mailbox open), fully attributed.
- [ ] Harness into the repo as a maintained tool with a README (currently
      session-scoped, copy at /tmp/composer-memory-harness).

## Phase 2: Data-proportional retention

Memory should scale with what a user has open, not with a multiple of it.

- [ ] Feed/query payload retention (Linear DX-1148): `FeedObjectCore` keeps
      canonical JSON per live feed object; `IndexQuerySource` keeps
      `documentJson` per reactive result; the host keeps its own result set.
      Each large message is resident 4–5 times with a mailbox open.
- [ ] Automerge doc handles are never evicted; a large space loads every doc.

## Phase 3: Code residency

Nothing should be resident because of how it was imported. See DESIGN.md
finding 2 — barrels and module-scope imports of lazily-used values.

- [x] Onboarding hero image: 424 KB base64 module → `?url` asset.
- [x] emoji-mart + database (483 KB): lazy panel behind the picker.
- [x] Mermaid grammar (164 KB): language and highlight style load on the first
      mermaid fence.
- [x] bip39 (185 KB): loads with identity creation/recovery.
- [x] AI session runtime (MCP SDK, ajv, zod, Anthropic client — 286 KB): schema
      modules import the runtime lazily; toolkit exposes `./types` and
      `./operations` subpaths.
- [x] ML runtime (transformers + onnxruntime, 738 KB): loads with the NER
      model.
- [x] EVM client (viem, ox, abitype, x402 — 498 KB): loads on first payment.
- [x] Welcome screen (~25 KB on a returning tab): surface keys and overlay
      style split out; screen loads when its dialog renders.
- [ ] `chart.js` (146 KB) via devtools' performance panel — lazy-load the
      panel; confirm devtools' production enablement first.
- [ ] `fast-check` (94 KB) — a property-testing library with no identified
      legitimate importer in the boot path.
- [ ] Convention: prefer deep imports over barrels for cross-package symbols;
      consider a lint rule.

## Phase 4: Idle churn

An idle tab issues ~51 SQLite statements per second across four loops
(DESIGN.md inventory). The churn keeps allocator pages committed, which is the
largest single slice of the composition model (~380 MB per GB including V8
headroom).

- [ ] `TriggerDispatcher`: idle when no local triggers exist; schedule to the
      next due time instead of a fixed 1 Hz tick.
- [ ] Visibility gating: pause or stretch polls when `document.hidden`.
- [ ] Coordinate feed polls into one batched refresh with no-change backoff.
- [ ] Confirm `matchesHint` narrows query re-execution as intended.
- [ ] Attribute allocation rate per loop (disable each in turn, sample).
- [ ] Push over poll — EDGE notifies on change so an idle tab does no work;
      lands with feed-live-objects stage 4.
- [ ] Verify decommit: after each change, renderer RSS should trend toward
      live size at idle rather than plateauing at the high-water mark.

## Phase 5: Wasm and native

- [ ] Inventory the 10 wasm instances (8 worker, 2 main thread) and why each
      context instantiates them.
- [ ] Remove the main-thread automerge instance, or justify and bound it.
- [ ] Instantiate occasional-use wasm on demand in a terminable worker; wasm
      linear memory never shrinks.

## Phase 6: Execution cost of core code

The open architectural question. ~13 MB of executed JS costs ~150 MB of V8
state, much of it built at module-init time (Effect contexts, schema classes).

- [ ] Measure what schema/layer construction contributes at boot.
- [ ] Assess whether that construction can be deferred to first use.

## Deferred

- Perf-timeline gating and a CI regression guard (2026-08-06). The findings
  behind both are recorded in DESIGN.md; verification stays manual.

## References

- DESIGN.md — composition model, findings, measurement rules.
- RESEARCH.md — industry norms, postmortems, strategy playbook.
- Linear DX-1148 — feed/query payload retention.
- `.agents/projects/feed-live-objects/DESIGN.md` — push-over-poll roadmap.
- `.agents/projects/startup-latency/DESIGN.md` — demand-driven activation.
