---
branch: HEAD
commit: 245650b6f329536c0b68889121abe475889ef5bc
base: c63706215b0d57dde34e968a521749b11720152b
mode: fast
createdAt: 2026-11-10T15:58:15.065Z
isFinalized: true
groups: 76
rules: [code-not-in-strings, no-casts]
reviewId: 245650b6f3
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 245650b6f3-1 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:168
- 245650b6f3-2 - resolved - no-casts - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:107
- 245650b6f3-3 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:154

## Issues

# WARN 245650b6f3-1 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:168`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.83. The likeliest place is lines 168-175 (`const modules = (code: string): Record<string, { js: string }> => ({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 245650b6f3-2 no-casts `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 107-118 (`const setup = () => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 245650b6f3-3 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:154`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.88. The likeliest place is lines 154-165 (`const { rows, run } = setup();`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c63706215b0d57dde34e968a521749b11720152b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 73 uncertain, 73 clean, 0 unanswered
- left for an agentic reviewer: 54 batch(es)

```text
requests: 86 (51 verdicts re-asked with context the model requested)
estimated input tokens: 653865
billed input tokens: 616866 (cost $0.0259)
measured chars per token: 3.18
```
