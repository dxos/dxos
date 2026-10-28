---
branch: dm/space-root-json
commit: 3597a130719fd373323e5de621de47eafa02c7de
base: 2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141
mode: fast
createdAt: 2026-10-28T12:24:47.812Z
isFinalized: true
groups: 140
rules: [consistent-private-field-convention, deferred-callback-owns-its-context, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-try-catch-in-effect-code, prefer-branded-types-over-raw-primitives, test-asserts-real-behavior, use-context-scoped-cancellation]
reviewId: 3597a130
---

_6 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3597a130-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:175
- 3597a130-2 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46
- 3597a130-3 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:147
- 3597a130-4 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/echo-client.ts:311
- 3597a130-5 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:347
- 3597a130-6 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:384
- 3597a130-7 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:226
- 3597a130-8 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:346
- 3597a130-9 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:418
- 3597a130-10 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/core-db/entity-manager.ts:586
- 3597a130-11 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1256
- 3597a130-12 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:145
- 3597a130-13 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:171
- 3597a130-14 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:303
- 3597a130-15 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:467
- 3597a130-16 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:1050
- 3597a130-17 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165

## Issues

# WARN 3597a130-1 no-try-catch-in-effect-code `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:175`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 175-186 (`await this._dataService.changeDocument(`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-2 test-asserts-real-behavior `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.93. The likeliest place is lines 46-57 (`test('update handle with foreign mutation', async () => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3597a130-3 no-casts `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:147`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 147-158 (`constructor({ documentId, initialValue, passive, onDelete }: DocHandleProxyOp...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-4 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/echo-client.ts:311`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 311-322 (`}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-5 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:347`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 347-358 (`private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<strin...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3597a130-6 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 384-407 (`getObjectDocHandle(db.getObjectById(ids[0])).change((newDoc: any) => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-7 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:226`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 226-249 (`#unwatchRoot: CleanupFn | undefined = undefined;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-8 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:346`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 346-369 (`await this._repoProxy.open();`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-9 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:418`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 418-441 (`} catch (err) {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-10 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/core-db/entity-manager.ts:586`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.80. The likeliest place is lines 586-609 (`placeIndexRow(id: EntityId, documentId: string, decode: () => SnapshotState |...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3597a130-11 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1256-1279 (`delete draft.links![id];`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3597a130-12 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:145`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 145-156 (`const delta = sent.get(handle.documentId)!;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-13 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:171`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 171-182 (`private async _sendWhenLoaded(documentId: DocumentId, syncState: DocSyncState...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3597a130-14 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 303-314 (`this._sendUpdatesJob!.trigger();`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-15 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:467`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 467-490 (`let running = 0;`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3597a130-16 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:1050`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 1050-1073 (`expect(JSON.parse(row(saved)!.documentJson!).title).toBe(saved);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3597a130-17 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 17 violations written to fragments, 515 uncertain, 327 clean, 0 unanswered
- left for an agentic reviewer: 93 batch(es)

```text
requests: 588 (313 verdicts re-asked with context the model requested)
estimated input tokens: 7427198
billed input tokens: 7491582 (cost $0.3146)
measured chars per token: 2.97
```
