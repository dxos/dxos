---
name: testing-assistant-conversations
description: Test assistant conversations, agents, and blueprints using AssistantTestLayer, Effect/vitest, ECHO types, and memoized LLM fixtures. Use when writing or fixing assistant-toolkit tests, blueprint.operation tests, AiConversation flows, or when CI fails on missing memoized conversations.
---

# Testing assistant conversations, agents, and blueprints

This guide matches patterns in `packages/core/assistant-toolkit` and related packages (`assistant`, `plugin-markdown`, `plugin-assistant`). For **regenerating** `*.conversations.json` only, prefer the focused skill `regenerate-memoized-llm`.

## AssistantTestLayer

Import from `@dxos/assistant/testing`.

`AssistantTestLayer` composes:

- **AI** — `TestAiService` (memoized by default; see below), default model `@anthropic/claude-opus-4-6`.
- **Tool execution** — `ToolExecutionServices` and `GenericToolkit.providerLayer`.
- **Blueprint registry** — `Blueprint.RegistryService` seeded with optional `blueprints`.
- **Functions** — `FunctionInvocationServiceLayerTest` with your `operationHandlers`.
- **ECHO test DB** — `TestDatabaseLayer` with `types` you register.
- **Credentials** — `CredentialsService.configuredLayer(credentials)` (often `[]` in tests).
- **Tracing** — `noop` | `console` | `pretty`.

Use **`AssistantTestLayerWithTriggers`** when the scenario uses scheduled triggers (manual time control, in-memory trigger state). Example: `packages/core/assistant-toolkit/src/blueprints/project/blueprint.test.ts`.

### Important options

| Option                        | Role                                                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operationHandlers`           | `OperationHandlerSet` (or merged sets) so `FunctionInvocationService.invokeFunction` resolves your operations.                                                                                                          |
| `types`                       | Every ECHO entity type the test creates or queries (`Blueprint.Blueprint`, plugin types, `Message.Message`, etc.). Missing types break DB/schema expectations.                                                          |
| `blueprints`                  | Optional registry seed when code reads blueprints from `Blueprint.RegistryService` instead of only binding at runtime.                                                                                                  |
| `toolkits`                    | Extra toolkits (e.g. `GenericToolkit.make(WebSearchToolkit, Layer.empty)`).                                                                                                                                             |
| `aiServicePreset`             | `'direct'` \| `'edge-local'` \| `'edge-remote'` — where real LLM calls go when generation is allowed. Use `'edge-remote'` to route LLM calls through the DXOS Edge service so no Anthropic API key is required locally. |
| `tracing: 'pretty'`           | Useful locally to see tool traces.                                                                                                                                                                                      |
| `disableLlmMemoization: true` | Skips memo wrapper; use only when you fully stub `AiService` / `LanguageModel` and do not need recorded conversations.                                                                                                  |

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

### Using `edge-remote` to avoid local API keys

Set `aiServicePreset: 'edge-remote'` to route LLM calls through the DXOS Edge service instead of calling Anthropic directly. This means no local Anthropic API key is required. Works for both direct operation invocations and full conversation tests. Example: `packages/core/assistant-toolkit/src/blueprints/blueprint-manager/blueprint.test.ts`.

## General test structure

### Vitest + Effect

Use `@effect/vitest` (`describe`, `it.effect`, `it.scoped`) and `Effect.fnUntraced` for generator bodies.

### Determinism

Many tests call **`ObjectId.dangerouslyDisableRandomness()`** at module scope for stable IDs.

### Database and invocation flow

1. `yield* Database.add(...)` / `Obj.make(...)` for fixtures.
2. `yield* Database.flush()` before invoking functions or conversations that read persisted state.
3. Call **`FunctionInvocationService.invokeFunction(Operation, input)`** for direct operation tests, or **`AiConversationService.run`**, **`new AiConversation`**, **`AiSession`**, etc., depending on the layer under test.

### Registering blueprints in tests

Two common patterns:

1. **Registry at layer build** — pass `blueprints: [SomeBlueprint.make(), ...]` into `AssistantTestLayer` when services read from the registry.

2. **Runtime bind** — `addBlueprints` from `packages/core/assistant-toolkit/src/blueprints/testing.ts` loads definition `make()` objects into the DB and calls `AiContextService.bindContext({ blueprints: [...] })`. Used with `AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))` in memory blueprint tests.

You still pass the blueprint’s **`operations`** (handler set) into `AssistantTestLayer({ operationHandlers: ... })` so tools actually execute.

### Types list

Include every ECHO type instances may have: blueprint metadata types, domain objects (`Message`, `Person`, plugin documents), `Blueprint.Blueprint`, `Trigger.Trigger`, queues, etc. If in doubt, mirror imports from a similar test in the same blueprint folder.

## Quick checklist

- [ ] `AssistantTestLayer` (or WithTriggers) with correct `operationHandlers` and `types`.
- [ ] `Effect.provide(TestLayer)` + `TestHelpers.provideTestContext` for memoized LLM tests.
- [ ] New/changed prompts → regenerate with `ALLOW_LLM_GENERATION=1` + `1p-credentials`, commit `*.conversations.json`.
- [ ] Package has `memoized-llm` tag if tests use memoization (for CI grouping).
