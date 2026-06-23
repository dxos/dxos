---
name: testing-assistant-conversations
description: Test assistant conversations, agents, and skills using AssistantTestLayer, Effect/vitest, ECHO types, and memoized LLM fixtures. Use when writing or fixing assistant-toolkit tests, skill.operation tests, AiSession flows, or when CI fails on missing memoized conversations.
---

# Testing assistant conversations, agents, and skills

This guide matches patterns in `packages/core/assistant-toolkit` and related packages (`assistant`, `plugin-markdown`, `plugin-assistant`). For **regenerating** `*.conversations.json` only, prefer the focused skill `regenerate-memoized-llm`.

## AssistantTestLayer

Import from `@dxos/assistant/testing`.

`AssistantTestLayer` composes:

- **AI** — `TestAiService` (memoized by default; see below), default model `ai.claude.model.claude-opus-4-6`.
- **Tool execution** — `ToolExecutionServices` and `OpaqueToolkit.providerLayer`.
- **Skill registry** — `Skill.RegistryService` seeded with optional `skills`.
- **Operations** — `operationHandlers` passed to `OperationHandlerSet.provide(...)`; `ProcessManager` wires `Operation.Service` for tool execution (see `AssistantTestLayer` in `packages/core/assistant/src/testing/layer.ts`).
- **ECHO test DB** — `TestDatabaseLayer` with `types` you register.
- **Credentials** — `CredentialsService.configuredLayer(credentials)` (often `[]` in tests).
- **Tracing** — `noop` | `console` | `pretty`.

Use **`AssistantTestLayerWithTriggers`** when the scenario uses scheduled triggers (manual time control, in-memory trigger state). Example: `packages/core/assistant-toolkit/src/skills/project/skill.test.ts`.

### Important options

