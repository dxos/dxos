# Agentic Inbox — Phase 3 (Corpus Layer) Implementation Plan

**Goal:** Corpus-level synthesis in `@dxos/pipeline-email`: meta-thread clustering → `Topic`, commitment ledger over the fact store, relationship rollups, topic/digest summarization — with a user-configurable algorithm (editable prompts + tunable thresholds). Plus `DESIGN.md` covering phases 4–5, and reconciliation with `plugin-crm` / `assistant-e2e`.

**Spec:** [`2026-07-03-agentic-inbox-discovery-design.md`](../specs/2026-07-03-agentic-inbox-discovery-design.md) §3③, §9.3. Autonomous run — decisions recorded here in lieu of user checkpoints.

## Decisions (autonomous, per spec)

1. **Clustering method (spec §10.3 spike):** deterministic **shared-signal clustering** — a thread's signature is its participant set + significant subject tokens; greedy agglomeration joins threads whose signatures overlap above a configurable threshold. No LLM in the clustering itself (Compute mode, testable); LLM only labels/summarizes the resulting topics (degradable, editable prompt). Embedding/LLM grouping deferred.
2. **Configurability:** one options bag per algorithm with defaults exported alongside (`DEFAULT_*`); all LLM prompts live in an editable `EmailPrompts` bag (`topicSummary`, `digest`) merged over `DEFAULT_EMAIL_PROMPTS`; extraction rules were already editable via `ExtractOptions.rules`. LLM calls arrive as a `Summarizer` closure (`(prompt: string) => Promise<string>`) so modules stay `R = never` and the harness owns model plumbing — same pattern as `FactIndexer`.
3. **Rollups are computed values, not Person mutations:** `Person` is a closed schema (no open properties bag), and ECHO objects are canonical user data — the pipeline must not write onto them. `buildRollups` returns `RelationshipRollup` values keyed by (lowercased) email; materialization waits for a proper schema home (phase 4+).
4. **Digest is Query-mode (spec §3③ “briefings”):** built on demand from topics/threads/ledger, not materialized as ECHO. Deterministic skeleton (counts, top topics, stalled threads, due commitments) + optional LLM narrative (editable prompt, degrades to skeleton-only).
5. **Ledger via the structured query path:** `SemanticStore.query({ predicate })` per commitment predicate (compiled to SPARQL by `buildSparql` on the sqlite backend; memory backend matches in-process) — works on both backends, unlike raw `select()` (Comunica, node-only). Commitment predicates configurable (default `owes`, `will send`, `must`, `due`).
6. **Topic ECHO shape:** `{ label, summary, threadIds: string[], participants: string[], keywords: string[] }` — string-keyed like `Thread.messageIds`; DXN refs when the entity layer firms up.

## Modules (all internal; lean `index.ts` preserved)

| File                 | Exports                                                                                                                             | Test              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `src/prompts.ts`     | `EmailPrompts`, `DEFAULT_EMAIL_PROMPTS`, `mergePrompts`                                                                             | `prompts.test.ts` |
| `src/types/Topic.ts` | `Topic` ECHO type (`org.dxos.type.emailTopic`)                                                                                      | `Topic.test.ts`   |
| `src/topics.ts`      | `clusterThreads(threads, opts?)`, `summarizeTopics(drafts, summarize, opts?)`, `materializeTopics(drafts)`, `DEFAULT_TOPIC_OPTIONS` | `topics.test.ts`  |
| `src/ledger.ts`      | `commitmentLedger(store, opts?)`, `Commitment`, `DEFAULT_LEDGER_OPTIONS`                                                            | `ledger.test.ts`  |
| `src/rollups.ts`     | `buildRollups(messages, opts?)`, `RelationshipRollup`                                                                               | `rollups.test.ts` |
| `src/digest.ts`      | `buildDigest(input, opts?)`, `renderDigest`, `Digest`                                                                               | `digest.test.ts`  |
| `DESIGN.md`          | phases 1–3 as built; phases 4–5 design (capability + action layers)                                                                 | —                 |

Gated Enron test gains a corpus section: topics (strict: ≥1, every thread assigned once), rollups (strict: one per sender), ledger (advisory count, strict shape), digest (strict skeleton, advisory narrative). Unit tests are deterministic (scripted fixtures, `mockAiService`/stub summarizer — no network).

## Order

prompts → Topic type → topics → ledger → rollups → digest → gated-test wiring → DESIGN.md → plugin-crm/assistant-e2e reconciliation (explore `crm-mailbox.test.ts`; align/extend; at minimum verify no breakage and document integration points) → full build/test/lint → push → PR → CI green.
