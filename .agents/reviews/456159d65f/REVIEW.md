---
branch: dm/gifted-edison-5dva1h
commit: 456159d65f145fc76a56d4706c98e6e397c10ffd
base: c63706215b0d57dde34e968a521749b11720152b
mode: fast
createdAt: 2026-11-12T11:14:08.837Z
isFinalized: true
groups: 138
rules: [deprecated-tag-must-be-accurate, empty-container-uses-empty, namespace-brand-key-prefixing, no-casts, no-try-catch-in-effect-code, story-for-new-ui-component]
reviewId: 456159d65f
---

_2 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 456159d65f-1 - resolved - empty-container-uses-empty - packages/plugins/plugin-registry/src/components/SpacePluginsPanel/SpacePluginsPanel.tsx:42
- 456159d65f-2 - ignored - no-casts - packages/plugins/plugin-registry/src/containers/index.ts:1
- 456159d65f-3 - ignored - story-for-new-ui-component - packages/plugins/plugin-registry/src/containers/SpacePluginsSettings/SpacePluginsSettings.tsx:25
- 456159d65f-4 - ignored - no-casts - packages/sdk/app-toolkit/src/echo/AppSpace.test.ts:105
- 456159d65f-5 - ignored - namespace-brand-key-prefixing - packages/sdk/app-toolkit/src/echo/AppSpace.ts:267
- 456159d65f-6 - ignored - no-try-catch-in-effect-code - packages/sdk/app-toolkit/src/echo/AppSpace.ts:274
- 456159d65f-7 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-protocol/src/types/SpaceProperties.ts:21

## Issues

# WARN 456159d65f-1 empty-container-uses-empty `packages/plugins/plugin-registry/src/components/SpacePluginsPanel/SpacePluginsPanel.tsx:42`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.82. The likeliest place is lines 42-53 (`export const SpacePluginsPanel = ({ plugins, scoped, onChange, onReset }: Spa...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** the hand-styled `<p className='text-description'>` is now `<Status.Empty>`, as
`plugin-agent`'s `AgentState` renders the same inline empty case.

# ERROR 456159d65f-2 no-casts `packages/plugins/plugin-registry/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 1-13 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `ComponentType<any>` is this file's existing shape — every one of its five other lazy
container exports carries it, because `lazy()` cannot infer a default export's props across the
boundary. This PR adds a sixth line in that shape; retyping the module is not this PR's change.

# WARN 456159d65f-3 story-for-new-ui-component `packages/plugins/plugin-registry/src/containers/SpacePluginsSettings/SpacePluginsSettings.tsx:25`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 25-33 (`export const SpacePluginsSettings = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** the story is at the level the rule asks for. `SpacePluginsPanel` is the presentational
component and ships three stories, one of them a `Test` story run in chromium; `SpacePluginsSettings`
is the wired container, and no container in `plugin-registry` has a story, since a container's only
behaviour is the capability lookup a story would have to fake.

# ERROR 456159d65f-4 no-casts `packages/sdk/app-toolkit/src/echo/AppSpace.test.ts:105`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 105-113 (`});`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** the casts are `makeSpace` / `makeClosedSpace` / `makeReadySpace`, which exist on
`origin/main` and carry their own justification. This PR adds test cases that call them and no new
cast.

# WARN 456159d65f-5 namespace-brand-key-prefixing `packages/sdk/app-toolkit/src/echo/AppSpace.ts:267`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 267-273 (`const DEFAULT_SPACE_KEY = '__DEFAULT__';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `DEFAULT_SPACE_KEY` is `origin/main`'s code. It is the literal older clients actually
wrote, so it cannot be renamed without breaking the legacy read it exists to perform.

# WARN 456159d65f-6 no-try-catch-in-effect-code `packages/sdk/app-toolkit/src/echo/AppSpace.ts:274`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 274-285 (`export const isLegacyDefaultSpace = (space: Space): boolean => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `isLegacyDefaultSpace` is `origin/main`'s code and is not Effect code; its `try/catch`
guards a property access on a closed space, which throws synchronously.

# WARN 456159d65f-7 deprecated-tag-must-be-accurate `packages/sdk/client-protocol/src/types/SpaceProperties.ts:21`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.89. The likeliest place is lines 21-32 (`invocationTraceFeed: Schema.optional(Ref.Ref(Feed.Feed)),`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `invocationTraceFeed` is `origin/main`'s field and carries no `@deprecated` tag; it is a
context line beside the `plugins` field this PR adds.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c63706215b0d57dde34e968a521749b11720152b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 255 uncertain, 406 clean, 0 unanswered
- left for an agentic reviewer: 71 batch(es)

```text
requests: 375 (162 verdicts re-asked with context the model requested)
estimated input tokens: 1905600
billed input tokens: 1770309 (cost $0.0744)
measured chars per token: 3.23
```

