# AI testing strategy — design

## Purpose

Testing an AI conversation is hard because a single "e2e" run mixes concerns with wildly
different determinism and cost profiles: pure developer code that should be trivially unit-tested,
and LLM inference that is slow, costly, and non-deterministic. The current memoization approach
collapses all of them into one mechanism (`src/testing/memoization/MemoizedLanguageModel.ts`,
`*.conversations.json` snapshots) and pays for that conflation in brittleness and false confidence.

This document defines the **dimensions** of an AI conversation, records **what we do today** and
what it achieves vs. misses, describes **what we should do** (a tier per dimension), and gives a
**prioritized plan**, including retiring the memoized e2e framework. For how the current
memoization mechanism itself works, see [`DESIGN.md`](./DESIGN.md).

## Dimensions of an AI conversation

An agent turn factors into distinct concerns. The first four (A–D) are the ones we usually mean
by "the agent works"; the rest (E–H) are the seams a four-way split silently omits.

| Dim   | Concern                                                                                                                             | Owner                                           | Determinism       | Right tool                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------- | -------------------------- |
| **A** | **Comprehension** — interpret NL instructions                                                                                       | LLM                                             | Non-deterministic | Eval                       |
| **B** | **Tool selection & argument synthesis** — pick the tool, emit schema-valid JSON                                                     | LLM                                             | Non-deterministic | Eval                       |
| **C** | **Operation execution** — the tool handler runs                                                                                     | Developer code                                  | Deterministic     | Unit test                  |
| **D** | **Turn loop / harness** — feed tool results back, iterate to stop, max-iterations, error and malformed-output handling, persistence | Developer code (`AiSession.run`)                | Deterministic     | Unit test (scripted model) |
| **E** | **Context assembly** — system prompt + skill instructions + bound objects → the prompt the LLM sees                                 | Developer code                                  | Deterministic     | Unit test / snapshot       |
| **F** | **Schema & (de)serialization** — tool JSON-schema generation, argument decode, result encode                                        | Developer code                                  | Deterministic     | Unit test (round-trip)     |
| **G** | **Evaluation / grading** — did the run meet its criteria?                                                                           | Test oracle (must not be the system under test) | —                 | Assertion or graded scorer |
| **H** | **End-to-end composition** — emergent behavior across A–F on a realistic path                                                       | Whole system                                    | Non-deterministic | Thin integration eval      |

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
   (`@dxos/assistant-e2e`, deprecated — see "Consumer inventory" below) wraps a prompt as a test and
   checks structured `completedCriteria`.

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
- **E — context-assembly tests.** Assert that the prompt the model would see — system prompt +
  skill instructions + bound objects + tool descriptions, in order — is exactly what the assembly
  code (`formatSystemPrompt`, `AiPreprocessor.preprocessPrompt`) produces for representative inputs.
  It is a pure function of its inputs, so snapshot it: the assembled prompt is precisely the signal
  the memoized path buried inside a full recorded conversation. Catches skill/instruction wiring
  regressions — a skill silently dropped from the system prompt, objects not bound, tool blocks
  reordered — that never surface as a tool call and so are invisible to the A/B/D tiers. No model.
- **F — schema round-trip tests.** Assert tool JSON-schema generation and arg/result
  encode↔decode for each toolkit. Catches the "LLM emits args the handler can't decode" class
  without invoking the LLM.
- **G — code-side oracle.** Express completion as **assertions over observable effects** — ECHO
  database state, which tools were invoked and with what args, returned shapes — never a frozen LLM
  boolean. The oracle is **plain deterministic code**, and that is the point: pointed at a
  scripted-model run (C/D) its verdict is fully reproducible; pointed at a live-model run (A/B/H)
  the _same_ helper is still deterministic code but its input is not, so there it grades a
  distribution (pass-rate ≥ threshold) rather than asserting once. Ship the checks as shared
  assertion helpers (DB-effect, tool-invocation) usable from both tiers. Keeping the verdict out of
  the model is what stops a test from certifying itself.

### Non-deterministic tiers (graded, model-pinned, out-of-band, non-gating)

