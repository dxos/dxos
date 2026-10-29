---
branch: dm/feature-map
commit: f790a48ee7c10fedaf2b3374dcd2f75e23fc3632
base: 03b33ae8b7d1c4efb3f461180728deb7288534f1
mode: fast
createdAt: 2026-10-21T10:32:26.321Z
isFinalized: true
groups: 646
rules: [atom-lifetime-bound-to-owner, code-not-in-strings, declare-optional-services-with-noop-layers, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, headless-leak-check-per-workerd-plugin, log-fire-and-forget-rejections, mutate-echo-arrays-with-splice, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-sleep-in-test, no-styling-wrapper-divs, no-try-catch-in-effect-code, one-changeset-per-pr, one-test-suite-per-module, operations-resolve-database-from-service, retries-via-schedule-with-evidence, setter-must-not-own-transaction, story-for-new-ui-component, test-real-scenario-not-narrower-proxy, use-context-scoped-cancellation]
reviewId: f790a48e
---

_6 error(s), 41 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f790a48e-1 - resolved - one-changeset-per-pr - .changeset/claude-agent-host.md:1
- f790a48e-2 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:99
- f790a48e-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:256
- f790a48e-4 - ignored - no-casts - packages/core/compute/assistant/src/request/AiRequest.ts:410
- f790a48e-5 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/request/AiRequest.ts:594
- f790a48e-6 - ignored - headless-leak-check-per-workerd-plugin - packages/plugins/plugin-claude/moon.yml:25
- f790a48e-7 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-claude/src/agent-helper/McpBridge.ts:66
- f790a48e-8 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-claude/src/agent-helper/server.ts:293
- f790a48e-9 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-claude/src/agents/AcpAgent.test.ts:46
- f790a48e-10 - ignored - no-sleep-in-test - packages/plugins/plugin-claude/src/agents/claude-code.e2e.test.ts:85
- f790a48e-11 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:79
- f790a48e-12 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:259
- f790a48e-13 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:324
- f790a48e-14 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:32
- f790a48e-15 - ignored - no-sleep-in-test - packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:304
- f790a48e-16 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-claude/src/agents/McpRelay.ts:112
- f790a48e-17 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-claude/src/agents/Projection.test.ts:20
- f790a48e-18 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-claude/src/agents/Projection.ts:1
- f790a48e-19 - ignored - log-fire-and-forget-rejections - packages/plugins/plugin-claude/src/agents/testing/fake-agent.ts:86
- f790a48e-20 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-claude/src/agents/Workspace.ts:59
- f790a48e-21 - ignored - log-fire-and-forget-rejections - packages/plugins/plugin-claude/src/capabilities/agent-launcher.ts:110
- f790a48e-22 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-claude/src/capabilities/agent-launcher.ts:128
- f790a48e-23 - resolved - no-casts - packages/plugins/plugin-claude/src/containers/index.ts:1
- f790a48e-24 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-claude/src/containers/ProjectFolder/ProjectFolder.tsx:28
- f790a48e-25 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-claude/src/index.ts:1
- f790a48e-26 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.test.ts:104
- f790a48e-27 - ignored - headless-leak-check-per-workerd-plugin - packages/plugins/plugin-code/moon.yml:13
- f790a48e-28 - ignored - no-casts - packages/plugins/plugin-code/src/containers/index.ts:1
- f790a48e-29 - ignored - one-test-suite-per-module - packages/plugins/plugin-dev-shell/src/operations/operations.test.ts:27
- f790a48e-30 - ignored - code-not-in-strings - packages/plugins/plugin-dev-shell/src/vite-plugin/agent-host-middleware.ts:48
- f790a48e-31 - resolved - code-not-in-strings - packages/plugins/plugin-dev-shell/src/vite-plugin/agent-host.test.ts:25
- f790a48e-32 - ignored - code-not-in-strings - packages/plugins/plugin-dev-shell/src/vite-plugin/apply-edits-program.ts:21
- f790a48e-33 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-dev-shell/src/vite-plugin/apply-edits-program.ts:51
- f790a48e-34 - ignored - code-not-in-strings - packages/plugins/plugin-dev-shell/src/vite-plugin/exec-runner.ts:48
- f790a48e-35 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-dev-shell/src/vite-plugin/path-scope.ts:18
- f790a48e-36 - ignored - no-sleep-in-test - packages/plugins/plugin-dev-shell/src/vite-plugin/shell-middleware.test.ts:77
- f790a48e-37 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/create-object.ts:30
- f790a48e-38 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.tsx:246
- f790a48e-39 - resolved - story-for-new-ui-component - packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:141
- f790a48e-40 - ignored - no-casts - packages/plugins/plugin-projects/src/containers/index.ts:29
- f790a48e-41 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:143
- f790a48e-42 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:215
- f790a48e-43 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.tsx:174
- f790a48e-44 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26
- f790a48e-45 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:39
- f790a48e-46 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:413
- f790a48e-47 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:36

## Issues

