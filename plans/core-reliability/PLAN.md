# Core Reliability: AI + Functions-Runtime

## Goal

Close P0 reliability gaps in the AI adapter and functions-runtime trigger dispatcher; audit the AI preprocessor for correctness.

## Scope (this pass)

- **Item 1**: LLM calls — add timeout and fix the SSE parse loop.
- **Item 4**: Trigger dispatcher — remove the non-null assertion on queue position.
- **Audit**: AI preprocessor — fix/document what we find.

**Deferred** (ProcessManager durability + `Effect.die` on recoverable failures): out of scope this pass; tracked in items 2 and 3 below.

## Item 1 — ChatCompletionsAdapter: timeout + SSE buffering

File: [packages/core/ai/src/resolvers/ChatCompletionsAdapter.ts](packages/core/ai/src/resolvers/ChatCompletionsAdapter.ts)

### Findings

1. **No timeout on `generateText`** (lines 340–364). Can hang forever if upstream stalls.
2. **No timeout on `streamText`** (lines 394–414 request, 419–458 stream). Same hang risk; also no idle timeout between chunks.
3. **SSE chunk-boundary bug** (lines 420–458). `Stream.mapConcat((chunk: Uint8Array) => ...)` decodes each chunk independently and splits on `\n`. HTTP chunks are not line-aligned — a JSON payload split across two TCP chunks silently drops text tokens. This is a correctness bug _separate from_ the "no backpressure" concern in the original report.
4. **No yield boundary** inside `Stream.mapConcat` — minor, secondary to the buffering fix.

### TDD plan

Tests go in [packages/core/ai/src/resolvers/ChatCompletionsAdapter.test.ts](packages/core/ai/src/resolvers/ChatCompletionsAdapter.test.ts). Existing tests hit real Ollama/LM Studio; they're `TestHelpers.taggedTest('llm')` so they only run with the `llm` tag. We'll add tests that use an in-process mock `HttpClient` layer so they run in CI.

1. RED: `generateText` times out when the HTTP response never arrives.
2. GREEN: wrap the request body in `Effect.timeoutFail` with a configured `requestTimeout` (default e.g. 2 minutes).
3. RED: `streamText` emits all text deltas when a single SSE frame spans two chunks (split a `data: {...}\n` payload at the midpoint).
4. GREEN: replace `Stream.mapConcat((chunk) => ...)` with a line-buffered pipeline: decode → accumulate into a buffer → split into complete lines → emit parts for each complete line. Use `Stream.mapAccum` to carry buffer state.
5. RED: `streamText` fails with a typed idle-timeout error if no chunks arrive within the idle window.
6. GREEN: add `Stream.timeoutFail` (idle between chunks) with a configured `streamIdleTimeout` (default e.g. 60 seconds).

### Config surface

Extend `ChatCompletionsClientConfig` with optional `requestTimeout: Duration.Duration` and `streamIdleTimeout: Duration.Duration`. Defaults are conservative and can be overridden per client.

## Item 4 — Trigger dispatcher: non-null assertion on queue position

File: [packages/core/functions-runtime/src/triggers/trigger-dispatcher.ts:450](packages/core/functions-runtime/src/triggers/trigger-dispatcher.ts:450)

### Findings

- `Array.dropWhile` at lines 436–441 drops only _leading_ objects with no position key. Any object in the middle of the snapshot that lacks a position key would fall through to line 450, where `.at(0)!.id` crashes the `Effect.forEach`.
- `QueueService.append` always sets position keys, so the happy path is fine. But schema drift, migration bugs, or a new code path writing to the same queue without stamping positions would wedge the trigger indefinitely.

### TDD plan

Tests go in [packages/core/functions-runtime/src/triggers/trigger-dispatcher.test.ts](packages/core/functions-runtime/src/triggers/trigger-dispatcher.test.ts).

1. RED: Queue with two objects where the first has a position key and the second doesn't — expect the dispatcher to invoke exactly once (for the first) and not throw.
2. GREEN: Replace `Array.dropWhile(objectPos === undefined ...)` with `Array.filter` (or skip inside the `Effect.forEach`) — skip any object without a position key and log a warning.
3. Replace `.at(0)!.id` with a checked lookup (reuse the same helper). If the helper returns `undefined`, skip the object rather than crashing.

