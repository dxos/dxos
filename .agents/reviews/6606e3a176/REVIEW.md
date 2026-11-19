---
branch: claude/agent-code-mode-ops-types
commit: 6606e3a176913946cc60d6bc63bb4806bbcc539a
base: 6cd526c4ebfb765f665818c2a5dd65121fb65bc7
mode: fast
createdAt: 2026-11-19T01:17:00.062Z
isFinalized: true
groups: 74
rules: [call-effect-api-not-promise-bridge, code-not-in-strings, errors-extend-base-error, no-casts, per-test-mutable-fixtures]
reviewId: 6606e3a176
---

_2 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 6606e3a176-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:43
- 6606e3a176-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:188
- 6606e3a176-3 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/agent-code-mode/src/code-mode.test.ts:592
- 6606e3a176-4 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:29
- 6606e3a176-5 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:118

## Issues

# WARN 6606e3a176-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:43`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.85. The likeliest place is lines 43-53 (`class Task extends Type.makeObject<Task>(DXN.make(TASK_TYPENAME, '0.1.0'))(`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6606e3a176-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:188`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.87. The likeliest place is lines 188-199 (`const tasks = await query('${TASK_TYPENAME}', { status: 'open' });`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6606e3a176-3 call-effect-api-not-promise-bridge `packages/core/compute/agent-code-mode/src/code-mode.test.ts:592`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.90. The likeliest place is lines 592-603 (`'promise',`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6606e3a176-4 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:29`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.94. The likeliest place is lines 29-40 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6606e3a176-5 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 118-129 (`);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6cd526c4ebfb765f665818c2a5dd65121fb65bc7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 65 uncertain, 36 clean, 0 unanswered
- left for an agentic reviewer: 58 batch(es)

```text
requests: 58 (42 verdicts re-asked with context the model requested)
estimated input tokens: 682969
billed input tokens: 665465 (cost $0.0279)
measured chars per token: 3.08
```
