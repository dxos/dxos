---
branch: HEAD
commit: ae29eb7b5c5ac1c83d5a4f862f1bf39af3f6ee48
base: origin/main
mode: fast
createdAt: 2026-10-09T12:26:12.247Z
isFinalized: true
groups: 48
rules: [no-casts]
reviewId: ae29eb7b
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ae29eb7b-1 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:306

## Issues

# ERROR ae29eb7b-1 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:306`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 306-317 (`(path, type, value) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** the cast is the pre-existing `let parsedValue = value as any;` in `onValueChange`; this PR only changes the log line above it, and retyping the number parse is out of scope for a log-leak fix.

## Appendix

### System One pass

- model: jev-latest
- base for context: `origin/main`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 33 uncertain, 42 clean, 0 unanswered
- left for an agentic reviewer: 29 batch(es)

```text
requests: 47 (22 verdicts re-asked with context the model requested)
estimated input tokens: 409434
billed input tokens: 404243 (cost $0.0170)
measured chars per token: 3.04
```
