---
name: agent-eval-tests
description: Use when writing, editing, or reviewing evalite-scored agent evals in packages/core/compute/assistant-evals/src/evals. Use when creating new eval files, adding deterministic assertions or an LLM-judge scorer, or fixing a failing/mis-scoring eval.
---

# Agent Eval Tests

## Overview

Evals verify assistant behavior by running a real prompt against the full agent stack, live, then
grading the outcome with a **Scorer** — code that checks the real DB/tool-invocation effect
(deterministic, "dimension G") or an LLM judge for open-ended quality ("dimensions A/B/H"). This
supersedes trusting the agent's own self-reported `completedCriteria`.

Package: `packages/core/compute/assistant-evals`. Library: `src/runner.ts` (`createEvalRunner`),
`src/Scorer.ts` (the scorer constructors), `src/assertions.ts` (deterministic helpers),
`src/judge.ts` (LLM-judge helper). Evals live in
`src/evals/*.eval.ts`. See `packages/core/compute/ai/TESTING.md` for how this package is scoped
(cross-plugin scenarios live here; single-plugin scenarios belong in their own plugin package,
importing this library). The older memoized/live gated agent-e2e harness is a separate, deprecated
package, `@dxos/assistant-e2e` — not covered by this skill; see its own README.

## Eval File Structure

```typescript
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Filter, Query } from '@dxos/echo';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { createEvalRunner } from '../runner';
import * as Scorer from '../Scorer';

const ORGANIZATION_NAME = 'Cyberdyne Systems';

const SCORERS = [
  Scorer.database({
    name: 'organization-created',
    description: 'The named Organization object exists in the DB after the run.',
    query: Query.select(Filter.type(Organization.Organization)),
    score: (organizations) => organizations.some((org) => org.name === ORGANIZATION_NAME),
  }),
];

const task = createEvalRunner({
  instructions: trim`
    Create a new organization called "{{name}}".
  `,
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Unknown,
  scored: true,
});

evalite('Descriptive scenario name', {
  data: [{ input: { name: ORGANIZATION_NAME } }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
```

`createEvalRunner` boots a full Composer test harness, invokes the prompt, and — with `scored: true`
— keeps the space **open past the task**, returning `{ runId, agentOutput, durationMillis }` instead
of the bare agent output. The scorers then run on the evalite side, against that live space; the
harness is disposed by an `afterAll` the runner registers, once every row of the eval has been
graded. Model precedence:
`variant.model` → `options.model` → `com.anthropic.model.claude-opus-5.default`.

### Scorers (`../Scorer.ts`)

Each scorer is **self-contained**: `score` is a single `Effect<number | boolean, _, Scorer.Services>`
that reads whatever it needs of the open run and returns the mark for it. Reading and judging are one
step, so a dimension can be read, moved or deleted without touching anything else.

- **`Scorer.make({ name, description?, score })`** — the general case; `score` is the effect.
- **`Scorer.database({ name, query, score })`** — `query` is an ECHO `Query`; `score` is a plain
  function over its results.
- **`Scorer.toolCalls({ name, score })`** — `score` is a plain function over the run's
  `ToolInvocation[]` (`Scorer.invocations` is the same effect, for composing into a larger one).
- **`Scorer.duration({ name, targetMinutes, budgetMinutes, delivered })`** — grades the session's
  wall clock, gated on `delivered` (an effect) proving the run produced the thing being timed.
  `Scorer.Run` is the service carrying `durationMillis` for a scorer that wants it directly.
- **`Scorer.shared(effect)`** — wrap a query several dimensions read so the run pays for it once.
  Name it at module level and `.pipe(Effect.map(…))` it per scorer; a judge call belongs behind one
  of these.

A fraction is clamped to `[0, 1]`; a boolean is one mark or none. A scorer that fails scores nothing
and reports why rather than failing the row. `Scorer.toEvalite(SCORERS)` turns the same list into the
evalite scorers, so a dimension is declared once and wired once.

### `createEvalRunner` options

- `instructions` / `input` / `output` — the prompt (supports `{{field}}` templating from `input`)
  and its Effect Schemas.
- `skills` — defaults to `getDefaultSkills()` (`SkillManagerSkill` + `DatabaseSkill`); pass `[]` for
  scenarios that need no tools (e.g. smoke), or a custom `Ref.make(SomeSkill.make())[]`.
- `plugins` — extra plugins beyond the default `ClientPlugin`/`AssistantPlugin`/`RoutinePlugin`/
  `InboxPlugin` set (e.g. `MarkdownPlugin()`, `CrmPlugin()`).
