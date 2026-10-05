# System One pass — .agents/reviews/50218dcf

- model: jev-latest
- base for context: `a2021ca16b21d0cb8885c57ed88294d542589346`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 73 uncertain, 74 clean, 0 unanswered

```text
requests: 92 (35 verdicts re-asked with context the model requested)
estimated input tokens: 675434
billed input tokens: 638226 (cost $0.0268)
measured chars per token: 3.17
```

## Still needs an agentic reviewer

Spawn one subagent per line below (36 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 29 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 31 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.29), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.25), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.16), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.18)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.35), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.18)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.21), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.30), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.18), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.18)
- `functions-before-classes` → append to `groups/26.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.16)
- `collapse-branches-via-identity-element` → append to `groups/33.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.37)
- `bounded-live-state` → append to `groups/46.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.24), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.42), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.36)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.29)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.32), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.40), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.28)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.18)
- `import-as-namespace-is-all-or-nothing` → append to `groups/35.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.44), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.20), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.25), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.37)
- `flat-layer-composition` → append to `groups/40.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.65), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.31)
- `effect-requirement-type-not-erased` → append to `groups/42.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.64)
- `deferred-callback-owns-its-context` → append to `groups/43.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.26)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.25), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.22), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.28), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.23)
- `errors-extend-base-error` → append to `groups/36.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.49)
- `no-mixed-promise-effect-lifecycle` → append to `groups/39.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.63)
- `no-trivial-wrappers-over-official-apis` → append to `groups/34.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.20), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.17), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.15)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.34), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.15), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.45), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.18)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.37), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.28), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.24), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.20)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.37), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.26), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.27), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.40)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.16), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.16)
- `dependency-direction` → append to `groups/20.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.16), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.25)
- `follow-existing-lazy-loading-pattern` → append to `groups/32.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.15)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.52), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.19), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.26), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.24)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.22)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.44), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.34), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.37), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.41)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/compute/compute-runtime/src/protocol.ts` (p=0.68), `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.37), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.26), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.38)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-file/src/operations/create-from-source.ts` (p=0.26), `packages/plugins/plugin-file/src/operations/create-from-upload.ts` (p=0.20), `packages/plugins/plugin-file/src/operations/create.ts` (p=0.19)
- `standalone-service-accessor` → append to `groups/41.md`: `packages/plugins/plugin-file/src/operations/create.ts` (p=0.20)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/44.md`: `packages/plugins/plugin-file/src/operations/create.ts` (p=0.46)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-file/src/operations/create.ts` (p=0.24)
