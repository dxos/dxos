---
branch: claude/code-mode-direct-bindings
commit: 1821e690071bdfb32d55e87d88fbd00f662c7e90
base: b11bcdcfb7d49a888966288b13f108a25f6bfe2c
mode: fast
createdAt: 2026-11-23T02:56:56.111Z
isFinalized: true
groups: 160
rules: [call-effect-api-not-promise-bridge, code-not-in-strings, declare-optional-services-with-noop-layers, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, flat-layer-composition, import-as-namespace-is-all-or-nothing, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, per-test-mutable-fixtures, test-real-scenario-not-narrower-proxy]
reviewId: 1821e69007
---

_4 error(s), 27 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1821e69007-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:25
- 1821e69007-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:368
- 1821e69007-3 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/agent-code-mode/src/code-mode.test.ts:698
- 1821e69007-4 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:314
- 1821e69007-5 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-code-mode/src/producer.test.ts:73
- 1821e69007-6 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:109
- 1821e69007-7 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:395
- 1821e69007-8 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/Wire.ts:25
- 1821e69007-9 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/Wire.ts:224
- 1821e69007-10 - ignored - no-casts - packages/core/compute/agent-code-mode/src/WorkerSandbox.ts:410
- 1821e69007-11 - ignored - options-object-with-defaults - packages/core/compute/agent-code-mode/src/WorkerSandboxBrowser.ts:33
- 1821e69007-12 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37
- 1821e69007-13 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:269
- 1821e69007-14 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:72
- 1821e69007-15 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:100
- 1821e69007-16 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.ts:146
- 1821e69007-17 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant-evals/src/mcp-host.test.ts:51
- 1821e69007-18 - ignored - code-not-in-strings - packages/core/compute/assistant-evals/src/mcp-host.test.ts:137
- 1821e69007-19 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant-evals/src/mcp-host.ts:301
- 1821e69007-20 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:939
- 1821e69007-21 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute/src/Operation.ts:1159
- 1821e69007-22 - ignored - dont-leak-internal-api-through-public-surface - packages/core/compute/compute/src/Operation.ts:1305
- 1821e69007-23 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1477
- 1821e69007-24 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:94
- 1821e69007-25 - ignored - code-not-in-strings - packages/core/compute/mcp-server/src/McpServer.test.ts:657
- 1821e69007-26 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/mcp-server/src/McpServer.ts:448
- 1821e69007-27 - ignored - no-try-catch-in-effect-code - packages/core/compute/mcp-server/src/McpServer.ts:1014
- 1821e69007-28 - ignored - flat-layer-composition - packages/devtools/cli/src/commands/mcp/local-server.ts:174
- 1821e69007-29 - ignored - flat-layer-composition - packages/devtools/cli/src/commands/mcp/serve.ts:154
- 1821e69007-30 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-markdown/src/types/MarkdownOperation.ts:1
- 1821e69007-31 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/types/SpaceOperation.ts:505

## Issues

