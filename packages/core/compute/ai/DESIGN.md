# AI testing strategy — design

## Purpose

Testing an AI conversation is hard because a single "e2e" run mixes concerns with wildly
different determinism and cost profiles: pure developer code that should be trivially unit-tested,
and LLM inference that is slow, costly, and non-deterministic. The current memoization approach
collapses all of them into one mechanism (`src/testing/memoization/MemoizedLanguageModel.ts`,
`*.conversations.json` snapshots) and pays for that conflation in brittleness and false confidence.

This document defines the **dimensions** of an AI conversation, records **what we do today** and
what it achieves vs. misses, describes **what we should do** (a tier per dimension), and gives a
**prioritized plan**, including retiring the memoized e2e framework.

## Dimensions of an AI conversation

An agent turn factors into distinct concerns. The first four (A–D) are the ones we usually mean
by "the agent works"; the rest (E–H) are the seams a four-way split silently omits.

| Dim | Concern | Owner | Determinism | Right tool |
| --- | --- | --- | --- | --- |
| **A** | **Comprehension** — interpret NL instructions | LLM | Non-deterministic | Eval |
| **B** | **Tool selection & argument synthesis** — pick the tool, emit schema-valid JSON | LLM | Non-deterministic | Eval |
| **C** | **Operation execution** — the tool handler runs | Developer code | Deterministic | Unit test |
| **D** | **Turn loop / harness** — feed tool results back, iterate to stop, max-iterations, error and malformed-output handling, persistence | Developer code (`AiSession.run`) | Deterministic | Unit test (scripted model) |
| **E** | **Context assembly** — system prompt + skill instructions + bound objects → the prompt the LLM sees | Developer code | Deterministic | Unit test / snapshot |
| **F** | **Schema & (de)serialization** — tool JSON-schema generation, argument decode, result encode | Developer code | Deterministic | Unit test (round-trip) |
| **G** | **Evaluation / grading** — did the run meet its criteria? | Test oracle (must not be the system under test) | — | Assertion or graded scorer |
| **H** | **End-to-end composition** — emergent behavior across A–F on a realistic path | Whole system | Non-deterministic | Thin integration eval |

Key observations that drive everything below:

- **B is not monolithic.** "The LLM picks the right tool and produces valid args" is A/B (LLM,
  eval). "Given valid args, the handler decodes/executes/encodes correctly" is C/F (code, unit).
  The seam between them (F) is deterministic and must not be tested through the LLM.
- **G is an oracle, not part of the system under test.** If the pass/fail verdict is itself an
  LLM output, the test certifies itself.
- **C, D, E, F are ordinary deterministic code.** None of them needs an LLM to be tested.

## What we do today

Two mechanisms, both centered on `MemoizedLanguageModel`:

1. **Generate a conversation snapshot** (`ALLOW_LLM_GENERATION=1`, run by a developer with
   `DX_ANTHROPIC_API_KEY`, never in CI). The memoized layer intercepts
   `LanguageModel.generateText`/`streamText`, calls the real model, and appends
   `{ parameters, prompt, response }` to a per-test-file `*.conversations.json`. This records
   dimensions **A + B** (plus the final grading output — see below).
2. **Replay under CI.** The same layer matches the live prompt against the snapshot (exact
   structural equality after timestamp/date normalization and opt-in dynamic-id canonicalization)
   and returns the stored response. On a miss it fails hard. The agent e2e harness
   (`@dxos/assistant-e2e`) wraps a prompt as a test and checks structured `completedCriteria`.

### What replay actually exercises

A crucial nuance: on replay, **C, D, E, and F all run for real** — the operation handlers execute
against a real ECHO database, the `AiSession` loop genuinely iterates, the prompt is genuinely
assembled and the tool args/results are genuinely (de)serialized. **Only A and B are frozen.**

### What it achieves

- Deterministic, offline CI for flows that would otherwise require a live model.
- Genuine integration coverage of C + D + E + F along **one recorded path** — a hard crash in an
  operation or the loop is caught (indirectly; see below).
- A single command to refresh fixtures when prompts change.

### What it misses

- **A and B are never tested.** They are frozen recordings. If comprehension or tool selection
  regresses, CI is blind — that is the point of memoization, but it means the LLM-dependent
  behavior we most care about has zero CI signal.
- **G is self-certifying.** `completedCriteria` is structured output produced by the LLM
  (`harness.ts` `OutputSchema`) and frozen into the snapshot. Replay re-reads the recording's own
  verdict; CI is not evaluating whether criteria were met.
- **C/D regressions surface as `No memoized conversation found`.** When an operation result
  changes, the next turn's prompt diverges from the recording and the match fails. A genuine bug
  is indistinguishable from a stale fixture or a reworded system prompt.
- **D is only ever exercised along one frozen path** — never branched (max-iterations, tool
  error, malformed output, early stop).
- **Brittle by construction.** Matching is exact structural equality over the entire prompt; any
  drift (reordered tool call, one-token id slide, changed system line, model/prompt edit) is a
  hard miss requiring full regeneration. See git history for the positional-placeholder
  `41 → 43` class of failures.
- **Operationally heavy.** 21 `*.conversations.json` files, several megabytes each (`crm-mailbox`
  ~5.4 MB), committed to git; the store appends and never prunes; per-file shared ID streams mean
  a single test cannot be regenerated in isolation.

