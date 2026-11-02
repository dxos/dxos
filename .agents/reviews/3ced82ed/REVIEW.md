---
branch: dm/eloquent-ptolemy-grnoa2
commit: 3ced82ed58b47bb77225a17ccf576485e53115b4
base: 9ee4560e1c976286796c5758a0634e66fe45256e
mode: fast
createdAt: 2026-10-26T14:41:18.884Z
isFinalized: true
groups: 145
rules: [effect-fn-not-hand-wrapped-gen, error-messages-carry-context, flat-layer-composition, inline-obj-parent, no-casts, no-mixed-promise-effect-lifecycle]
reviewId: 3ced82ed
---

_1 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3ced82ed-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/capabilities/connector.ts:30
- 3ced82ed-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/repo.ts:44
- 3ced82ed-3 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:179
- 3ced82ed-4 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:179
- 3ced82ed-5 - ignored - error-messages-carry-context - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:191
- 3ced82ed-6 - resolved - inline-obj-parent - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:311
- 3ced82ed-7 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/operations/sync.test.ts:527
- 3ced82ed-8 - ignored - inline-obj-parent - packages/plugins/plugin-github/src/operations/sync.ts:359
- 3ced82ed-9 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/services/github-api.ts:280
- 3ced82ed-10 - ignored - no-casts - packages/plugins/plugin-github/src/services/github-api.ts:821

## Issues

# WARN 3ced82ed-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/capabilities/connector.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 30-41 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3ced82ed-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/repo.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.93. The likeliest place is lines 44-55 (`export const ensureRepo = (repo: RepoDescriptor) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3ced82ed-3 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:179`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 179-190 (`const services = Layer.mergeAll(`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3ced82ed-4 flat-layer-composition `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:179`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 179-190 (`const services = Layer.mergeAll(`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3ced82ed-5 error-messages-carry-context `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:191`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 191-202 (`throw new Error('the token is stored on the object');`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3ced82ed-6 inline-obj-parent `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:311`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.80. The likeliest place is lines 311-322 (`);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3ced82ed-7 flat-layer-composition `packages/plugins/plugin-github/src/operations/sync.test.ts:527`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 527-538 (`Effect.provideService(FetchHttpClient.Fetch, githubFetch(issues)),`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3ced82ed-8 inline-obj-parent `packages/plugins/plugin-github/src/operations/sync.ts:359`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.80. The likeliest place is lines 359-382 (`export const upsertMilestone = Effect.fn('upsertMilestone')(function* (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3ced82ed-9 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/services/github-api.ts:280`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 280-298 (`const githubRequest = <T>(build: () => HttpClientRequest.HttpClientRequest, s...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3ced82ed-10 no-casts `packages/plugins/plugin-github/src/services/github-api.ts:821`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 821-849 (`export type IssueUpdateInput = {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9ee4560e1c976286796c5758a0634e66fe45256e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 10 violations written to fragments, 457 uncertain, 364 clean, 0 unanswered
- left for an agentic reviewer: 84 batch(es)

```text
requests: 464 (313 verdicts re-asked with context the model requested)
estimated input tokens: 4248018
billed input tokens: 4127431 (cost $0.1734)
measured chars per token: 3.09
```
