---
branch: dm/modest-bardeen-9cgp4l
commit: 473fd5e898129bc1afbe67f876dfa272b14406a3
base: bb2b6723db1f3f3bf24241b5bdd04b47d97470bd
mode: fast
createdAt: 2026-10-05T08:36:08.455Z
isFinalized: true
groups: 98
rules: [test-asserts-real-behavior]
reviewId: 473fd5e8
---

_0 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 473fd5e8-1 - ignored - test-asserts-real-behavior - packages/plugins/plugin-github/src/GitHubPlugin.workerd.test.ts:15
- 473fd5e8-2 - ignored - test-asserts-real-behavior - packages/plugins/plugin-google/src/GooglePlugin.workerd.test.ts:14
- 473fd5e8-3 - ignored - test-asserts-real-behavior - packages/plugins/plugin-inbox/src/InboxPlugin.workerd.test.ts:15
- 473fd5e8-4 - ignored - test-asserts-real-behavior - packages/plugins/plugin-jmap/src/JmapPlugin.workerd.test.ts:14
- 473fd5e8-5 - ignored - test-asserts-real-behavior - packages/plugins/plugin-kanban/src/KanbanPlugin.workerd.test.ts:14
- 473fd5e8-6 - ignored - test-asserts-real-behavior - packages/plugins/plugin-markdown/src/MarkdownPlugin.workerd.test.ts:14

## Issues

# WARN 473fd5e8-1 test-asserts-real-behavior `packages/plugins/plugin-github/src/GitHubPlugin.workerd.test.ts:15`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.83. The likeliest place is lines 15-24 (`describe('GitHubPlugin in workerd', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 473fd5e8-2 test-asserts-real-behavior `packages/plugins/plugin-google/src/GooglePlugin.workerd.test.ts:14`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.85. The likeliest place is lines 14-20 (`describe('GooglePlugin in workerd', () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 473fd5e8-3 test-asserts-real-behavior `packages/plugins/plugin-inbox/src/InboxPlugin.workerd.test.ts:15`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 15-22 (`describe('InboxPlugin in workerd', () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 473fd5e8-4 test-asserts-real-behavior `packages/plugins/plugin-jmap/src/JmapPlugin.workerd.test.ts:14`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 14-20 (`describe('JmapPlugin in workerd', () => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 473fd5e8-5 test-asserts-real-behavior `packages/plugins/plugin-kanban/src/KanbanPlugin.workerd.test.ts:14`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 14-22 (`describe('KanbanPlugin in workerd', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 473fd5e8-6 test-asserts-real-behavior `packages/plugins/plugin-markdown/src/MarkdownPlugin.workerd.test.ts:14`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.81. The likeliest place is lines 14-22 (`describe('MarkdownPlugin in workerd', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bb2b6723db1f3f3bf24241b5bdd04b47d97470bd`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 138 uncertain, 630 clean, 0 unanswered
- left for an agentic reviewer: 33 batch(es)

```text
requests: 377 (89 verdicts re-asked with context the model requested)
estimated input tokens: 1302610
billed input tokens: 1184910 (cost $0.0498)
measured chars per token: 3.30
```