Net: complex, brittle, and it gives a **false sense of security** — CI proves "the same frozen
path still replays," not "the agent comprehends, selects tools, and completes tasks correctly."

## What we should do

Test each dimension with the tool that fits its determinism and cost, and stop routing
deterministic code through a frozen LLM recording.

### Deterministic tiers (fast, offline, gate every PR)

- **C — operation unit tests.** Each operation gets ordinary unit tests with mocked services,
  like any other code. Some already exist (`run-instructions.test.ts`, `skill-resolution.test.ts`);
  extend to full coverage. Seed inputs with **golden tool-call args captured from the eval tier**
  so handlers are tested against args the real LLM actually produces, not idealized ones.
- **D — harness unit tests over a scripted `LanguageModel`.** Drive `AiSession.run` with a model
  that emits a fixed, scripted sequence of parts/tool-calls, and a fake toolkit. Cover every
  branch: tool-call → result → continue, clean stop, max-iterations, tool error propagation,
  malformed-output handling, persistence to the feed. The scripted-model primitive already exists
  in reduced form inside `MemoizedLanguageModel` — extract it (see plan).
- **E — context-assembly tests.** Snapshot the assembled prompt (system + skill instructions +
  bound objects) for representative inputs. Pure function of inputs; no model.
- **F — schema round-trip tests.** Assert tool JSON-schema generation and arg/result
  encode↔decode for each toolkit. Catches the "LLM emits args the handler can't decode" class
  without invoking the LLM.
- **G — code-side oracle.** Express completion as **assertions over observable effects** (ECHO
  database state, which tools were invoked, returned shapes), not a frozen LLM boolean.

### Non-deterministic tiers (graded, model-pinned, out-of-band, non-gating)

- **A + B + H — `@dxos/assistant-evals`.** The package already exists (`evalite` + `autoevals`,
  model-variant matrix, `createEvalRunner`). Grow it into the home for comprehension, tool
  selection/arg synthesis, and thin end-to-end composition:
  - **Scorers:** tool-match (did it call the expected tool), schema-validity (are args valid),
    DB-effect assertions (did the expected objects appear), and LLM-as-judge for open-ended
    quality. `basic.eval.ts` already carries a TODO for exactly this.
  - **Statistical, not binary:** report pass-rate ≥ threshold over N runs; the LLM variance is
    graded, not asserted away.
  - **Model-pinned** and run **on a schedule / on demand**, not on every PR. This relocates LLM
    cost and variance out of the gating path instead of freezing it.
  - **H (composition)** lives here too: a *small* number of true end-to-end scenarios (real model,
    real operations, real loop) so we retain coverage of the seams that isolated tiers miss.

### Why this is better

- Deterministic code is tested deterministically, in CI, with clear failures — no cache misses
  masquerading as bugs, no multi-MB fixtures, no coupled ID streams.
- The LLM-dependent behavior we care about (A/B/H) is actually *measured* over time instead of
  frozen and ignored.
- The oracle is explicit and trustworthy instead of self-certifying.

## Prioritized plan

Ordered by ROI and by the dependency that **coverage must never drop to zero** — deterministic
tiers and evals must exist before the memoized e2e suite is retired.

### Phase 1 — deterministic tiers (highest ROI, cheapest, fully in CI)

1. **Extract a scripted `LanguageModel` primitive** from `MemoizedLanguageModel` — "given this
   call, return these scripted parts/tool-calls" — decoupled from prompt-matching and file I/O.
   This is the substrate for D.
2. **Harness (D) unit tests** on the scripted model: all loop branches listed above.
3. **Operation (C) unit tests**: extend to full coverage; introduce the golden-args fixture
   convention.
4. **Context-assembly (E) and schema round-trip (F) tests.**
5. **Code-side oracle (G):** add DB-state / tool-invocation assertion helpers to the test harness.

### Phase 2 — grow `@dxos/assistant-evals` (A, B, H)

6. Add scorers (tool-match, schema-validity, DB-effect, LLM-judge) and datasets covering the
   comprehension / tool-selection scenarios currently implicit in the e2e suite.
7. Pin model versions; define pass-rate thresholds; wire a scheduled (nightly / on-demand) run
   distinct from PR CI.
8. Port the highest-value e2e scenarios into evals as **H** integration cases (real model, real
   operations), non-gating.

### Phase 3 — retire the memoized e2e framework

9. Once Phases 1–2 cover the paths, delete the `@dxos/assistant-e2e` memoized suite and its
   `*.conversations.json` fixtures (the bulk of the multi-MB weight).
10. **Scope the retirement carefully.** `MemoizedLanguageModel` and `*.conversations.json` are
    used by ~21 fixtures across many packages (`plugin-markdown`, `assistant-toolkit` skills,
    `agent-runtime`, …), not just `assistant-e2e`. Migrate those to the appropriate tier
    (deterministic → Phase 1 primitive; behavioral → evals) package by package. The memoization
    layer may survive in **reduced** form as the scripted-model primitive; the *strategy* of
    frozen full-conversation replay as primary coverage is what we retire.

### Non-goals / risks

- **Do not delete memoization before its consumers are migrated** — coverage would drop to zero.
- **Isolated tiers miss emergent bugs** across seams; the thin H integration eval (step 8) is the
  mitigation and must not be skipped.
- Evals still hit real models — cost and variance are relocated and graded, not eliminated; budget
  and schedule them accordingly.
