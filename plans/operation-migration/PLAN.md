# Operation Migration Plan

## Goal

Migrate all `defineFunction` / `Function` / `FunctionDefinition` usages from `@dxos/functions` to the new `Operation` API from `@dxos/operation`.

## Current State (2026-03-19)

### Completed

- **plugin-voxel** — 4 functions migrated
- **plugin-chess** — 4 functions migrated
- **plugin-transcription** — 3 functions migrated
- **plugin-inbox** — 8 functions migrated
- **plugin-thread** — 1 function migrated
- **assistant-toolkit** — 20+ functions migrated
- **devtools/devtools** — `Function` → `Operation.PersistentOperation` in hooks/stories
- **compute** — `Function.Function`, `FunctionDefinition` → `Operation` equivalents
- **plugin-script templates** — `ping`, `forex`, `forex-effect`, `anthropic`, `chess-bot`, `commentary` migrated
- **devtools/cli test-toolkit** — migrated

### Remaining (small)

#### 1. Stale `Function` namespace imports (unused, just remove)

- `packages/stories/stories-assistant/src/testing/testing.tsx` — remove `Function` from import
- `packages/ui/react-ui-canvas-compute/src/shapes/Function.tsx` — remove `Function` from import

#### 2. `FunctionDefinition.Input<>` type usage → `Operation.Definition.Input<>`

- `packages/plugins/plugin-script/src/containers/NotebookContainer/NotebookContainer.tsx:237`
- `packages/plugins/plugin-assistant/src/containers/PromptArticle/PromptArticle.tsx:27`

#### 3. Stale `type FunctionDefinition` imports (unused or need replacement)

- `packages/devtools/cli/src/util/blueprints.ts:17` — remove unused import
- `packages/devtools/cli/src/commands/chat/processor.ts:25` — remove unused import

#### 4. `defineFunction` in `dxos:functions` virtual module (DO NOT MIGRATE)

These use the edge runtime virtual module and must stay as-is:

- `packages/plugins/plugin-script/src/templates/gmail.ts`
- `packages/plugins/plugin-script/src/templates/discord.ts`
- `packages/plugins/plugin-script/src/templates/data-generator.ts`
- `packages/plugins/plugin-inbox/src/testing/scripts/hello.ts`
- `packages/plugins/plugin-inbox/src/testing/scripts/types.ts`
- `packages/core/functions/src/example/forex-effect.ts`

#### 5. `defineFunction` in string literals (DO NOT MIGRATE)

- `packages/core/functions-runtime/src/bundler/bundler.test.ts` — inline source string for bundler test
- `packages/plugins/plugin-script/src/capabilities/artifact-definition/artifact-definition.ts` — LLM prompt text

## Mapping Reference

| Old (`@dxos/functions`)               | New (`@dxos/operation`)                          |
| ------------------------------------- | ------------------------------------------------ |
| `Function.Function`                   | `Operation.PersistentOperation`                  |
| `Function.setFrom(t, s)`              | `Operation.setFrom(t, s)`                        |
| `Function.make({...})`                | `Obj.make(Operation.PersistentOperation, {...})` |
| `FunctionDefinition.serialize(op)`    | `Operation.serialize(op)`                        |
| `FunctionDefinition.deserialize(rec)` | `Operation.deserialize(rec)`                     |
| `FunctionDefinition.Any`              | `Operation.Definition.Any`                       |
| `FunctionDefinition.Input<T>`         | `Operation.Definition.Input<T>`                  |
| `FunctionDefinition.make({...})`      | `Operation.make({...})`                          |
| `defineFunction({...})`               | `Op.pipe(Operation.withHandler(Effect.fn(...)))` |

Handler signature change: `{ data: { field } }` → `{ field }` (no wrapper).

## Decisions

1. **`dxos:functions` scripts stay unchanged.** These run in the edge function runtime which provides `defineFunction` as a virtual module API.
2. **String literal references stay unchanged.** Bundler tests and LLM prompts contain `defineFunction` as text.
3. **Redundant `Functions` objects removed.** `ThreadFunctions`, `VoxelFunctions`, `ChessFunctions` objects were removed in favor of direct definition imports and `OperationHandlerSet.lazy`.
4. **`GmailFunctions`/`CalendarFunctions` kept.** Used for direct invocation/serialization in plugin-inbox.
5. **`FunctionDefinition` from `@dxos/compute` is unrelated.** It's a hyperformula function definition type, not the Operation type.

## Verification

```bash
# Build all affected packages
moon run :build

# Grep to confirm no remaining usages
rg 'Function\.(Function|setFrom|make\()' --type ts packages/
rg 'FunctionDefinition\.' --type ts packages/
rg "import.*\bFunction\b.*from '@dxos/functions'" --type ts packages/

# Run all tests
moon run :test
```
