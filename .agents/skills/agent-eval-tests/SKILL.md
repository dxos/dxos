---
name: agent-eval-tests
description: Use when writing, editing, or reviewing evalite-scored agent evals in packages/core/compute/assistant-evals/src/evals. Use when creating new eval files, adding deterministic assertions or an LLM-judge scorer, or fixing a failing/mis-scoring eval. Also covers the legacy gated e2e vitest tests in src/testing/.
---

# Agent Eval Tests

## Overview

Evals verify assistant behavior by running a real prompt against the full agent stack, live, then
grading the outcome with a **Scorer** — code that checks the real DB/tool-invocation effect
(deterministic, "dimension G") or an LLM judge for open-ended quality ("dimensions A/B/H"). This
supersedes trusting the agent's own self-reported `completedCriteria`.

Package: `packages/core/compute/assistant-evals`. Library: `src/runner.ts` (`createEvalRunner`),
`src/assertions.ts` (deterministic helpers), `src/judge.ts` (LLM-judge helper). Evals live in
`src/evals/*.eval.ts`. See `packages/core/compute/ai/TESTING.md` § "Where evals live" for how this
package is scoped (cross-plugin scenarios live here; single-plugin scenarios belong in their own
plugin package, importing this library).

## Eval File Structure

```typescript
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { objectExists } from '../assertions';
import { createEvalRunner } from '../runner';

const task = createEvalRunner({
  instructions: trim`
    Create a new organization called "{{name}}".
  `,
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Unknown,
  dbQuery: ({ name }) => objectExists(Organization.Organization, (org) => org.name === name),
});

evalite('Descriptive scenario name', {
  data: [{ input: { name: 'Cyberdyne Systems' } }],
  task,
  scorers: [
    {
      name: 'organization-created',
      description: 'The named Organization object exists in the DB after the run.',
      scorer: ({ output }) => (output.dbQuery ? 1 : 0),
    },
  ],
});
```

`createEvalRunner` boots a full Composer test harness, invokes the prompt, and — when `dbQuery` is
passed — runs a deterministic assertion **while the space is still open**, returning
`{ agentOutput, dbQuery }` instead of the bare agent output. Model precedence:
`variant.model` → `options.model` → `com.anthropic.model.claude-opus-4-8.default`.

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
  `EffectEx.runAndForwardErrors`.
- `dbQuery: (input, spaceId) => Effect<D, unknown, Database.Service>` — see Assertions below.

### Assertions (`../assertions.ts`)

All are `Effect<_, _, Database.Service>` — compose freely inside a `dbQuery`'s `Effect.gen`:

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
`dbQuery`-embedded judge call for the real scenario's haiku-quality criterion, plus a second
`evalite()` case in the same file feeding the same rubric a hand-crafted bad transcript, asserting
`pass === false`. Don't build a separate meta-test file for the judge mechanism itself, and don't
convert every eval's checks to judges just because one exists — most criteria in this package
should stay deterministic.

## Running Evals

Requires a real `DX_ANTHROPIC_API_KEY` — never run in CI (evalite isn't in any CI workflow; see
`.github/workflows/check.yml`), manual/on-demand only for now.

```bash
# Whole suite
export DX_ANTHROPIC_API_KEY=...
moon run assistant-evals:evals

# Single file — the moon task hardcodes `args: [src/evals]`, so passing another arg through
# `moon run ... -- <file>` errors ("Too many arguments"). Bypass moon:
cd packages/core/compute/assistant-evals
npx evalite run src/evals/database.eval.ts
```

In this repo, pull the key from the CI Vault via 1Password rather than exporting it manually:

```bash
op run --account braneframe --env-file=.config/.env.1password -- npx evalite run src/evals/planning.eval.ts
```

## Gotchas (found the hard way — real debugging sessions, not speculation)

