---
branch: claude/code-mode-direct-bindings
commit: 36a8e1d9a03228a0a1e1067443915c6313708fd6
base: b11bcdcfb7d49a888966288b13f108a25f6bfe2c
mode: fast
createdAt: 2026-11-23T00:20:52.204Z
isFinalized: true
groups: 155
rules: [code-not-in-strings, declare-optional-services-with-noop-layers, dont-leak-internal-api-through-public-surface, errors-extend-base-error, flat-layer-composition, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, test-real-scenario-not-narrower-proxy]
reviewId: 36a8e1d9a0
---

_4 error(s), 23 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 36a8e1d9a0-1 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-code-mode/src/producer.test.ts:73
- 36a8e1d9a0-2 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:399
- 36a8e1d9a0-3 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/Wire.ts:66
- 36a8e1d9a0-4 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/Wire.ts:202
- 36a8e1d9a0-5 - ignored - no-casts - packages/core/compute/agent-code-mode/src/WorkerSandbox.ts:410
- 36a8e1d9a0-6 - ignored - options-object-with-defaults - packages/core/compute/agent-code-mode/src/WorkerSandboxBrowser.ts:33
- 36a8e1d9a0-7 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37
- 36a8e1d9a0-8 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:78
- 36a8e1d9a0-9 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:237
- 36a8e1d9a0-10 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:269
- 36a8e1d9a0-11 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:57
- 36a8e1d9a0-12 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:74
- 36a8e1d9a0-13 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.ts:144
- 36a8e1d9a0-14 - resolved - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.ts:243
- 36a8e1d9a0-15 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant-evals/src/mcp-host.test.ts:51
- 36a8e1d9a0-16 - ignored - code-not-in-strings - packages/core/compute/assistant-evals/src/mcp-host.test.ts:137
- 36a8e1d9a0-17 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant-evals/src/mcp-host.ts:301
- 36a8e1d9a0-18 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:939
- 36a8e1d9a0-19 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute/src/Operation.ts:1159
- 36a8e1d9a0-20 - ignored - dont-leak-internal-api-through-public-surface - packages/core/compute/compute/src/Operation.ts:1305
- 36a8e1d9a0-21 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1477
- 36a8e1d9a0-22 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:94
- 36a8e1d9a0-23 - ignored - code-not-in-strings - packages/core/compute/mcp-server/src/McpServer.test.ts:645
- 36a8e1d9a0-24 - ignored - no-try-catch-in-effect-code - packages/core/compute/mcp-server/src/McpServer.ts:1014
- 36a8e1d9a0-25 - ignored - flat-layer-composition - packages/devtools/cli/src/commands/mcp/local-server.ts:174
- 36a8e1d9a0-26 - ignored - flat-layer-composition - packages/devtools/cli/src/commands/mcp/serve.ts:154
- 36a8e1d9a0-27 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/types/SpaceOperation.ts:505

## Issues

# WARN 36a8e1d9a0-1 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-code-mode/src/producer.test.ts:73`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 73-84 (`AssistantTestLayer({`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-2 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:399`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 399-408 (`const tryParseJson = (text: string): unknown => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 36a8e1d9a0-3 errors-extend-base-error `packages/core/compute/agent-code-mode/src/Wire.ts:66`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 66-72 (`catch: (cause) => new WireError({ message: 'Could not write the changes to ha...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-4 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/Wire.ts:202`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 202-213 (`const hasHeads = (object: Obj.Unknown, heads: readonly string[]): boolean => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 36a8e1d9a0-5 no-casts `packages/core/compute/agent-code-mode/src/WorkerSandbox.ts:410`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 410-419 (`const toMessagePort = (port: WorkerThreads.MessagePort): MessagePort => port ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-6 options-object-with-defaults `packages/core/compute/agent-code-mode/src/WorkerSandboxBrowser.ts:33`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.85. The likeliest place is lines 33-44 (`export const spawn =`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 36a8e1d9a0-7 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.90. The likeliest place is lines 37-49 (`const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-8 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:78`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.83. The likeliest place is lines 78-85 (`const compile =`, location confidence 0.96). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-9 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:237`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 237-248 (`const rebuildType = ({ typename, version, jsonSchema, skills }: SandboxType) ...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-10 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:269`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 269-280 (`const forwardOperations = (`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-11 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:57`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 57-68 (`const hostOperations: Operation.OperationService = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-12 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:74`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.86. The likeliest place is lines 74-83 (`const instantiate = (source: string): new () => WorkerSandboxWorkerd.Entrypoi...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-13 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.ts:144`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.94. The likeliest place is lines 144-155 (`const program = ({ code, names }: SandboxInit): string =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-14 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.ts:243`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 243-250 (`const parseJson = (text: string): unknown => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-15 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant-evals/src/mcp-host.test.ts:51`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 51-62 (`const stubInvoker = () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-16 code-not-in-strings `packages/core/compute/assistant-evals/src/mcp-host.test.ts:137`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.90. The likeliest place is lines 137-148 (`expect(Object.keys(toolkit.toolkit.tools)).to.include('runScript');`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-17 declare-optional-services-with-noop-layers `packages/core/compute/assistant-evals/src/mcp-host.ts:301`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.94. The likeliest place is lines 301-312 (`const database = yield* Effect.serviceOption(Database.Service);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 36a8e1d9a0-18 no-casts `packages/core/compute/compute/src/Operation.ts:939`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 939-962 (`export const makeScript = <const P extends Types.NoExcessProperties<ScriptPro...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-19 no-try-catch-in-effect-code `packages/core/compute/compute/src/Operation.ts:1159`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 1159-1174 (`export const serializable = (operations: readonly Definition.Any[]): Persiste...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-20 dont-leak-internal-api-through-public-surface `packages/core/compute/compute/src/Operation.ts:1305`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.85. The likeliest place is lines 1305-1325 (`conversation?: URI.URI;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-21 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1477`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.92. The likeliest place is lines 1477-1500 (`export interface OperationService {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-22 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:94`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 94-102 (`const taskDatabase = async () => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-23 code-not-in-strings `packages/core/compute/mcp-server/src/McpServer.test.ts:645`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.80. The likeliest place is lines 645-650 (`});`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-24 no-try-catch-in-effect-code `packages/core/compute/mcp-server/src/McpServer.ts:1014`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 1014-1035 (`const readSpaceField = <T>(space: DescribableSpace, field: string, read: () =...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-25 flat-layer-composition `packages/devtools/cli/src/commands/mcp/local-server.ts:174`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 174-187 (`chatLayer({ provider: 'edge', spaceId: spaceIdOption(spaceId), functions: han...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-26 flat-layer-composition `packages/devtools/cli/src/commands/mcp/serve.ts:154`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 154-165 (`return yield* Layer.launch(`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 36a8e1d9a0-27 operations-resolve-database-from-service `packages/plugins/plugin-space/src/types/SpaceOperation.ts:505`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 505-531 (`export const Migrate = Operation.make({`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b11bcdcfb7d49a888966288b13f108a25f6bfe2c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 27 violations written to fragments, 294 uncertain, 775 clean, 0 unanswered
- left for an agentic reviewer: 92 batch(es)

```text
requests: 540 (182 verdicts re-asked with context the model requested)
estimated input tokens: 6330753
billed input tokens: 5945882 (cost $0.2497)
measured chars per token: 3.19
```
