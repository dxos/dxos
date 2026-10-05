---
branch: claude/ai-service-mock-storybook-90afd6
commit: d6233359650c98ced02871bbb4dc7eac31caed1b
base: 40840cb49a5ed912cd43cab39e99eb4dcdd94d73
mode: fast
createdAt: 2026-10-01T09:01:58.289Z
isFinalized: true
groups: 56
rules: [event-handler-naming-convention, no-casts]
reviewId: d623335965
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d623335965-1 - ignored - event-handler-naming-convention - packages/sdk/client-services/src/internal/spaces/data-space.ts:69
- d623335965-2 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space.ts:703

## Issues

# WARN d623335965-1 event-handler-naming-convention `packages/sdk/client-services/src/internal/spaces/data-space.ts:69`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 69-85 (`beforeClose?: () => Promise<void>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d623335965-2 no-casts `packages/sdk/client-services/src/internal/spaces/data-space.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 703-722 (`@synchronized`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `40840cb49a5ed912cd43cab39e99eb4dcdd94d73`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 88 uncertain, 91 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 113 (39 verdicts re-asked with context the model requested)
estimated input tokens: 1063096
billed input tokens: 1053548 (cost $0.0442)
measured chars per token: 3.03
```
