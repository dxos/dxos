# System One pass — .agents/reviews/9c6b52066b

- model: jev-latest
- base for context: `b3e304f94044029e65bb8fcdfed4907ad984119d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 26 uncertain, 114 clean, 0 unanswered

```text
requests: 66 (11 verdicts re-asked with context the model requested)
estimated input tokens: 241052
billed input tokens: 231056 (cost $0.0097)
measured chars per token: 3.13
```

## Still needs an agentic reviewer

Spawn one subagent per line below (21 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 29 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 31 as staged in STAGING.md
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-github/src/walkthrough/headings.test.ts` (p=0.18), `packages/plugins/plugin-github/src/walkthrough/headings.ts` (p=0.22), `packages/ui/react-ui/src/hooks/useIconHref.ts` (p=0.18), `packages/ui/react-ui/src/playground/experimental.stories.tsx` (p=0.27)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-github/src/walkthrough/headings.test.ts` (p=0.23), `packages/plugins/plugin-github/src/walkthrough/headings.ts` (p=0.38), `packages/ui/react-ui/src/hooks/useIconHref.ts` (p=0.26), `packages/ui/react-ui/src/playground/experimental.stories.tsx` (p=0.29)
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-github/src/walkthrough/headings.ts` (p=0.23), `packages/ui/react-ui/src/hooks/useIconHref.ts` (p=0.18), `packages/ui/react-ui/src/playground/experimental.stories.tsx` (p=0.29)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-github/src/walkthrough/headings.ts` (p=0.18)
- `collapse-branches-via-identity-element` → append to `groups/33.md`: `packages/plugins/plugin-github/src/walkthrough/headings.ts` (p=0.25)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-github/src/walkthrough/headings.ts` (p=0.15), `packages/ui/react-ui/src/hooks/useIconHref.ts` (p=0.16)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/ui/react-ui/src/hooks/useIconHref.ts` (p=0.17)
- `no-trivial-wrappers-over-official-apis` → append to `groups/34.md`: `packages/ui/react-ui/src/hooks/useIconHref.ts` (p=0.35)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/ui/react-ui/src/hooks/useIconHref.ts` (p=0.23)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/ui/react-ui/src/hooks/useIconHref.ts` (p=0.15), `packages/ui/react-ui/src/playground/experimental.stories.tsx` (p=0.27)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/54.md`: `packages/ui/react-ui/src/playground/experimental.stories.tsx` (p=0.31)
- `no-hand-rolled-lists` → append to `groups/48.md`: `packages/ui/react-ui/src/playground/experimental.stories.tsx` (p=0.17)
- `structural-regions-use-design-system-components` → append to `groups/50.md`: `packages/ui/react-ui/src/playground/experimental.stories.tsx` (p=0.16)
- `story-for-new-ui-component` → append to `groups/51.md`: `packages/ui/react-ui/src/playground/experimental.stories.tsx` (p=0.23)
- `design-tokens-not-raw-spacing-sizing` → append to `groups/52.md`: `packages/ui/react-ui/src/playground/experimental.stories.tsx` (p=0.70)
- `diff-scoped-to-pr-purpose` → append to `groups/40.md`: `packages/plugins/plugin-github/src/walkthrough/headings.test.ts` (p=0.44)
