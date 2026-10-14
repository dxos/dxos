---
branch: dm/pensive-curie-hlco63
commit: ec4f61b0038f63f940f2005be456c405848befa9
base: 6a0206164f82d856daf1e32037e8ed9557e3c6f5
mode: fast
createdAt: 2026-10-14T11:50:03.341Z
isFinalized: true
groups: 134
rules: [bounded-live-state, no-lint-suppression-to-pass, no-module-level-object-caches, test-real-scenario-not-narrower-proxy]
reviewId: ec4f61b003
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ec4f61b003-1 - ignored - no-lint-suppression-to-pass - packages/common/sql-sqlite/src/platform/sql-storage-browser.ts:19
- ec4f61b003-2 - ignored - no-lint-suppression-to-pass - packages/common/sql-sqlite/src/platform/sql-storage.node.test.ts:1
- ec4f61b003-3 - ignored - bounded-live-state - packages/core/compute/pipeline-rdf/src/store/fact-store-live.ts:96
- ec4f61b003-4 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/pipeline-rdf/src/testing/harness/generate-facts.test.ts:42
- ec4f61b003-5 - ignored - no-module-level-object-caches - packages/core/compute/sparql-sqlite/src/testing/w3c/harness.ts:134

## Issues

# WARN ec4f61b003-1 no-lint-suppression-to-pass `packages/common/sql-sqlite/src/platform/sql-storage-browser.ts:19`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.86. The likeliest place is lines 19-30 (`const load: Effect.Effect<Loaded, SqlError.SqlError> = Effect.suspend(() =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec4f61b003-2 no-lint-suppression-to-pass `packages/common/sql-sqlite/src/platform/sql-storage.node.test.ts:1`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.82. The likeliest place is lines 1-12 (`import * as WaSqlite from '@effect/wa-sqlite';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ec4f61b003-3 bounded-live-state `packages/core/compute/pipeline-rdf/src/store/fact-store-live.ts:96`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 96-107 (`const open = (storage: SqlStorage, transactionSync: NonNullable<Options['tran...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec4f61b003-4 test-real-scenario-not-narrower-proxy `packages/core/compute/pipeline-rdf/src/testing/harness/generate-facts.test.ts:42`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.84. The likeliest place is lines 42-53 (`const STUB_PAYLOADS: readonly unknown[] = [`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec4f61b003-5 no-module-level-object-caches `packages/core/compute/sparql-sqlite/src/testing/w3c/harness.ts:134`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 134-146 (`try {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Dismissals

All five are ignored as false positives or code this PR did not introduce:

- 1, 2: wa-sqlite's emscripten build is only reachable by its `dist/` path, and the package already imports it the same way under the same disable in `OpfsWorker.ts`, `opfs-client.ts` and `sqlite-module.node.test.ts`.
- 3: `described` is rebuilt per `putFacts` call from the store's own predicates; it is not a collection of live entities.
- 4: the diff only swaps the test's store layer for `FactStoreLive.layerMemory`; the stubbed AI payloads predate this PR.
- 5: the dataset-keyed `WeakMap` is test-harness code from the already-merged sparql-sqlite PR; this PR only changes how each engine's storage is opened.

### System One pass

- model: jev-latest
- base for context: `6a0206164f82d856daf1e32037e8ed9557e3c6f5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 316 uncertain, 523 clean, 0 unanswered
- left for an agentic reviewer: 75 batch(es)

```text
requests: 481 (216 verdicts re-asked with context the model requested)
estimated input tokens: 2835329
billed input tokens: 2775104 (cost $0.1166)
measured chars per token: 3.07
```
