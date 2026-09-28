# System One pass — .agents/reviews/b70909be74

- model: jev-latest
- base for context: `89a6ee43deb83e8144e2e5132a954d204994e67a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 24 uncertain, 41 clean, 0 unanswered

```text
requests: 42 (14 verdicts re-asked with context the model requested)
estimated input tokens: 225074
billed input tokens: 221176 (cost $0.0093)
measured chars per token: 3.05
```

## Still needs an agentic reviewer

Spawn one subagent per line below (21 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 18 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 25 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 26 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 27 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/21.md`: `packages/plugins/plugin-file/src/containers/FileCard/FileCard.tsx` (p=0.23), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.28)
- `no-impossible-state-handling` → append to `groups/22.md`: `packages/plugins/plugin-file/src/containers/FileCard/FileCard.tsx` (p=0.20), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.18)
- `event-handler-naming-convention` → append to `groups/11.md`: `packages/plugins/plugin-file/src/containers/FileCard/FileCard.tsx` (p=0.39), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.32)
- `themed-primitives-take-classNames` → append to `groups/33.md`: `packages/plugins/plugin-file/src/containers/FileCard/FileCard.tsx` (p=0.16), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.22)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-file/src/containers/FileCard/FileCard.tsx` (p=0.20), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.28)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-file/src/containers/FileCard/FileCard.tsx` (p=0.26), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.33)
- `dependency-direction` → append to `groups/19.md`: `packages/plugins/plugin-file/src/containers/FileCard/FileCard.tsx` (p=0.24)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-file/src/containers/FileCard/FileCard.tsx` (p=0.21), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.29)
- `collapse-branches-via-identity-element` → append to `groups/29.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.24)
- `no-invented-theme-tokens` → append to `groups/34.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.45)
- `keep-parallel-apis-structurally-aligned` → append to `groups/12.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.18)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.16)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.30)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.31)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.49)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.23)
- `diff-scoped-to-pr-purpose` → append to `groups/32.md`: `packages/plugins/plugin-file/src/containers/FileCard/FileCard.tsx` (p=0.22)