# WARN 1821e69007-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:25`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 25-53 (`import { EffectDialect } from './dialect-effect.ts';`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:368`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.89. The likeliest place is lines 368-391 (``const byDxn = yield* Database.query(Filter.type('dxn:${TASK_TYPENAME}', { ti...`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-3 call-effect-api-not-promise-bridge `packages/core/compute/agent-code-mode/src/code-mode.test.ts:698`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.86. The likeliest place is lines 698-716 (`'promise',`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-4 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:314`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 314-324 (`const evalCode = (input: string): string => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-5 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-code-mode/src/producer.test.ts:73`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 73-84 (`AssistantTestLayer({`, location confidence 0.40). Judged with added `imports, test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-6 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:109`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 109-120 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-7 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:395`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 395-404 (`const tryParseJson = (text: string): unknown => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1821e69007-8 errors-extend-base-error `packages/core/compute/agent-code-mode/src/Wire.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 25-40 (`export class WireError extends Data.TaggedError('WireError')<{ readonly messa...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-9 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/Wire.ts:224`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 224-235 (`const hasHeads = (object: Obj.Unknown, heads: readonly string[]): boolean => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1821e69007-10 no-casts `packages/core/compute/agent-code-mode/src/WorkerSandbox.ts:410`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 410-419 (`const toMessagePort = (port: WorkerThreads.MessagePort): MessagePort => port ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-11 options-object-with-defaults `packages/core/compute/agent-code-mode/src/WorkerSandboxBrowser.ts:33`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.83. The likeliest place is lines 33-44 (`export const spawn =`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1821e69007-12 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 37-49 (`const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-13 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:269`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 269-280 (`const forwardOperations = (`, location confidence 0.50). Judged with added `importers, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-14 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:72`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 72-83 (`const hostOperations = (db: Database.Database): Operation.OperationService => ({`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-15 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:100`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.88. The likeliest place is lines 100-109 (`const instantiate = (source: string): new () => WorkerSandboxWorkerd.Entrypoi...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-16 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.ts:146`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.95. The likeliest place is lines 146-157 (`const program = ({ code, names }: SandboxInit): string =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-17 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant-evals/src/mcp-host.test.ts:51`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 51-62 (`const stubInvoker = () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-18 code-not-in-strings `packages/core/compute/assistant-evals/src/mcp-host.test.ts:137`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.87. The likeliest place is lines 137-148 (`expect(Object.keys(toolkit.toolkit.tools)).to.include('runScript');`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-19 declare-optional-services-with-noop-layers `packages/core/compute/assistant-evals/src/mcp-host.ts:301`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.93. The likeliest place is lines 301-312 (`const database = yield* Effect.serviceOption(Database.Service);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1821e69007-20 no-casts `packages/core/compute/compute/src/Operation.ts:939`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 939-962 (`export const makeScript = <const P extends Types.NoExcessProperties<ScriptPro...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-21 no-try-catch-in-effect-code `packages/core/compute/compute/src/Operation.ts:1159`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 1159-1174 (`export const serializable = (operations: readonly Definition.Any[]): Persiste...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-22 dont-leak-internal-api-through-public-surface `packages/core/compute/compute/src/Operation.ts:1305`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.85. The likeliest place is lines 1305-1325 (`conversation?: URI.URI;`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-23 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1477`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 1477-1500 (`export interface OperationService {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-24 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:94`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 94-102 (`const taskDatabase = async () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-25 code-not-in-strings `packages/core/compute/mcp-server/src/McpServer.test.ts:657`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.83. The likeliest place is lines 657-661 (`spaceId?: SpaceId;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-26 effect-fn-not-hand-wrapped-gen `packages/core/compute/mcp-server/src/McpServer.ts:448`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 448-471 (`const dispatch = (`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-27 no-try-catch-in-effect-code `packages/core/compute/mcp-server/src/McpServer.ts:1014`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 1014-1035 (`const readSpaceField = <T>(space: DescribableSpace, field: string, read: () =...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-28 flat-layer-composition `packages/devtools/cli/src/commands/mcp/local-server.ts:174`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 174-187 (`chatLayer({ provider: 'edge', spaceId: spaceIdOption(spaceId), functions: han...`, location confidence 0.83). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-29 flat-layer-composition `packages/devtools/cli/src/commands/mcp/serve.ts:154`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 154-165 (`return yield* Layer.launch(`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-30 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-markdown/src/types/MarkdownOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1821e69007-31 operations-resolve-database-from-service `packages/plugins/plugin-space/src/types/SpaceOperation.ts:505`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 505-531 (`export const Migrate = Operation.make({`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b11bcdcfb7d49a888966288b13f108a25f6bfe2c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 31 violations written to fragments, 309 uncertain, 994 clean, 0 unanswered
- left for an agentic reviewer: 92 batch(es)

```text
requests: 609 (202 verdicts re-asked with context the model requested)
estimated input tokens: 7181673
billed input tokens: 6732016 (cost $0.2827)
measured chars per token: 3.20
```
