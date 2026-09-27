# System One pass — .agents/reviews/e04f7eec

- model: jev-latest
- base for context: `15cd822f60b9c66637700ba6c4b501c9a0dcccd6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 73 uncertain, 179 clean, 0 unanswered

```text
requests: 130 (55 verdicts re-asked with context the model requested)
estimated input tokens: 628079
billed input tokens: 565826 (cost $0.0238)
measured chars per token: 3.33
```

## Still needs an agentic reviewer

Spawn one subagent per line below (33 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 29 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 31 as staged in STAGING.md
- `deprecated-tag-must-be-accurate` → append to `groups/17.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.16)
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.30), `packages/plugins/plugin-assistant/src/util/current-chat.ts` (p=0.32), `packages/plugins/plugin-computer/src/skills/computer-skill.ts` (p=0.24), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.test.ts` (p=0.20), `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.26)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.32), `packages/plugins/plugin-assistant/src/util/current-chat.test.ts` (p=0.22), `packages/plugins/plugin-assistant/src/util/current-chat.ts` (p=0.22), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.test.ts` (p=0.42), `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.16)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.33), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.ts` (p=0.22)
- `scope-multi-tenant-queries-by-space` → append to `groups/30.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.25)
- `collapse-branches-via-identity-element` → append to `groups/33.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.15)
- `bounded-live-state` → append to `groups/42.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.38), `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.37)
- `comment-hygiene` → append to `groups/03.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.38), `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.48)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.53), `packages/plugins/plugin-computer/src/skills/computer-skill.ts` (p=0.37)
- `import-as-namespace-is-all-or-nothing` → append to `groups/35.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.41), `packages/plugins/plugin-assistant/src/util/current-chat.test.ts` (p=0.46), `packages/plugins/plugin-computer/src/skills/computer-skill.ts` (p=0.38), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.test.ts` (p=0.18), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.ts` (p=0.51), `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.41)
- `standalone-service-accessor` → append to `groups/39.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.19)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.17)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.36), `packages/plugins/plugin-assistant/src/util/current-chat.test.ts` (p=0.33), `packages/plugins/plugin-computer/src/skills/computer-skill.ts` (p=0.21), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.test.ts` (p=0.17)
- `no-mixed-promise-effect-lifecycle` → append to `groups/38.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.22), `packages/plugins/plugin-assistant/src/util/current-chat.test.ts` (p=0.34), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.test.ts` (p=0.27)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.32), `packages/plugins/plugin-assistant/src/util/current-chat.test.ts` (p=0.48), `packages/plugins/plugin-assistant/src/util/current-chat.ts` (p=0.57), `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.23)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.35)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.33), `packages/plugins/plugin-assistant/src/util/current-chat.test.ts` (p=0.24), `packages/plugins/plugin-assistant/src/util/current-chat.ts` (p=0.23), `packages/plugins/plugin-computer/src/skills/computer-skill.ts` (p=0.25), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.test.ts` (p=0.20), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.ts` (p=0.19), `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.19)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.22)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.27), `packages/plugins/plugin-assistant/src/util/current-chat.test.ts` (p=0.18), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.test.ts` (p=0.16), `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.37)
- `state-owned-once` → append to `groups/21.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.28)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.25), `packages/plugins/plugin-assistant/src/util/current-chat.test.ts` (p=0.29), `packages/plugins/plugin-assistant/src/util/current-chat.ts` (p=0.52), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.ts` (p=0.17)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.25)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.38), `packages/plugins/plugin-assistant/src/util/current-chat.test.ts` (p=0.18), `packages/plugins/plugin-assistant/src/util/current-chat.ts` (p=0.24), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.test.ts` (p=0.27), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.ts` (p=0.34)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts` (p=0.17), `packages/plugins/plugin-assistant/src/util/current-chat.ts` (p=0.15), `packages/plugins/plugin-computer/src/skills/computer-skill.ts` (p=0.27), `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.ts` (p=0.18)
- `no-trivial-wrappers-over-official-apis` → append to `groups/34.md`: `packages/plugins/plugin-assistant/src/util/current-chat.ts` (p=0.17), `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.15)
- `test-real-scenario-not-narrower-proxy` → append to `groups/45.md`: `packages/plugins/plugin-computer/src/vite-plugin/computer-shell-plugin.test.ts` (p=0.18)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.22)
- `business-logic-out-of-ui` → append to `groups/24.md`: `packages/plugins/plugin-registry/src/containers/LoadPluginDialog/LoadPluginDialog.tsx` (p=0.47)