| Option                        | Role                                                                                                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operationHandlers`           | `OperationHandlerSet` (or merged sets) registered via `OperationHandlerSet.provide` so `Operation.invoke` resolves your operations.                                                                                                                                       |
| `types`                       | Every ECHO entity type the test creates or queries (`Skill.Skill`, plugin types, `Message.Message`, etc.). Missing types break DB/schema expectations.                                                                                                                    |
| `skills`                      | Optional registry seed when code reads skills from `Skill.RegistryService` instead of only binding at runtime.                                                                                                                                                            |
| `toolkits`                    | Extra toolkits (e.g. `OpaqueToolkit.make(WebSearchToolkit, Layer.empty)`).                                                                                                                                                                                                |
| `aiServicePreset`             | `'direct'` \| `'edge-local'` \| `'edge-remote'` — where real LLM calls go when generation is allowed. Defaults to `'direct'`, which calls Anthropic directly using the `DX_ANTHROPIC_API_KEY` env var (set it for cache regeneration; not needed for normal cached runs). |
| `tracing: 'pretty'`           | Useful locally to see tool traces.                                                                                                                                                                                                                                        |
| `disableLlmMemoization: true` | Skips memo wrapper; use only when you fully stub `AiService` / `LanguageModel` and do not need recorded conversations.                                                                                                                                                    |

Implementation reference: `packages/core/assistant/src/testing/layer.ts`.

## Model memoization and `ALLOW_LLM_GENERATION`

`AssistantTestLayer` includes memoization internally — you do **not** need to set up `MemoizedAiService` yourself. The layer wraps the AI service with `MemoizedAiService.layerTest` automatically (unless `disableLlmMemoization: true`).

Default test AI goes through **`MemoizedAiService.layerTest`**, which:

- Writes/reads **`<test-file>.conversations.json`** next to the test (path from `TestContextService`).
- **Without** `ALLOW_LLM_GENERATION`: replays only; **missing** matching prompt → error telling you to regenerate.
- **With** `ALLOW_LLM_GENERATION=1` (or `true`): calls the real model when no match exists and **updates** the JSON.

CI stays deterministic because it uses committed fixtures, not live LLM calls.

### Requirements for regeneration

1. **Credentials** — API keys must be in the environment. In this repo, load 1Password-injected env from the workspace root:
   - **fish:** `eval (pnpm -ws 1p-credentials)`
   - **bash/zsh:** `eval "$(pnpm -ws 1p-credentials)"`

   The script is the `1p-credentials` package script (runs `op inject` against `.env.1password`).

2. **Run tests with generation:**

   ```bash
   ALLOW_LLM_GENERATION=1 moon run assistant-toolkit:test
   ```

   Or all memoized-LLM packages: `ALLOW_LLM_GENERATION=1 moon run '#memoized-llm:test'`.

3. **Commit** updated `*.conversations.json` files.

Packages that participate are tagged **`memoized-llm`** in their `moon.yml` (e.g. `assistant-toolkit`, `assistant`, `ai`, `plugin-markdown`, `plugin-assistant`).

### Timeouts

LLM conversation tests should use a longer timeout to account for generation. Pattern: `{ timeout: 60_000 }` or `MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000`. Note that `MemoizedAiService` is only needed as an import for the timeout helper — the layer already handles memoization internally.

### `TestHelpers.provideTestContext`

Effects that use memoization **must** end with **`TestHelpers.provideTestContext`** (from `@dxos/effect/testing`) so the memo layer knows the current test file path. Typical pipe:

`Effect.fnUntraced(..., Effect.provide(TestLayer), TestHelpers.provideTestContext)`.

### Real LLM calls and `DX_ANTHROPIC_API_KEY`

The default `aiServicePreset: 'direct'` calls the Anthropic API directly. Set `DX_ANTHROPIC_API_KEY`
(via `pnpm -ws 1p-credentials` or `export DX_ANTHROPIC_API_KEY=sk-ant-...`) when regenerating the
memoized cache with `ALLOW_LLM_GENERATION=1`. Use `DX_ANTHROPIC_API_KEY`, not `ANTHROPIC_API_KEY`
(the latter breaks Claude Code). Normal cached runs need no key. Works for both direct operation
invocations and full conversation tests. Example: `packages/core/assistant-toolkit/src/skills/skill-manager/skill.test.ts`.

## General test structure

### Vitest + Effect

Use `@effect/vitest` (`describe`, `it.effect`, `it.scoped`) and `Effect.fnUntraced` for generator bodies.

### Determinism

Many tests call **`EntityId.dangerouslyDisableRandomness()`** at module scope for stable IDs. The PRNG is **shared across all tests in the same file** — memos and fixtures that embed object IDs only match when tests run in file order. When regenerating memoized LLM cache, never use vitest `-t` for a single test; regenerate the whole test file (see `regenerate-memoized-llm` skill).

### Database and invocation flow

1. `yield* Database.add(...)` / `Obj.make(...)` for fixtures.
2. `yield* Database.flush()` before invoking functions or conversations that read persisted state.
3. Call **`Operation.invoke(Operation, input)`** for direct operation tests, or **`AiSessionService.run`**, **`new AiSession`**, **`AiRequest`**, etc., depending on the layer under test.

### Registering skills in tests

Two common patterns:

1. **Registry at layer build** — pass `skills: [SomeSkill.make(), ...]` into `AssistantTestLayer` when services read from the registry.

2. **Runtime bind** — `addSkills` from `packages/core/assistant-toolkit/src/skills/testing.ts` loads definition `make()` objects into the DB and calls `AiContextService.bindContext({ skills: [...] })`. Used with `AiSessionService.layerNewFeed().pipe(Layer.provideMerge(TestLayer))` in memory skill tests.

You still pass the skill’s **`operations`** (handler set) into `AssistantTestLayer({ operationHandlers: ... })` so tools actually execute.

### Types list

Include every ECHO type instances may have: skill metadata types, domain objects (`Message`, `Person`, plugin documents), `Skill.Skill`, `Trigger.Trigger`, queues, etc. If in doubt, mirror imports from a similar test in the same skill folder.

## Quick checklist

- [ ] `AssistantTestLayer` (or WithTriggers) with correct `operationHandlers` and `types`.
- [ ] `Effect.provide(TestLayer)` + `TestHelpers.provideTestContext` for memoized LLM tests.
- [ ] New/changed prompts → regenerate with `ALLOW_LLM_GENERATION=1` + `1p-credentials`, commit `*.conversations.json`.
- [ ] Package has `memoized-llm` tag if tests use memoization (for CI grouping).
