---
branch: worktree-mdl-worker-dialect
commit: db832f837a443835eb0c1f6241b5dee7813354ca
base: 524906089ef496b70bf7b8012df48a700816940a
mode: fast
createdAt: 2026-11-12T11:08:14.558Z
isFinalized: true
groups: 84
rules: [dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, flat-layer-composition, no-casts, no-retries-or-skips-for-flaky-tests, no-try-catch-in-effect-code, structured-logging-not-console]
reviewId: db832f837a4
---

_2 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- db832f837a4-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-builder/src/bin/publish-release.ts:90
- db832f837a4-2 - ignored - structured-logging-not-console - packages/core/compute/plugin-builder/src/bin/publish-release.ts:90
- db832f837a4-3 - ignored - no-retries-or-skips-for-flaky-tests - packages/core/mesh/edge-client/src/edge-http-client.test.ts:18
- db832f837a4-4 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.test.ts:583
- db832f837a4-5 - ignored - dont-leak-internal-api-through-public-surface - packages/core/mesh/edge-client/src/edge-http-client.ts:289
- db832f837a4-6 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:646
- db832f837a4-7 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:1174
- db832f837a4-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-registry/src/commands/registry/publish.ts:318

## Issues

# WARN db832f837a4-1 no-try-catch-in-effect-code `packages/core/compute/plugin-builder/src/bin/publish-release.ts:90`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 90-101 (`console.log(`✓ ${key} ${version} published: ${moduleUrl}${load}`);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN db832f837a4-2 structured-logging-not-console `packages/core/compute/plugin-builder/src/bin/publish-release.ts:90`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 90-101 (`console.log(`✓ ${key} ${version} published: ${moduleUrl}${load}`);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN db832f837a4-3 no-retries-or-skips-for-flaky-tests `packages/core/mesh/edge-client/src/edge-http-client.test.ts:18`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.91. The likeliest place is lines 18-43 (`const DEV_SERVER = 'https://dev.dxos.network';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR db832f837a4-4 no-casts `packages/core/mesh/edge-client/src/edge-http-client.test.ts:583`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 583-609 (`const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN db832f837a4-5 dont-leak-internal-api-through-public-surface `packages/core/mesh/edge-client/src/edge-http-client.ts:289`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 289-309 (`export type EdgeAiService =`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR db832f837a4-6 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:646`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 646-669 (`key: string,`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN db832f837a4-7 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:1174`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.87. The likeliest place is lines 1174-1197 (`Effect.withSpan('EdgeHttpClient'),`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN db832f837a4-8 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-registry/src/commands/registry/publish.ts:318`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 318-329 (`const readBundleFiles = (outdir: string) =>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `524906089ef496b70bf7b8012df48a700816940a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 121 uncertain, 74 clean, 0 unanswered
- left for an agentic reviewer: 70 batch(es)

```text
requests: 117 (72 verdicts re-asked with context the model requested)
estimated input tokens: 1716835
billed input tokens: 1757978 (cost $0.0738)
measured chars per token: 2.93
```
