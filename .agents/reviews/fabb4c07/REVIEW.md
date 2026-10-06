---
branch: claude/echo-local-database-integration-ah4pda
commit: fabb4c076e4254c3bc0239951ed6a2faa3e193b3
base: 9763967751607157bbfbd7754c9fce5d3e4dda68
mode: fast
createdAt: 2026-10-06T05:20:02.359Z
isFinalized: true
groups: 103
rules: [consistent-private-field-convention, dont-leak-internal-api-through-public-surface, error-messages-carry-context, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: fabb4c07
---

_7 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fabb4c07-1 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:384
- fabb4c07-2 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:1000
- fabb4c07-3 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/hypergraph.ts:984
- fabb4c07-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:624
- fabb4c07-5 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1002
- fabb4c07-6 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1290
- fabb4c07-7 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1770
- fabb4c07-8 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:239
- fabb4c07-9 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:383
- fabb4c07-10 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/echo-network-adapter.test.ts:110
- fabb4c07-11 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:385
- fabb4c07-12 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:385
- fabb4c07-13 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:57
- fabb4c07-14 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- fabb4c07-15 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- fabb4c07-16 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:1196
- fabb4c07-17 - resolved - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:1975
- fabb4c07-18 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-planner.ts:1327

## Issues

# WARN fabb4c07-1 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:384`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 384-389 (`const timer = setTimeout(settle, ROOT_LINK_WAIT_TIMEOUT);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fabb4c07-2 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:1000`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1000-1028 (`const seededMeta = (obj as any)[MetaId] as EntityMeta | undefined;`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-3 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/hypergraph.ts:984`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 984-1006 (`export const OBJECT_DIAGNOSTICS = new Map<string, ObjectDiagnostic>();`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-4 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:624`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 624-647 (`}`, location confidence 0.26). Judged with added `imports, public-api` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-5 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1002`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 1002-1025 (`if (opts?.preserveHistory) {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fabb4c07-6 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1290`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1290-1313 (`const handle = this._repo.getHandle(documentId as any);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-7 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1770`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 1770-1793 (`}`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fabb4c07-8 no-casts `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:239`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 239-262 (`expect((await asyncTimeout(client.find<any>(handle.url), 1000))!.doc().text)....`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-9 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:383`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 383-406 (`await connectAdapters(adapters, { noEmitPeerCandidate: true });`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fabb4c07-10 no-casts `packages/core/echo/echo-host/src/automerge/echo-network-adapter.test.ts:110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 110-121 (`expect((adapter as any)._connections.get(ANOTHER_PEER_ID)).to.eq(entry);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fabb4c07-11 no-casts `packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 385-393 (`export const createEchoPeerMetadata = (): PeerMetadata =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-12 namespace-brand-key-prefixing `packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:385`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.85. The likeliest place is lines 385-393 (`export const createEchoPeerMetadata = (): PeerMetadata =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-13 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:57`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 57-68 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fabb4c07-14 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-15 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 812-835 (`trace.details = JSON.stringify({ id: this._id, query: Query.pretty(Query.from...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-16 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:1196`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 1196-1219 (`default:`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN fabb4c07-17 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:1975`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.86. The likeliest place is lines 1975-1998 (`#isReachable(from: SpaceId, to: SpaceId): boolean {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fabb4c07-18 no-casts `packages/core/echo/echo-host/src/query/query-planner.ts:1327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 1327-1350 (`const newSteps = [...processedSteps];`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9763967751607157bbfbd7754c9fce5d3e4dda68`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 18 violations written to fragments, 193 uncertain, 635 clean, 0 unanswered
- left for an agentic reviewer: 53 batch(es)

```text
requests: 500 (122 verdicts re-asked with context the model requested)
estimated input tokens: 6973163
billed input tokens: 6915484 (cost $0.2905)
measured chars per token: 3.03
```