# WARN f790a48e-1 one-changeset-per-pr `.changeset/claude-agent-host.md:1`

**Resolved:** the eight changesets are consolidated into `.changeset/feature-map-and-dev-shell-agents.md`, one line per publish group.

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.96. This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-2 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:99`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 99-110 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 1.00). Judged with added `importers, package` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-3 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:256`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 256-265 (`const tryParseJson = (text: string): unknown => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f790a48e-4 no-casts `packages/core/compute/assistant/src/request/AiRequest.ts:410`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 410-421 (`parseReasoningTags: true,`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-5 no-try-catch-in-effect-code `packages/core/compute/assistant/src/request/AiRequest.ts:594`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 594-605 (`let operationOpt: Option.Option<Operation.Definition.Any>;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-6 headless-leak-check-per-workerd-plugin `packages/plugins/plugin-claude/moon.yml:25`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `headless-leak-check-per-workerd-plugin` (Every plugin with a workerd variant has a React-leak check tracing only worker conditions, with a target of zero), p=0.95. The likeliest place is lines 25-36 (`--conditions node`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-7 use-context-scoped-cancellation `packages/plugins/plugin-claude/src/agent-helper/McpBridge.ts:66`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 66-77 (`}`, location confidence 0.63). Judged with added `diff, importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-8 no-try-catch-in-effect-code `packages/plugins/plugin-claude/src/agent-helper/server.ts:293`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 293-301 (`return JSON.parse(Buffer.concat(chunks).toString('utf8'));`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-9 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-claude/src/agents/AcpAgent.test.ts:46`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 46-59 (`const setup = Effect.fn(function* () {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-10 no-sleep-in-test `packages/plugins/plugin-claude/src/agents/claude-code.e2e.test.ts:85`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 85-96 (`const findRequest = (feed: Feed.Feed) =>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-11 atom-lifetime-bound-to-owner `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:79`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.89. The likeliest place is lines 79-90 (`export const make = (definition: Definition): Effect.Effect<CodeAgent, never,...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-12 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:259`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 259-270 (`const sweepWorktrees = ({`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-13 retries-via-schedule-with-evidence `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:324`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.89. The likeliest place is lines 324-335 (`const probe = (`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-14 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:32`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 32-43 (`class FakeEdge implements EdgeAgent.ProcessControl {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-15 no-sleep-in-test `packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:304`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 304-315 (`yield* Effect.sleep('20 millis');`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-16 no-try-catch-in-effect-code `packages/plugins/plugin-claude/src/agents/McpRelay.ts:112`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 112-123 (`const answer = async (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-17 namespace-brand-key-prefixing `packages/plugins/plugin-claude/src/agents/Projection.test.ts:20`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.84. The likeliest place is lines 20-31 (`describe('TurnProjection', () => {`, location confidence 0.25). Judged with added `test` context after a first pass of 0.37. This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-18 namespace-brand-key-prefixing `packages/plugins/plugin-claude/src/agents/Projection.ts:1`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.88. The likeliest place is lines 1-17 (`import type * as acp from '@agentclientprotocol/sdk';`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-19 log-fire-and-forget-rejections `packages/plugins/plugin-claude/src/agents/testing/fake-agent.ts:86`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.97. The likeliest place is lines 86-97 (`});`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-20 setter-must-not-own-transaction `packages/plugins/plugin-claude/src/agents/Workspace.ts:59`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.85. The likeliest place is lines 59-66 (`export const recordBranch = (chat: Chat.Chat, branch: string): void => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-21 log-fire-and-forget-rejections `packages/plugins/plugin-claude/src/capabilities/agent-launcher.ts:110`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.84. The likeliest place is lines 110-121 (`throw error;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-22 no-try-catch-in-effect-code `packages/plugins/plugin-claude/src/capabilities/agent-launcher.ts:128`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 128-140 (`export const parseReadyLine = (line: string): number => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f790a48e-23 no-casts `packages/plugins/plugin-claude/src/containers/index.ts:1`

**Resolved:** `ProjectFolder` is typed `ComponentType<ProjectFolderProps>` instead of `ComponentType<any>`.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 1-8 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-24 setter-must-not-own-transaction `packages/plugins/plugin-claude/src/containers/ProjectFolder/ProjectFolder.tsx:28`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.86. The likeliest place is lines 28-39 (`export const ProjectFolder = ({ project }: ProjectFolderProps) => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-25 namespace-export-with-internal-hiding `packages/plugins/plugin-claude/src/index.ts:1`

**Ignored:** `index.ts` keeps the package's existing namespace barrel; the move added one namespace export alongside the others.

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-9 (`export * from './agents/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-26 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.test.ts:104`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 104-115 (`const { chat } = yield* setup({ command: process.execPath, args: [FAKE_AGENT]...`, location confidence 0.60). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-27 headless-leak-check-per-workerd-plugin `packages/plugins/plugin-code/moon.yml:13`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `headless-leak-check-per-workerd-plugin` (Every plugin with a workerd variant has a React-leak check tracing only worker conditions, with a target of zero), p=0.95. The likeliest place is lines 13-24 (`command: >-`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f790a48e-28 no-casts `packages/plugins/plugin-code/src/containers/index.ts:1`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 1-10 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-29 one-test-suite-per-module `packages/plugins/plugin-dev-shell/src/operations/operations.test.ts:27`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.82. The likeliest place is lines 27-38 (`describe('dev shell operations', () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-30 code-not-in-strings `packages/plugins/plugin-dev-shell/src/vite-plugin/agent-host-middleware.ts:48`

**Ignored:** `SERVER_PROGRAM` is the three-line `node -e` entry that imports plugin-claude's real agent-server module; the logic it runs lives in that module, not in the string.

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.93. The likeliest place is lines 48-59 (`const { AgentSidecar } = await import(process.env.DX_AGENT_HOST_MODULE);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-31 code-not-in-strings `packages/plugins/plugin-dev-shell/src/vite-plugin/agent-host.test.ts:25`

**Resolved:** the fake ACP agent is a committed file, `fake-acp-agent.mjs`, copied into the test's agents directory.

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.91. The likeliest place is lines 25-31 (`const FAKE_AGENT = ``, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-32 code-not-in-strings `packages/plugins/plugin-dev-shell/src/vite-plugin/apply-edits-program.ts:21`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.96. The likeliest place is lines 21-29 (`const APPLY_EDITS_PROGRAM = `//`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-33 no-try-catch-in-effect-code `packages/plugins/plugin-dev-shell/src/vite-plugin/apply-edits-program.ts:51`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 51-62 (`const main = async () => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-34 code-not-in-strings `packages/plugins/plugin-dev-shell/src/vite-plugin/exec-runner.ts:48`

**Ignored:** the exec runner's bootstrap is spawned the same way as `SERVER_PROGRAM`, for the same descriptor-limit reason; authored with the move, not by this review's fixes.

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.97. The likeliest place is lines 48-51 (`const RUNNER_PROGRAM = ``, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-35 no-try-catch-in-effect-code `packages/plugins/plugin-dev-shell/src/vite-plugin/path-scope.ts:18`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 18-29 (`export const resolveWithin = (root: string, requested?: string): string => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-36 no-sleep-in-test `packages/plugins/plugin-dev-shell/src/vite-plugin/shell-middleware.test.ts:77`

**Ignored:** moved unchanged (or near-unchanged) from plugin-code/plugin-computer in this branch's runtime move; the flagged code predates this PR and is out of its scope.

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.82. The likeliest place is lines 77-88 (`test('kills a script that outruns its timeout, and the group it spawned', asy...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-37 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/create-object.ts:30`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 30-41 (`export default Capability.makeModule(`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-38 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.tsx:246`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 246-271 (`autoFocus,`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-39 story-for-new-ui-component `packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:141`

**Resolved:** `FeatureKanban.stories.tsx` renders the component alone and drags a card across columns; the container's `Kanban` story covers it with the plugin's operations.

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 141-152 (`export const FeatureKanban = ({ features, ...props }: FeatureKanbanProps) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f790a48e-40 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:29`

**Ignored:** the `ComponentType<any>` lazy exports near the flagged line (`ProjectArticle`) predate this PR; the lines this PR added are typed.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 29-32 (`export const ProjectArticle: ComponentType<any> = lazy(() =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-41 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:143`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 143-154 (`Stream.runForEach((event) =>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-42 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:215`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.89. The likeliest place is lines 215-226 (`updateProject((project) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-43 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.tsx:174`

**Resolved:** `FeatureKanban` is composable, so `Panel.Body asChild` styles the board itself and the wrapper div is gone.

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 174-185 (`onOpenObject={handleOpen}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-44 no-try-catch-in-effect-code `packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 26-35 (`const sourceOf = <R extends Relation.Unknown>(relation: R): Relation.SourceOf...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f790a48e-45 operations-resolve-database-from-service `packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:39`

**Ignored:** test seed helper writing to a database the story hands it; not an operation, so it has no service to resolve.

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.89. The likeliest place is lines 39-50 (`export const seed = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f790a48e-46 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:413`

**Ignored:** pre-existing on main; not changed by this PR.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 413-424 (`const mergeAtPath = (obj: any, path: readonly (string | number)[], value: any...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f790a48e-47 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:36`

**Ignored:** the generic signature for `Board.Column.Body` uses the same cast idiom as `Board.Root`, `Board.Content` and `Board.Column.Root` in this file: a forwardRef component cannot be generic without it.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 36-46 (`type BoardColumnProps<TColumn = any> = Pick<`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `03b33ae8b7d1c4efb3f461180728deb7288534f1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 47 violations written to fragments, 937 uncertain, 5719 clean, 0 unanswered
- left for an agentic reviewer: 143 batch(es)

```text
requests: 2680 (666 verdicts re-asked with context the model requested)
estimated input tokens: 16833217
billed input tokens: 15497314 (cost $0.6509)
measured chars per token: 3.26
```
