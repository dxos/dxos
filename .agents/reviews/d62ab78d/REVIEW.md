---
branch: dm/youthful-babbage-0jblmw
commit: d62ab78de085d907dd650e00880e52af053ae7e2
base: 6f6547ff000963073178731094a3c343fe37ed18
mode: fast
createdAt: 2026-10-23T16:07:40.448Z
isFinalized: true
groups: 140
rules: [atom-lifetime-bound-to-owner, bounded-live-state, extract-non-rendering-logic-from-component, inject-dependencies-via-constructor, no-casts, no-module-level-object-caches, no-try-catch-in-effect-code, reactive-state-via-atom-bridge, subscribe-where-you-read]
reviewId: d62ab78d
---

_2 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d62ab78d-1 - ignored - no-try-catch-in-effect-code - packages/apps/composer-app/src/vite/git.ts:34
- d62ab78d-2 - resolved - no-module-level-object-caches - packages/apps/composer-app/src/vite/git.ts:56
- d62ab78d-3 - resolved - bounded-live-state - packages/apps/composer-app/src/vite/git.ts:127
- d62ab78d-4 - resolved - inject-dependencies-via-constructor - packages/apps/composer-app/src/vite/git.ts:127
- d62ab78d-5 - resolved - no-module-level-object-caches - packages/common/diagram/src/nudge.ts:71
- d62ab78d-6 - ignored - subscribe-where-you-read - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:140
- d62ab78d-7 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:176
- d62ab78d-8 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:35
- d62ab78d-9 - resolved - no-module-level-object-caches - packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:171
- d62ab78d-10 - ignored - atom-lifetime-bound-to-owner - packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:309
- d62ab78d-11 - ignored - no-casts - packages/ui/ui-editor/src/extensions/review/diff.test.ts:143

## Issues

# WARN d62ab78d-1 no-try-catch-in-effect-code `packages/apps/composer-app/src/vite/git.ts:34`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 34-43 (`const git = async (dir: string, args: string[]): Promise<string | undefined> ...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN d62ab78d-2 no-module-level-object-caches `packages/apps/composer-app/src/vite/git.ts:56`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.84. The likeliest place is lines 56-71 (`const defaultBranch = async (dir: string): Promise<string | undefined> => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d62ab78d-3 bounded-live-state `packages/apps/composer-app/src/vite/git.ts:127`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.90. The likeliest place is lines 127-138 (`const cachedPullRequest = async (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN d62ab78d-4 inject-dependencies-via-constructor `packages/apps/composer-app/src/vite/git.ts:127`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.83. The likeliest place is lines 127-138 (`const cachedPullRequest = async (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN d62ab78d-5 no-module-level-object-caches `packages/common/diagram/src/nudge.ts:71`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.92. The likeliest place is lines 71-76 (`const runsCache = new WeakMap<readonly Point[], Run[]>();`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d62ab78d-6 subscribe-where-you-read `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:140`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.83. The likeliest place is lines 140-151 (`const [snapshot] = useObject(spec?.content);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN d62ab78d-7 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:176`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 176-187 (`const review = useMemo(() => (reviewText ? parseReview(reviewText) : undefine...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN d62ab78d-8 reactive-state-via-atom-bridge `packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:35`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.92. The likeliest place is lines 35-46 (`export const useLocalTexts = (keys: readonly string[]): ReadonlyMap<string, s...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN d62ab78d-9 no-module-level-object-caches `packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:171`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.96. The likeliest place is lines 171-180 (`...(options.layers && { layers: Object.fromEntries(options.layers.map((layer)...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN d62ab78d-10 atom-lifetime-bound-to-owner `packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:309`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.89. The likeliest place is lines 309-320 (`export const createDynamicProjection = ({`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d62ab78d-11 no-casts `packages/ui/ui-editor/src/extensions/review/diff.test.ts:143`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 143-155 (`});`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6f6547ff000963073178731094a3c343fe37ed18`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 361 uncertain, 444 clean, 0 unanswered
- left for an agentic reviewer: 85 batch(es)

```text
requests: 473 (184 verdicts re-asked with context the model requested)
estimated input tokens: 3569694
billed input tokens: 3459140 (cost $0.1453)
measured chars per token: 3.10
```

### Resolutions

- d62ab78d-1: ignored. `git.ts` is a Node dev-server plugin at the child-process and fetch boundary, outside Effect code, the same as its neighbour `file-system.ts`.
- d62ab78d-2, -3, -4: resolved. The pull-request cache lives in a `GitReader` the plugin creates once with its environment, capped by `MAX_PULL_REQUEST_LOOKUPS`.
- d62ab78d-5: resolved. The runs and boxes caches belong to a `LineCache` each `nudge` call creates.
- d62ab78d-6: ignored. The flagged `spec?.content.target` read predates this PR and sits under `useObject(spec?.content)`.
- d62ab78d-7: resolved. Diff-mode state moved into the `useSpecDiff` hook.
- d62ab78d-8: ignored. The flagged `useLocalTexts` predates this PR; the git hooks follow its polling pattern because git has no change stream to bridge.
- d62ab78d-9: resolved. The slots cache belongs to the projection that creates it and is passed to `layoutGraph`.
- d62ab78d-10: ignored. `Atom.keepAlive` in `createDynamicProjection` predates this PR.
- d62ab78d-11: ignored. The flagged test line has no cast.
