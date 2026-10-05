---
branch: HEAD
commit: d4faa7fed365d4a84bb428ba285531e3a4ccb68a
base: 3672aff4d201a89624e7e076588d08325f89e720
mode: fast
createdAt: 2026-10-04T14:52:31.957Z
isFinalized: true
groups: 53
rules: [no-casts, structured-logging-not-console]
reviewId: d4faa7fed3
---

_3 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d4faa7fed3-1 - ignored - structured-logging-not-console - packages/apps/composer-app/src/vite/boot-chunking.ts:52
- d4faa7fed3-2 - ignored - no-casts - packages/apps/composer-app/src/vite/trace-boot-leak.ts:65
- d4faa7fed3-3 - ignored - structured-logging-not-console - packages/apps/composer-app/src/vite/trace-boot-leak.ts:89
- d4faa7fed3-4 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354
- d4faa7fed3-5 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:83

## Issues

# WARN d4faa7fed3-1 structured-logging-not-console `packages/apps/composer-app/src/vite/boot-chunking.ts:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 52-60 (`const defaultLog = {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d4faa7fed3-2 no-casts `packages/apps/composer-app/src/vite/trace-boot-leak.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 65-76 (`while (queue.length > 0) {`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN d4faa7fed3-3 structured-logging-not-console `packages/apps/composer-app/src/vite/trace-boot-leak.ts:89`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 89-100 (`const path: string[] = [];`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d4faa7fed3-4 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 354-365 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d4faa7fed3-5 no-casts `packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 83-92 (`export const useOptionalAtomCapability = <T>(atomCapability: Capability.Inter...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3672aff4d201a89624e7e076588d08325f89e720`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 87 uncertain, 157 clean, 0 unanswered
- left for an agentic reviewer: 35 batch(es)

```text
requests: 146 (52 verdicts re-asked with context the model requested)
estimated input tokens: 997804
billed input tokens: 950536 (cost $0.0399)
measured chars per token: 3.15
```
