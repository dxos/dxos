---
branch: dm/bold-albattani-4nd4wv
commit: c313a83944e160a41e80b817a8a581df19106623
base: 346175bc41758ed985f7d79bec49739f9006a9e1
mode: fast
createdAt: 2026-10-02T09:26:22.424Z
isFinalized: true
groups: 110
rules: [effect-fn-not-hand-wrapped-gen, error-messages-carry-context, no-casts, no-invented-theme-tokens, structured-logging-not-console]
reviewId: c313a839
---

_2 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c313a839-1 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/query/query-result.ts:119
- c313a839-2 - ignored - no-casts - packages/core/echo/echo-client/src/query/query-result.ts:403
- c313a839-3 - ignored - no-invented-theme-tokens - packages/devtools/devtools/src/containers/cards/util.tsx:25
- c313a839-4 - ignored - no-casts - packages/devtools/devtools/src/hooks/useStats.ts:99
- c313a839-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73
- c313a839-6 - ignored - structured-logging-not-console - packages/sdk/app-framework/src/plugin-cli/main.ts:33

## Issues

# WARN c313a839-1 error-messages-carry-context `packages/core/echo/echo-client/src/query/query-result.ts:119`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 119-130 (`async first(opts?: { timeout?: number }): Promise<T> {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c313a839-2 no-casts `packages/core/echo/echo-client/src/query/query-result.ts:403`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 403-414 (`const _asResultRows = <T>(rows: readonly unknown[]): T[] => rows as unknown a...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN c313a839-3 no-invented-theme-tokens `packages/devtools/devtools/src/containers/cards/util.tsx:25`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 25-28 (`export const queryTimeClassName = (time: number): string | undefined =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c313a839-4 no-casts `packages/devtools/devtools/src/hooks/useStats.ts:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 99-110 (`}`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN c313a839-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 73-84 (`export const createDevtoolsExtension = (appGraphAtom: Atom.Atom<AppCapabiliti...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c313a839-6 structured-logging-not-console `packages/sdk/app-framework/src/plugin-cli/main.ts:33`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 33-43 (`return;`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `346175bc41758ed985f7d79bec49739f9006a9e1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 132 uncertain, 756 clean, 0 unanswered
- left for an agentic reviewer: 49 batch(es)

```text
requests: 398 (82 verdicts re-asked with context the model requested)
estimated input tokens: 2210181
billed input tokens: 2065093 (cost $0.0867)
measured chars per token: 3.21
```