- **A + B + H — `@dxos/assistant-evals`.** `evalite`-scored evals in `src/evals/*.eval.ts`, run
  against a real model (`DX_ANTHROPIC_API_KEY`), for comprehension, tool selection/arg synthesis,
  and thin end-to-end composition:
  - **Scorers:** deterministic DB-effect and tool-invocation assertions (`src/assertions.ts` —
    `objectExists`/`findObject` for entity state, `toolInvocations` matched on a tool's stable
    `operationKey`) grade "did the expected effect happen"; an LLM judge (`src/judge.ts`, a native
    `@dxos/ai` call, not `autoevals`'s OpenAI-coupled classifiers) grades open-ended quality
    criteria a deterministic check can't express. Reach for the judge narrowly — only the specific
    criterion that needs a content judgment — and always pair it with a case that demonstrates it
    can fail; a judge that only ever passes is worthless as a scorer.
  - **Statistical, not binary:** report pass-rate ≥ threshold over N runs; the LLM variance is
    graded, not asserted away. Not wired up yet — see the plan below.
  - **Model-pinned** and run **on a schedule / on demand**, not on every PR — evalite is not part of
    any CI workflow. This relocates LLM cost and variance out of the gating path instead of
    freezing it.
  - **H (composition)** lives here too: a cross-plugin scenario needs the full
    `createComposerTestApp` harness wired across multiple plugins (e.g. crm-mailbox spans
    CRM+Mailbox+Markdown, planning spans the planning skill + task tools). That's a central,
    cross-cutting concern, so cross-plugin scenarios live in `@dxos/assistant-evals`.
    Single-plugin/skill scenarios (e.g. `plugin-markdown` create/update, `plugin-magazine`,
    `AiSummarizer`) belong instead **inside that plugin's own package**, importing
    `createEvalRunner` / the assertion helpers from `@dxos/assistant-evals` as a library
    dependency — it is not a dumping ground for every scenario regardless of scope.
  - The older memoized/live gated-test convention this replaced still exists as a separate,
    deprecated package, `@dxos/assistant-e2e` — see "Consumer inventory" below for what's left
    there and why.

### Why this is better

- Deterministic code is tested deterministically, in CI, with clear failures — no cache misses
  masquerading as bugs, no multi-MB fixtures, no coupled ID streams.
- The LLM-dependent behavior we care about (A/B/H) is actually _measured_ over time instead of
  frozen and ignored.
- The scorer is explicit and trustworthy instead of self-certifying.

## Consumer inventory & blast radius

Removing the memoized tests is not one action — the consumers have very different value, and the
analysis below drives the sequencing. Blast-radius facts:

- **Nothing imports `@dxos/assistant-e2e`** — it is a leaf test package, so removing it has zero
  compile/coverage impact anywhere else.
- The machinery (`MemoizedAiService` / `MemoizedLanguageModel`) is imported only by
  `assistant-e2e/harness.ts` and `ai/src/testing/test-layers.ts` (`TestAiService`). **`TestAiService`
  is the single seam** every other consumer goes through; keep it compiling and consumers are
  unaffected.

The consumers fall into three groups:

- **G1 — pure agent e2e (`@dxos/assistant-e2e`, deprecated):** all 6 original scenarios —
  `database`, `crm-mailbox`, `web-search`, `planning`, `markdown`, `smoke` — now have scored
  `evalite` evals in `@dxos/assistant-evals`'s `src/evals/*.eval.ts` instead, using the same
  `createComposerTestApp` harness, so the full-plugin-composition boot/wiring coverage carries
  over; their deterministic DB/tool-invocation grading is also strictly stronger than the old
  self-reported `completedCriteria`. `@dxos/assistant-e2e` retains `harness.ts` plus three
  scenarios not yet portable to an eval: `inbox-enable` (`describe.skip`, blocked on a real
  inbox-skill registry bug), `local-ai` (local Ollama model compatibility — `createEvalRunner` has
  no `inferenceProvider` option yet), `sandbox` (needs a live external `sandbox-service` worker, and
  `createEvalRunner` has no `randomEntityIds`/`sandbox`/`clientTypes` options yet). Each is marked
  with a `TODO(wittjosiah): Migrate to an eval` noting what's missing. Once those three are ported
  or dropped, `@dxos/assistant-e2e` can be removed entirely.
- **G2 — per-operation / skill (behavioral through the LLM):** `plugin-markdown` create/update,
  `plugin-magazine`, `plugin-assistant`, `assistant-toolkit` `run-instructions` + the `database`/
  `memory`/`planning`/`agent` skills, `AiSummarizer`. Carry **unique operation-level deterministic
  signal**; convert to mocked unit tests before deleting.
- **G3 — agent-runtime session:** `functions`, `AgentService`, `request`, `xml-response`. Closest
  to harness/loop (D) behavior; convert to scripted-model tests before deleting.

### Impact of removing each group

- **A/B/H/G signal:** none lost for any group — already frozen / self-certifying.
- **G1:** its deterministic C/D signal is almost entirely redundant with the eval ports, which
  reuse the same `createComposerTestApp` harness — retiring the gated tests drops no unique
  coverage, including the full-plugin **boot/wiring** path.
- **G2/G3:** deleting early **would** open real per-operation / per-loop gaps, because that
  deterministic signal is unique. De-gate them from PR CI now to stop the flakiness, then convert
  before deleting.

## Prioritized plan

Ordered by ROI. The guardrail is narrower than "never drop coverage": **behavioral (A/B/H)
coverage is already ~zero and safe to drop immediately; only the deterministic (C/D) signal must be
preserved — and it is cheap to recover (D is one scripted test; C is ordinary unit testing), so
recover it in the same change that removes the corresponding memoized tests rather than treating it
as a long migration.**

### Phase 1 — deterministic tiers (fast, offline, gates every PR)

G2/G3 memoized replay is already de-gated from PR CI (`runMemoizedTests()`, off by default; opt in
with `DX_RUN_LLM_TESTS=1` or `ALLOW_LLM_GENERATION=1` to regenerate). A scripted `LanguageModel`
primitive (`ai/src/testing/ScriptedLanguageModel.ts`) and harness (D) unit tests over it
(`agent-runtime/.../scripted-loop.test.ts`, `assistant/.../AiRequest.test.ts`) cover the loop
branches — tool-call → result → continue, clean stop, tool error, malformed output — without a
live model. Remaining:

1. **Operation (C) unit tests**: convert G2 to deterministic mocked unit tests; introduce a
   golden-args fixture convention (seed handler tests with tool-call args captured from the eval
   tier, not idealized ones). Delete each G2 fixture only once its unit test lands.
2. **Context-assembly (E) and schema round-trip (F) tests.** E: snapshot the assembled prompt
   (system + skill instructions + bound objects + tool descriptions) for representative inputs — a
   pure function of inputs, no model — so skill/instruction wiring regressions surface as a prompt
   diff instead of a buried cache miss. F: assert tool JSON-schema generation and arg/result
   encode↔decode per toolkit, catching the "LLM emits args the handler can't decode" class offline.

### Phase 2 — grow `@dxos/assistant-evals` (A, B, H)

DB-effect, tool-invocation, and LLM-judge scorers exist (see "Non-deterministic tiers" above), and
all 6 cross-plugin scenarios are ported as H integration cases, non-gating. Remaining:

3. **More scorers and datasets:** a schema-validity scorer; broader datasets for comprehension /
   tool-selection.
4. **Prefer realistic user prompts over naming which skill to enable.** Several evals still name
   the skill explicitly because doing so exposed unrelated scorer strictness issues instead of a
   real comprehension gap — e.g. an exact-match check rejecting a more-complete-but-not-wrong
   field, or a tool-count check that doesn't budget for legitimate skill-discovery calls. Fix the
   scorer in each case, then drop the explicit mention and re-verify live.
5. **Pin model versions; define pass-rate thresholds; wire a scheduled (nightly / on-demand) run**
   for `@dxos/assistant-evals`, distinct from PR CI.

### Phase 3 — finish migration & reduce the machinery

6. Convert G3 (agent-runtime session) fixtures to scripted-model (D) tests, then delete them.
7. Once no consumer depends on frozen-conversation replay, reduce the memoization layer to the
   scripted-model primitive and drop the prompt-matching / canonicalization / closest-match code
   and `memoization.test.ts`'s dynamic-value suite. `TestAiService` remains the seam.

### Non-goals / risks

- **Behavioral coverage is already ~zero** (A/B frozen, G self-certifying), so removing memoized
  tests loses no behavioral signal. What must not drop is the **deterministic (C/D)** signal,
  recovered per group in the same change that removes its tests (G2 → C unit tests; G3 → D tests).
- **G2/G3 must be converted before their fixtures are deleted** — their deterministic signal is
  unique, unlike G1's.
- **Isolated tiers miss emergent bugs** across seams; the thin H integration evals are the
  mitigation and must not be skipped.
- Evals still hit real models — cost and variance are relocated and graded, not eliminated; budget
  and schedule them accordingly.