- `sessionChat: true` — provisions a `Chat` on the session feed. Required whenever a skill's tool
  resolves context via `Chat.getFromContext` (e.g. planning's `update-tasks` — its plan lives at
  `Chat.plan`); omitting it when needed fails with a context-resolution error, not a clear one.
- `expect: 'failure'` — inverts success semantics for scenarios that assert the agent correctly
  fails. The task resolves `{ failed: boolean }` instead of throwing, so a scorer can grade "failed
  as instructed" as a pass. Internally runs via `Effect.runPromiseExit` instead of
  `EffectEx.runAndForwardErrors`. A timeout is never treated as this kind of failure — it always
  throws, even here.
- `timeout` — milliseconds before the run is aborted, default `60_000`. evalite has no
  per-scenario timeout of its own; this is what actually bounds each eval (`vitest.config.ts`'s
  `testTimeout` is just the outer safety net). Raise it only for scenarios with more tool
  round-trips than a typical eval — e.g. `crm-mailbox.eval.ts`/`planning.eval.ts` use `150_000`.
- `scored: true` — keeps the space open past the task so the eval's scorers can query it; see
  Scorers above. Leave it unset for an eval graded from the agent's output alone (`basic`, `smoke`).

### Driving a real Claude Code subprocess (`../claude-harness.ts`)

For a scenario about this repo's **MCP surface** rather than about the in-process assistant:
`runClaudeEval({ skills, plugins, types, seed }, async ({ send, query, spaceId }) => …)` boots a
Composer harness, serves those `Skill.Definition`s over a real MCP Streamable HTTP server inside the
eval process (`../mcp-host.ts`), and spawns a real `claude` subprocess wired to it with only that
server's tools allowed — no Bash, no file tools, so a prompt the surface cannot satisfy fails.

- `send(prompt)` runs one agent turn and resolves with `{ result, isError, toolCalls }`.
- `query(effect)` runs a query in the harness's own runtime, outside the agent: that separation is
  the point, and running it _between_ turns is what proves a write landed at the stage the eval
  claims rather than at the end.
- Needs `DX_ANTHROPIC_API_KEY` and a `claude` binary on PATH; `DX_EVAL_CLAUDE_MODEL` overrides the
  model (default `sonnet`).
- `score(scorers)` grades a list in the same harness; a staged run records what each turn
  established and the scorers read it back — see `src/evals/mcp-server.eval.ts`, whose subprocess-server counterpart is the CLI's
  `mcp/agent-e2e.test.ts` (a real Claude Code against `dx mcp serve`).
- `src/mcp-host.test.ts` covers the server itself deterministically and offline, with no model.

### Assertions (`../assertions.ts`)

All are `Effect<_, _, Database.Service>` — compose freely inside a scorer's `score`:

- **`objectExists(type, predicate)`** / **`findObject(type, predicate)`** — query the DB for a
  matching entity (object or relation). `findObject` returns the match itself (e.g. to load a
  `Ref` field off it, or inspect a relation's fields); `objectExists` just a boolean.
- For relations, resolve the endpoints with `Relation.getSource(rel)` / `Relation.getTarget(rel)`
  (from `@dxos/echo`) — synchronous, no load needed.
- **`completedBlocks()`** — every `CompleteBlock` event off the space's trace feed, in order, as
  `{ role, block }`. This is how you check the assistant's actual chat text (filter
  `block._tag === 'text' && role === 'assistant'`) without trusting the agent's self-report.
- **`toolInvocations()`** — built on `completedBlocks()`; pairs `toolCall`/`toolResult` blocks by
  `toolCallId` into `{ name, operationKey?, input, result?, error? }`. Use `operationKey` (a stable
  `dxn:org.dxos.function.*` string) to match a specific Operation-backed tool — **not** `name`,
  which is a display/toolkit name that varies (see Gotchas). Absent `operationKey` means the tool
  isn't Operation-backed (provider-defined tools like Anthropic's web search, MCP tools).

### LLM-judge scorer (`../judge.ts`)

For criteria a deterministic check can't grade (open-ended quality, e.g. "is this a well-formed
haiku about X"):

```typescript
import { judge } from '../judge';

const rubric = 'Does the text contain a well-formed 3-line poem about spring rain? Pass only if...';

function* example() {
  const verdict = yield* judge(rubric, assistantText);
  // verdict: { pass: boolean, reasoning: string }
}
```

`judge()` calls `@dxos/ai`'s `LanguageModel.generateObject` directly (Anthropic, via the same
`DX_ANTHROPIC_API_KEY`-backed access `runner.ts` uses) with a schema-typed `{ pass, reasoning }`
response — no free-text/regex JSON parsing. Uses `claude-haiku-4-5` (grading is classification, not
generation; a fast/cheap model is enough).

