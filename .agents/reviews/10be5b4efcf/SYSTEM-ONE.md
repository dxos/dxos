# System One pass — .agents/reviews/10be5b4efcf

- model: jev-latest
- base for context: `79a32e99e0fed7e9af77ec5e2d5cc19201244d3c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 47 uncertain, 62 clean, 0 unanswered

```text
requests: 62 (19 verdicts re-asked with context the model requested)
estimated input tokens: 331351
billed input tokens: 325955 (cost $0.0137)
measured chars per token: 3.05
```

## Still needs an agentic reviewer

Spawn one subagent per line below (32 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 31 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 33 as staged in STAGING.md
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.49), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.34)
- `no-pointless-indirection` → append to `groups/22.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.39), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.30), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.28)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.60), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.27), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.24)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.48)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.31)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.28), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.27), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.17)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.27), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.35), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.31)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.23), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.22)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.32), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.63), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.26)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts` (p=0.16), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.15)
- `error-messages-carry-context` → append to `groups/28.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.16), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.66)
- `comment-hygiene` → append to `groups/03.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.37), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.55)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.22), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.53)
- `themed-primitives-take-classNames` → append to `groups/43.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.21)
- `write-through-the-live-object` → append to `groups/47.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.26)
- `extract-non-rendering-logic-from-component` → append to `groups/50.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.20), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.67)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/53.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.26), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.32)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.24), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.24)
- `design-tokens-not-raw-spacing-sizing` → append to `groups/51.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.54)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx` (p=0.20), `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.15)
- `functions-before-classes` → append to `groups/26.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.15)
- `no-invented-theme-tokens` → append to `groups/44.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.30)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.16)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.19)
- `state-owned-once` → append to `groups/21.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.21)
- `business-logic-out-of-ui` → append to `groups/24.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.28)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx` (p=0.32)
