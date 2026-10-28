---
branch: dm/space-root-json
commit: dbc0f39029e88221a9e69f4a20758c945598a0f9
base: 2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141
mode: fast
createdAt: 2026-10-28T13:01:31.656Z
isFinalized: true
groups: 140
rules: [consistent-private-field-convention, deferred-callback-owns-its-context, minimal-precise-tests, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-try-catch-in-effect-code, test-asserts-real-behavior, use-context-scoped-cancellation]
reviewId: dbc0f390
---

_6 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- dbc0f390-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:175
- dbc0f390-2 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46
- dbc0f390-3 - ignored - minimal-precise-tests - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46
- dbc0f390-4 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:155
- dbc0f390-5 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/echo-client.ts:311
- dbc0f390-6 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:347
- dbc0f390-7 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:384
- dbc0f390-8 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2014
- dbc0f390-9 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2071
- dbc0f390-10 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2935
- dbc0f390-11 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2935
- dbc0f390-12 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:145
- dbc0f390-13 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:171
- dbc0f390-14 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:303
- dbc0f390-15 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:467
- dbc0f390-16 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:1050
- dbc0f390-17 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165

## Issues

# WARN dbc0f390-1 no-try-catch-in-effect-code `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:175`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 175-186 (`await this._dataService.changeDocument(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-2 test-asserts-real-behavior `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.93. The likeliest place is lines 46-57 (`test('update handle with foreign mutation', async () => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-3 minimal-precise-tests `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.81. The likeliest place is lines 46-57 (`test('update handle with foreign mutation', async () => {`, location confidence 0.38). Judged with added `diff, test` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# ERROR dbc0f390-4 no-casts `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:155`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 155-166 (`constructor({ documentId, initialValue, passive, onDelete }: DocHandleProxyOp...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-5 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/echo-client.ts:311`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 311-322 (`}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-6 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:347`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 347-358 (`private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<strin...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR dbc0f390-7 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 384-407 (`getObjectDocHandle(db.getObjectById(ids[0])).change((newDoc: any) => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-8 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2014`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 2014-2037 (`return undefined;`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-9 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2071`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 2071-2094 (`#onRootPassiveUpdate(handle: DocHandleProxy<DatabaseDirectory>, { directory, ...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR dbc0f390-10 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2935`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 2935-2958 (`request.stateChanged.on(this._ctx!, () => this._scheduleThrottledUpdate([obje...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-11 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2935`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 2935-2958 (`request.stateChanged.on(this._ctx!, () => this._scheduleThrottledUpdate([obje...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR dbc0f390-12 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:145`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 145-156 (`const delta = sent.get(handle.documentId)!;`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-13 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:171`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 171-182 (`private async _sendWhenLoaded(documentId: DocumentId, syncState: DocSyncState...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR dbc0f390-14 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 303-314 (`this._sendUpdatesJob!.trigger();`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-15 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:467`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 467-490 (`let running = 0;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR dbc0f390-16 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:1050`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1050-1073 (`expect(JSON.parse(row(saved)!.documentJson!).title).toBe(saved);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN dbc0f390-17 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 17 violations written to fragments, 517 uncertain, 325 clean, 0 unanswered
- left for an agentic reviewer: 92 batch(es)

```text
requests: 593 (329 verdicts re-asked with context the model requested)
estimated input tokens: 7666713
billed input tokens: 7722220 (cost $0.3243)
measured chars per token: 2.98
```
