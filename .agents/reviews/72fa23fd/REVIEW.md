---
branch: dm/intelligent-hopper-be15dv
commit: 72fa23fd939ae3b095497b3c6d4c0d5cf7b431b5
base: fe3aaf6bfc4ef9e6c16b70b6db3ef49d0a1841b2
mode: fast
createdAt: 2026-11-11T14:47:04.357Z
isFinalized: true
groups: 148
rules: [bounded-live-state, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, per-test-mutable-fixtures]
reviewId: 72fa23fd
---

_5 error(s), 17 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 72fa23fd-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:308
- 72fa23fd-2 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:107
- 72fa23fd-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:303
- 72fa23fd-4 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:1
- 72fa23fd-5 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute-runtime/src/index.ts:13
- 72fa23fd-6 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:175
- 72fa23fd-7 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessManager.ts:442
- 72fa23fd-8 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.ts:1228
- 72fa23fd-9 - resolved - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:234
- 72fa23fd-10 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:294
- 72fa23fd-11 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:325
- 72fa23fd-12 - resolved - per-test-mutable-fixtures - packages/core/compute/compute-runtime/src/script-operations.test.ts:59
- 72fa23fd-13 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/script-operations.test.ts:93
- 72fa23fd-14 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/ScriptRunner.ts:97
- 72fa23fd-15 - resolved - errors-extend-base-error - packages/core/compute/compute/src/Operation.ts:772
- 72fa23fd-16 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:930
- 72fa23fd-17 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute/src/Operation.ts:1157
- 72fa23fd-18 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1470
- 72fa23fd-19 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Process.ts:560
- 72fa23fd-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/mcp-server/src/McpServer.ts:449
- 72fa23fd-21 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/mcp-server/src/McpServer.ts:1160
- 72fa23fd-22 - ignored - no-try-catch-in-effect-code - packages/core/compute/mcp-server/src/McpServer.ts:1276

## Issues

# WARN 72fa23fd-1 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:308`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 308-318 (`const evalCode = (input: string): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-2 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:107`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 107-118 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-3 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:303`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.94. The likeliest place is lines 303-315 (`const operationBehind = (tool: Tool.Any): Operation.Definition.Any | undefine...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-4 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-12 (`export * from './errors.ts';`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-5 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 13-24 (`export * as ProcessOperationInvoker from './ProcessOperationInvoker.ts';`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 72fa23fd-6 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:175`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 175-196 (`const EMPTY_RPC_CLIENT: RpcClient.RpcClient<any> = Effect.runSync(`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 72fa23fd-7 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessManager.ts:442`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 442-465 (`#release(pid: Process.ID): void {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-8 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.ts:1228`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 1228-1251 (`export const layer = (opts?: {`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 72fa23fd-9 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:234`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 234-245 (`: (invokeRemote(op, input, options, remote) as Effect.Effect<O>);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-10 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:294`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 294-305 (`try {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-11 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:325`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 325-336 (`export const layer: Layer.Layer<Operation.Service | Service, never, Process.M...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-12 per-test-mutable-fixtures `packages/core/compute/compute-runtime/src/script-operations.test.ts:59`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.90. The likeliest place is lines 59-64 (`const runs: Operation.ScriptRequest[] = [];`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-13 flat-layer-composition `packages/core/compute/compute-runtime/src/script-operations.test.ts:93`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 93-107 (`const testLayer = (runner: Operation.ScriptRunner) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-14 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/ScriptRunner.ts:97`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 97-108 (`export const resolveSource = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 72fa23fd-15 errors-extend-base-error `packages/core/compute/compute/src/Operation.ts:772`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.84. The likeliest place is lines 772-787 (`export const isScriptRef = (source: ScriptSource): source is ScriptRef => sou...`, location confidence 0.90). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 72fa23fd-16 no-casts `packages/core/compute/compute/src/Operation.ts:930`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 930-952 (`export const makeScript = <const P extends Types.NoExcessProperties<ScriptPro...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-17 no-try-catch-in-effect-code `packages/core/compute/compute/src/Operation.ts:1157`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 1157-1172 (`export const serializable = (operations: readonly Definition.Any[]): Persiste...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-18 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1470`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 1470-1493 (`schedule: <I, O>(`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-19 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Process.ts:560`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 560-578 (`export const spawn = <I, O, Rpcs extends Rpc.Any = never>(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-20 effect-fn-not-hand-wrapped-gen `packages/core/compute/mcp-server/src/McpServer.ts:449`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 449-472 (`const dispatch = (`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-21 import-as-namespace-is-all-or-nothing `packages/core/compute/mcp-server/src/McpServer.ts:1160`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1160-1178 (`export const toolkit = McpServer$.toolkit;`, location confidence 0.55). Judged with added `public-api` context after a first pass of 0.61. This is a single-shot classifier: confirm against the rule before acting.

# WARN 72fa23fd-22 no-try-catch-in-effect-code `packages/core/compute/mcp-server/src/McpServer.ts:1276`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 1276-1293 (`const messageKind = (data: string): 'response' | 'notification' | undefined => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fe3aaf6bfc4ef9e6c16b70b6db3ef49d0a1841b2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 22 violations written to fragments, 533 uncertain, 330 clean, 0 unanswered
- left for an agentic reviewer: 99 batch(es)

```text
requests: 618 (289 verdicts re-asked with context the model requested)
estimated input tokens: 7025255
billed input tokens: 6718690 (cost $0.2822)
measured chars per token: 3.14
```

### Resolution notes

Resolved in the commit that adds this store: 72fa23fd-9 (the remote script call is typed by the operation, no cast), 72fa23fd-12 (each test makes its own backend and request list; the nested call reports the tree through its output instead of a module-level `let`), 72fa23fd-14 (`resolveSource` is an `Effect.fnUntraced`), 72fa23fd-15 (`ScriptError` is a `BaseError.extend`).

- 72fa23fd-13 ignored: rule exempts a layer that must be parameterized per call: the test layer takes each test's backend.
- 72fa23fd-16 ignored: `makeScript` builds the phantom variance markers the same way `make`/`makeDurable` do; no value inhabits a phantom type, the cast stays inside the constructor, and the public signature is fully typed.
- 72fa23fd-19 ignored: `Process.spawn`'s hand-wrapped `Effect.gen` predates this PR; the PR changed the definition it takes, not its shape.
- 72fa23fd-1, 72fa23fd-2, 72fa23fd-3, 72fa23fd-4, 72fa23fd-5, 72fa23fd-6, 72fa23fd-7, 72fa23fd-8, 72fa23fd-10, 72fa23fd-11, 72fa23fd-17, 72fa23fd-18, 72fa23fd-20, 72fa23fd-21, 72fa23fd-22 ignored: the flagged line predates this PR (not in its diff against the merge base); out of scope here.
