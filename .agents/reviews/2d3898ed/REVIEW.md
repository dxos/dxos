---
branch: dm/trusting-babbage-u7h9ra
commit: 2d3898ed2baa8619ff91146df972131447bb2609
base: 89e7ec1d
mode: pr-only
createdAt: 2026-09-27T15:36:24.184Z
isFinalized: true
groups: 63
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, import-as-namespace-is-all-or-nothing, no-casts, no-env-vars-in-low-level-modules, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, test-real-scenario-not-narrower-proxy]
reviewId: 2d3898ed
---

_4 error(s), 13 warning(s)._

# WARN 2d3898ed-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/mcp-servers.test.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 31-41 (`const toolResults = (feed: Feed.Feed) =>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2d3898ed-2 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-runtime/src/agent-service/mcp-servers.test.ts:103`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 103-114 (`aiService: scriptedAiService([`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2d3898ed-3 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 202-225 (`describe('tool call encoding', () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2d3898ed-4 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.ts:493`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 493-518 (`type: 'function',`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2d3898ed-5 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-evals/src/Cost.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-10 (`//`, location confidence 0.85). Judged with added `public-api` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2d3898ed-6 errors-extend-base-error `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:131`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.93. The likeliest place is lines 131-137 (`export class SeedError extends Data.TaggedError('SeedError')<{ message: strin...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2d3898ed-7 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:138`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 138-149 (`export const seed = ({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2d3898ed-8 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2d3898ed-9 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/runner.ts:212`

`chatMessages = (chatRef) => Effect.gen(function* () {...})` hand-wraps `Effect.gen` where `Effect.fn`/`Effect.fnUntraced` already gives the same shape with either a named span or no tracing overhead. Per `effect-fn-not-hand-wrapped-gen`, wrap it with `Effect.fnUntraced` (this is plumbing, not a boundary worth its own span) instead of `(args) => Effect.gen(...)`.

# WARN 2d3898ed-10 no-env-vars-in-low-level-modules `packages/core/compute/assistant-evals/src/Transcript.ts:39`

`directory()` reads `process.env.DX_EVAL_TRANSCRIPT_DIR` directly inside this module, and both `Usage.ts` and `runner.ts` call it inline at the point of use rather than receiving the resolved directory as an explicit parameter from a higher layer — this is the pattern `no-env-vars-in-low-level-modules` flags: config derived from the environment should be resolved once by a top-level caller and threaded down, not read ad hoc by a low-level helper. Fix: have the eval runner resolve the transcript directory once (e.g. from its own options/config) and pass it into `Transcript.write`/`captureRequest` explicitly, leaving `Transcript.ts` itself free of `process.env`.

# WARN 2d3898ed-11 test-real-scenario-not-narrower-proxy `packages/core/compute/assistant/src/request/prompt-cache.test.ts:293`

The test's own comment says it "rebuilds each call's prompt from the messages the way `AiRequest` does" — i.e. `replay`/`callBoundaries` reimplement the production request-splitting logic in the test file rather than driving the real `AiRequest`/session code that actually assembles a call's prompt. Per `test-real-scenario-not-narrower-proxy`, this is a bespoke test-only layer standing in for the production path it claims to validate; the fix is to build each call's prompt by invoking the real production entry point (e.g. the session/request code that calls `AiPreprocessor.preprocessPrompt`) rather than re-deriving call boundaries and prompt assembly independently in the test.

# WARN 2d3898ed-12 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/request/prompt-cache.test.ts:425`

`replay = (transcript) => Effect.gen(function* () {...})` is a hand-wrapped `Effect.gen` inside a test file, where `Effect.fnUntraced` is the rule's prescribed fix (tracing adds no value in a test). Wrap it with `Effect.fnUntraced` instead of the bare arrow-returning-`Effect.gen` form.

# WARN 2d3898ed-13 no-impossible-state-handling `packages/core/compute/assistant/src/request/prompt-cache.test.ts:445`

`expect(prompt, ...).toBeDefined()` already fails the test the instant `prompt` is undefined, yet the very next line adds `if (!prompt) { return breaks; }` as a defensive fallback for a state the preceding assertion already excludes. Per `no-impossible-state-handling`, delete the redundant branch; if TypeScript needs the narrowing, use `invariant(prompt, ...)` from `@dxos/invariant` (which does narrow the type) instead of vitest's `expect(...).toBeDefined()` plus a manual guard.

# WARN 2d3898ed-14 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:166`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 166-177 (`public async appendTurnMessage(message: Message.Message): Promise<void> {`, location confidence 0.61). Judged with added `importers, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 2d3898ed-15 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/weather/project.ts:50`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 50-61 (`export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = S...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2d3898ed-16 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/weather/skill.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 30-41 (`export const WeatherSkill: SampleSpace.Phase<SkillResult> = SampleSpace.phase...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2d3898ed-17 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/weather/tasks.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 55-66 (`export const Tasks: SampleSpace.Phase<TasksResult> = SampleSpace.phase('tasks...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.