| Symptom                                                                                            | Cause                                                                                                                                                                                                                                                            | Fix                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TypeError: Cannot read properties of undefined (reading 'meta')` before any model call            | evalite's flat `vitest.config.ts` must include `'#*'` in `PluginImportSource`'s include list (matching `vitest.e2e.config.ts`'s `createNodeProject`), or Node subpath imports resolve to a stale compiled `dist/` bundle instead of `src/`.                      | Keep `PluginImportSource({ include: ['@dxos/**', '#*'] })` in `vitest.config.ts`. Don't remove it.                                                                                                    |
| `NOT NULL constraint failed: results.output`                                                       | The task returned (or resolved to) `undefined` — e.g. `completeJob` called with no `success` payload when no output schema was requested. evalite's SQLite storage rejects it.                                                                                   | Coerce in the eval file (`(await runner(...)) ?? {}`), not in `runner.ts`'s general contract.                                                                                                         |
| Eval times out at exactly 30s                                                                      | evalite defaults `config.test.testTimeout ??= 30_000` unless vitest config overrides it. Multi-tool scenarios (research, several operations) routinely exceed this.                                                                                              | `vitest.config.ts`'s `test.testTimeout` (currently `360_000`) already covers this — don't remove it.                                                                                                  |
| A tool-name/`operationKey` check that should obviously match doesn't                               | Recorded names aren't always what you'd guess: web-search's toolkit name is `'AnthropicWebSearch'`, not `'web_search'`; planning's `operationKey` has a `'dxn:'` prefix.                                                                                         | Don't guess twice — inspect `node_modules/.evalite/cache.sqlite`'s `results` table directly (`SELECT output FROM results ORDER BY id DESC LIMIT 1`) to see the actual recorded value.                 |
| Considering merging `vitest.config.ts` and `vitest.e2e.config.ts` into one `projects`-based config | Tested directly: defining `test.projects` at all breaks evalite's file discovery unless a project explicitly matches `.eval.?(m)ts`; even then, that project doesn't inherit root-level `plugins`/`testTimeout` — silently reopens the registry-sync race above. | Keep the two-file split. Don't rename `vitest.config.ts` either — evalite has no `--config` flag and relies on vite's default-name config resolution; a renamed file's settings are silently dropped. |

## Legacy: Gated E2E Vitest Tests (`src/testing/*.test.ts`)

The original memoized/live agent-e2e harness (formerly `@dxos/assistant-e2e`, merged into this
package). Kept gated in place rather than deleted (per `packages/core/compute/ai/TESTING.md`) —
still a valid opt-in live-test path and design inspiration, but new coverage should generally be an
eval (above), not a new file here.

Every test file is **only a prompt** — no setup code, no assertions, no manual DB manipulation:

```typescript
import { describe, it } from '@effect/vitest';

import { runMemoizedTests } from '@dxos/ai/testing';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout, getDefaultSkills } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe.skipIf(!runMemoizedTests())('DescriptiveName', () => {
  it.effect(
    'short test name',
    agentTest({
      instructions: trim`
        Your prompt here.

        Completion criteria:
        - Expected outcome 1.
      `,
      skills: getDefaultSkills(),
    }),
    { timeout: agentTestTimeout() },
  );
});
```

Rules: `Obj.ID.dangerouslyDisableRandomness()` at module scope before `describe`; always
`{ timeout: agentTestTimeout() }`; the agent starts with an **empty database** — instruct it to
create any required data; `expect: 'failure'` in the options object to test that the agent
correctly reports failure.

```bash
# Replay from memoized conversations
DX_RUN_LLM_TESTS=1 moon run assistant-evals:test

# Generate new conversations (requires credentials)
ALLOW_LLM_GENERATION=1 moon run assistant-evals:test -- src/testing/database.test.ts
```

## Common Mistakes

| Mistake                                                       | Fix                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Adding a judge for a criterion a `dbQuery` check could grade  | Reach for `judge()` only when the criterion is a genuine content/quality judgment.                                  |
| A judge with no demonstrated failure case                     | Add a case (in the same eval file) proving it can fail, using a hand-crafted bad input.                             |
| Matching a tool by `name` instead of `operationKey`           | `name` is a display/toolkit name and varies; `operationKey` is the stable match target.                             |
| Guessing a tool name/operationKey string instead of checking  | Add a temp debug field to the `dbQuery` output, run once, inspect `cache.sqlite`, fix, remove the debug field.      |
| Forgetting `sessionChat: true` for a chat-scoped skill's tool | Symptom is a context-resolution error, not "no chat found" — check the skill's operation for `Chat.getFromContext`. |
| Assuming pre-seeded data without saying so in the prompt      | State the DB starts empty; seed via the database skill's tools at the start of the prompt.                          |
| Pasting entire eval files in chat when structure is standard  | Point at the file + line range instead.                                                                             |