**Deliberately does not use `autoevals`'s built-in LLM-judge classifiers** (`Factuality`,
`ClosedQA`, `Battle`, etc., already a dependency, used for `Levenshtein` in `basic.eval.ts`) — those
are hardcoded to an OpenAI-shaped client; using them here would need a separate OpenAI API key or
routing through Braintrust's proxy, neither of which this repo has wired up.

**Use narrowly.** A judge is non-deterministic and costs a real model call every run. Reach for it
only for the specific criterion that needs a content judgment, never as a blanket replacement for a
deterministic check that already exists — and when you add one, also demonstrate it can fail (a
judge that only ever passes is worthless as a scorer). See `planning.eval.ts` for the pattern: one
judge call behind one scorer's `score` for the real scenario's haiku-quality criterion, plus a second
`evalite()` case in the same file feeding the same rubric a hand-crafted bad transcript, asserting
`pass === false`. Don't build a separate meta-test file for the judge mechanism itself, and don't
convert every eval's checks to judges just because one exists — most criteria in this package
should stay deterministic.

## Running Evals

Requires a real `DX_ANTHROPIC_API_KEY`. Not part of `Check`: the whole suite runs nightly in the
`Assistant evals` workflow (`.depot/workflows/assistant-evals.yml`), which trends every score in
the "Assistant evals" PostHog dashboard. On a PR, run the scenario you touched by hand.

```bash
# Whole suite
export DX_ANTHROPIC_API_KEY=...
moon run assistant-evals:evals

# Single file — the passthrough replaces the directory
moon run assistant-evals:evals -- src/evals/database.eval.ts
```

In this repo, pull the key from the 1Password `CI` vault rather than exporting it manually:

```bash
eval "$(pnpm -ws 1p-credentials)"
moon run assistant-evals:evals -- src/evals/planning.eval.ts
```

## Gotchas (found the hard way — real debugging sessions, not speculation)

| Symptom                                                                                 | Cause                                                                                                                                                                                              | Fix                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TypeError: Cannot read properties of undefined (reading 'meta')` before any model call | evalite's flat `vitest.config.ts` must include `'#*'` in `PluginImportSource`'s include list, or Node subpath imports resolve to a stale compiled `dist/` bundle instead of `src/`.                | Keep `PluginImportSource({ include: ['@dxos/**', '#*'] })` in `vitest.config.ts`. Don't remove it.                                                                                    |
| `NOT NULL constraint failed: results.output`                                            | The task returned (or resolved to) `undefined` — e.g. `completeJob` called with no `success` payload when no output schema was requested. evalite's SQLite storage rejects it.                     | Coerce in the eval file (`(await runner(...)) ?? {}`), not in `runner.ts`'s general contract.                                                                                         |
| A multi-tool scenario times out around 60s                                              | That's `createEvalRunner`'s per-eval default (`timeout` option), not evalite's own 30s default or `vitest.config.ts`'s `testTimeout` — those are a fallback and an outer safety net, respectively. | Pass an explicit `timeout` (ms) to `createEvalRunner` for that scenario, not a global config bump — see options below.                                                                |
| A tool-name/`operationKey` check that should obviously match doesn't                    | Recorded names aren't always what you'd guess: web-search's toolkit name is `'AnthropicWebSearch'`, not `'web_search'`; planning's `operationKey` has a `'dxn:'` prefix.                           | Don't guess twice — inspect `node_modules/.evalite/cache.sqlite`'s `results` table directly (`SELECT output FROM results ORDER BY id DESC LIMIT 1`) to see the actual recorded value. |

## Common Mistakes

| Mistake                                                           | Fix                                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Adding a judge for a criterion a deterministic scorer could grade | Reach for `judge()` only when the criterion is a genuine content/quality judgment.                                  |
| A judge with no demonstrated failure case                         | Add a case (in the same eval file) proving it can fail, using a hand-crafted bad input.                             |
| Matching a tool by `name` instead of `operationKey`               | `name` is a display/toolkit name and varies; `operationKey` is the stable match target.                             |
| Guessing a tool name/operationKey string instead of checking      | Add a temp scorer whose query returns the invocations, run once, inspect `cache.sqlite`, fix, remove it.            |
| Forgetting `sessionChat: true` for a chat-scoped skill's tool     | Symptom is a context-resolution error, not "no chat found" — check the skill's operation for `Chat.getFromContext`. |
| Assuming pre-seeded data without saying so in the prompt          | State the DB starts empty; seed via the database skill's tools at the start of the prompt.                          |
| Pasting entire eval files in chat when structure is standard      | Point at the file + line range instead.                                                                             |