### Cleanup

Extract a small helper `getQueuePosition(object): string | undefined` — both call sites can share it, addressing the `// TODO(dmaretskyi): Extract methods for managing queue position.` comment at line 438.

## AI preprocessor audit

File: [packages/core/ai/src/AiPreprocessor.ts](packages/core/ai/src/AiPreprocessor.ts)

### High priority

1. **Unchecked `JSON.parse` on persisted data** at 3 sites:
   - [line 260](packages/core/ai/src/AiPreprocessor.ts:260) — `convertToolMessagePart`, on `block.result`.
   - [line 296](packages/core/ai/src/AiPreprocessor.ts:296) — `convertAssistantMessagePart` tool-call, on `block.input`.
   - [line 303](packages/core/ai/src/AiPreprocessor.ts:303) — `convertAssistantMessagePart` tool-result, on `block.result`.

   If a previous turn stored malformed JSON (provider bug, version skew, partial write), the whole prompt preprocessing fails with an uncaught `SyntaxError`. Fix: try/catch → `PromptPreprocesorError` with context about which block failed.

2. **`isFailure: false` even when `block.error` is set** at [line 260](packages/core/ai/src/AiPreprocessor.ts:260) and [line 303](packages/core/ai/src/AiPreprocessor.ts:303). A tool that errored is reported to the model as a successful tool-result containing the error payload. Model may not realize the tool failed.

3. **Duplicate tool-result conversion code** at [lines 256–263](packages/core/ai/src/AiPreprocessor.ts:256) and [lines 299–306](packages/core/ai/src/AiPreprocessor.ts:299). Silent divergence risk. Extract helper.

### Medium

4. **Always-on `log('parse', { block });`** at [line 275](packages/core/ai/src/AiPreprocessor.ts:275). Fires for every block on every preprocessing pass. Should be gated or removed.

5. **One `as any`** at [line 544](packages/core/ai/src/AiPreprocessor.ts:544) in `fixDuplicateToolResults` (tool-message branch). Narrow the helper's return type instead.

6. **`removeUnsatisfiedServerToolCalls` logic** is coherent only because `convertAssistantMessagePart` hardcodes `providerExecuted: false` on tool-results at line 305. If that normalization is ever relaxed, this function silently starts dropping the wrong things. Add an assertion or clarifying comment.

### Low

7. **`case 'stats': break;`** at [line 353](packages/core/ai/src/AiPreprocessor.ts:353) falls through to implicit `undefined` — inconsistent with the `return undefined` pattern above. Cosmetic.

### Audit-only items (no code change proposed this pass)

- Summary trimming at [lines 162–194](packages/core/ai/src/AiPreprocessor.ts:162) drops everything before the last summary message. Documented behavior, tested.
- `anthropicOptions` at [line 282](packages/core/ai/src/AiPreprocessor.ts:282) silently prefers `redactedText` over `signature` when both are present. Probably intentional.

### TDD plan for preprocessor fixes (items 1–3)

1. RED: preprocessing a tool message whose `block.result` is malformed JSON — expect a `PromptPreprocesorError`, not a crash.
2. GREEN: wrap each `JSON.parse` in a try/catch that maps to `PromptPreprocesorError` with block id and reason.
3. RED: preprocessing a tool-result with `block.error` set — expect `isFailure: true`.
4. GREEN: set `isFailure: block.error != null` in both tool-result branches.
5. REFACTOR: extract `convertToolResultPart(block)` helper used by both converters.

## Deferred items (from earlier scan)

- **Item 2** — ProcessManager durability ([ProcessManager.ts:715](packages/core/functions-runtime/src/process/ProcessManager.ts:715)).
- **Item 3** — `Effect.die()` on recoverable failures ([ProcessManager.ts:437](packages/core/functions-runtime/src/process/ProcessManager.ts:437), [:461](packages/core/functions-runtime/src/process/ProcessManager.ts:461)).

Both need design work on the durability backend and the error type surface. Separate plan.
