---
branch: claude/unified-plugin-services-017661
commit: 27517772ebbd7d0eb477c0b59bfe6d1016b6d104
base: 8d2c135a92508af8bdea10c5eca818f4384bbe88
mode: fast
createdAt: 2026-11-26T03:03:25.493Z
isFinalized: true
groups: 138
rules: [bounded-live-state, effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing, no-invented-theme-tokens, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: 27517772ebb
---

_1 error(s), 10 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 27517772ebb-1 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/contracts/NoteStore.ts:15
- 27517772ebb-2 - resolved - use-context-scoped-cancellation - packages/stories/stories-services/src/hosts/child-host.ts:89
- 27517772ebb-3 - resolved - no-invented-theme-tokens - packages/stories/stories-services/src/modules/NotesModule.tsx:53
- 27517772ebb-4 - resolved - bounded-live-state - packages/stories/stories-services/src/plugins/notes-plugin.ts:37
- 27517772ebb-5 - ignored - use-context-scoped-cancellation - packages/stories/stories-services/src/services/hosts.test.ts:139
- 27517772ebb-6 - resolved - no-sleep-in-test - packages/stories/stories-services/src/services/hosts.test.ts:330
- 27517772ebb-7 - resolved - effect-fn-not-hand-wrapped-gen - packages/stories/stories-services/src/services/Link.ts:88
- 27517772ebb-8 - resolved - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/services/Service.ts:1
- 27517772ebb-9 - resolved - use-context-scoped-cancellation - packages/stories/stories-services/src/services/ServiceHost.ts:282
- 27517772ebb-10 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/services/State.ts:1
- 27517772ebb-11 - resolved - effect-fn-not-hand-wrapped-gen - packages/stories/stories-services/src/services/State.ts:52

## Issues

# WARN 27517772ebb-1 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/contracts/NoteStore.ts:15`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 15-32 (`export const Contract = Service.make('org.dxos.stories.services.noteStore', {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27517772ebb-2 use-context-scoped-cancellation `packages/stories/stories-services/src/hosts/child-host.ts:89`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 89-100 (`}`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27517772ebb-3 no-invented-theme-tokens `packages/stories/stories-services/src/modules/NotesModule.tsx:53`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 53-65 (`{error && <p className='text-sm text-error-text'>{error}</p>}`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 27517772ebb-4 bounded-live-state `packages/stories/stories-services/src/plugins/notes-plugin.ts:37`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.87. The likeliest place is lines 37-48 (`put: ({ text }) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27517772ebb-5 use-context-scoped-cancellation `packages/stories/stories-services/src/services/hosts.test.ts:139`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 139-150 (`const until = (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27517772ebb-6 no-sleep-in-test `packages/stories/stories-services/src/services/hosts.test.ts:330`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 330-341 (`await new Promise((resolve) => setTimeout(resolve, 200));`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27517772ebb-7 effect-fn-not-hand-wrapped-gen `packages/stories/stories-services/src/services/Link.ts:88`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.93. The likeliest place is lines 88-94 (`export const serve = (router: RpcRouter.Service, port: MessagePort): Effect.E...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27517772ebb-8 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/services/Service.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-12 (`import * as Effect from 'effect/Effect';`, location confidence 0.64). Judged with added `public-api` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 27517772ebb-9 use-context-scoped-cancellation `packages/stories/stories-services/src/services/ServiceHost.ts:282`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 282-305 (`}),`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27517772ebb-10 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/services/State.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-13 (`import * as Effect from 'effect/Effect';`, location confidence 0.71). Judged with added `public-api` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# WARN 27517772ebb-11 effect-fn-not-hand-wrapped-gen `packages/stories/stories-services/src/services/State.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 52-63 (`export const emitter = <A>(): Emitter<A> => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8d2c135a92508af8bdea10c5eca818f4384bbe88`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 152 uncertain, 832 clean, 0 unanswered
- left for an agentic reviewer: 67 batch(es)

```text
requests: 417 (88 verdicts re-asked with context the model requested)
estimated input tokens: 2460070
billed input tokens: 2248409 (cost $0.0944)
measured chars per token: 3.28
```

### Resolution notes

- 27517772ebb-1 (ignored): `NoteStore.ts` carries the directive, is re-exported as `NoteStore`, is imported as a namespace everywhere, and none of its members is prefixed with `NoteStore`.
- 27517772ebb-2 (resolved): the probe's fallback timer is now cleared when the probe settles.
- 27517772ebb-3 (resolved): the flagged `text-error-text` is a theme token, but `text-description` on the same lines is not; it is replaced with `text-fg-muted` in the three modules.
- 27517772ebb-4 (resolved): the note store has `MAX_NOTES`, and a put past it fails with a `CallError`; covered by a test.
- 27517772ebb-5 (ignored): the `until` test helper's timer is the bound of the wait it guards and is cleared when the wait ends; it waits on a subscription, not a poll.
- 27517772ebb-6 (resolved): the two sleeps are replaced with rpc round trips and a signal from the failing provider.
- 27517772ebb-7 (resolved): `Link.serve` and `Link.call` are `Effect.fnUntraced`.
- 27517772ebb-8 (resolved): the errors of the `Service` namespace are `NotAvailableError`, `CallError` and `Failure`, no longer prefixed with `Service`; their tags are unchanged.
- 27517772ebb-9 (resolved): the wait for a peer's first catalog is `Effect.timeoutOption`, not a raw timer.
- 27517772ebb-10 (ignored): `State.ts` carries the directive, is re-exported as `State`, is imported as a namespace everywhere, and none of its members is prefixed with `State`.
- 27517772ebb-11 (resolved): the two `Stream.callback` bodies in `State.ts` are `Effect.fnUntraced`.
