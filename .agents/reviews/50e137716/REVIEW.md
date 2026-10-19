---
branch: HEAD
commit: 50e137716a5941a27e9b1434bab419f2969a603b
base: 5e1f127e1899cda6a3274d6569cf90bda99f6e92
mode: fast
createdAt: 2026-10-07T05:05:17.982Z
isFinalized: true
groups: 151
rules: [moon-yml-entrypoint-registration, no-sleep-in-test, test-real-scenario-not-narrower-proxy]
reviewId: 50e137716
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 50e137716-1 - ignored - moon-yml-entrypoint-registration - packages/core/compute/compute/package.json:109
- 50e137716-2 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.test.ts:104
- 50e137716-3 - ignored - no-sleep-in-test - packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:83
- 50e137716-4 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:26

## Issues

# WARN 50e137716-1 moon-yml-entrypoint-registration `packages/core/compute/compute/package.json:109`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 109-120 (`"types": "./dist/types/src/ServiceResolver.d.ts",`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

Ignored: this package registers entrypoints in `vite.config.ts` (`ts-vite-build`), not `moon.yml`; `ShellService` is registered there like every other subpath.

# WARN 50e137716-2 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.test.ts:104`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 104-115 (`const { chat } = yield* setup({ command: process.execPath, args: [FAKE_AGENT]...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

Ignored: a unit test of the process against a fake agent, which claims no end-to-end coverage; the real path is `src/e2e/ClaudeCode.e2e.test.ts`.

# WARN 50e137716-3 no-sleep-in-test `packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:83`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 83-94 (`const findRequest = (feed: Feed.Feed) =>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

Ignored: a manual e2e test waiting on a real external agent process, which has no event to await; it never runs in CI.

# WARN 50e137716-4 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:26`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 26-37 (`class FakeEdge implements EdgeAgent.ProcessControl {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

Ignored: a unit test of the turn projection over a fake EDGE; the real path is `plugin-claude/src/e2e/ClaudeCodeEdge.e2e.test.ts` against a local EDGE stack.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5e1f127e1899cda6a3274d6569cf90bda99f6e92`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 259 uncertain, 1148 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 622 (172 verdicts re-asked with context the model requested)
estimated input tokens: 4634223
billed input tokens: 4210251 (cost $0.1768)
measured chars per token: 3.30
```
