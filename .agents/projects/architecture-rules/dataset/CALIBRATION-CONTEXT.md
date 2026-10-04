# System One calibration with context

Each rule's verdict was asked on the whole file its hunks come from, read at the commit the reviewer commented on, with the rule's declared context: 211 hunks, 62 rules, 14 context groups, $0.00 in input tokens.
The hunk stands in for `diff`; every other kind is fetched from today's tree, so `siblings`, `importers` and `package` are close to, not exactly, what the reviewer saw. A rule's own hunks are positives; other rules' hunks are presumed clean for it.

## Verdicts: bare hunk → whole file with context

| Rules                  | Threshold | Recall on own hunks | Flag rate on other hunks |
| ---------------------- | --------- | ------------------- | ------------------------ |
| declaring context (46) | 0.5       | 36% → 45%           | 2% → 7%                  |
| declaring none (16)    | 0.5       | 37% → 53%           | 2% → 6%                  |
| declaring context (46) | 0.8       | 15% → 12%           | 0% → 1%                  |
| declaring none (16)    | 0.8       | 19% → 19%           | 0% → 1%                  |

## Location

On each rule's own hunks, whether the chosen range holds the reviewer's line (within 3 lines), and how long that range is.

| Method                                          | Answers | Hit rate | Mean span (lines) |
| ----------------------------------------------- | ------- | -------- | ----------------- |
| Segments up to 40 lines                         | 196     | 59%      | 28.6              |
| Segments up to 12 lines (the checker's default) | 196     | 57%      | 13.1              |
| Second choice within the first (5-line runs)    | 196     | 47%      | 5.4               |

## Per rule

| Rule                                              | Context               | Own hunks | Mean p own: bare → context | Mean p other: bare → context |
| ------------------------------------------------- | --------------------- | --------- | -------------------------- | ---------------------------- |
| `schema-declare-and-brand`                        | —                     | 2         | 0.91 → 0.94                | 0.07 → 0.11                  |
| `structured-logging-not-console`                  | diff, siblings        | 3         | 0.93 → 0.89                | 0.06 → 0.15                  |
| `moon-yml-entrypoint-registration`                | diff, siblings        | 3         | 0.81 → 0.75                | 0.04 → 0.05                  |
| `test-asserts-real-behavior`                      | test                  | 3         | 0.72 → 0.69                | 0.05 → 0.10                  |
| `design-tokens-not-raw-spacing-sizing`            | siblings              | 3         | 0.65 → 0.66                | 0.05 → 0.07                  |
| `batch-queries-not-n-plus-1`                      | diff                  | 2         | 0.58 → 0.70                | 0.04 → 0.11                  |
| `no-env-vars-in-low-level-modules`                | package               | 2         | 0.38 → 0.65                | 0.05 → 0.06                  |
| `deferred-callback-owns-its-context`              | —                     | 2         | 0.54 → 0.72                | 0.09 → 0.15                  |
| `scope-multi-tenant-queries-by-space`             | diff                  | 2         | 0.39 → 0.67                | 0.08 → 0.14                  |
| `use-context-scoped-cancellation`                 | diff                  | 3         | 0.60 → 0.62                | 0.06 → 0.10                  |
| `effect-requirement-type-not-erased`              | —                     | 2         | 0.39 → 0.65                | 0.07 → 0.14                  |
| `service-via-shared-factory`                      | imports               | 2         | 0.57 → 0.69                | 0.11 → 0.19                  |
| `parent-ref-backs-parent-pointer`                 | diff                  | 2         | 0.80 → 0.59                | 0.06 → 0.10                  |
| `effect-fn-not-hand-wrapped-gen`                  | —                     | 2         | 0.64 → 0.66                | 0.10 → 0.20                  |
| `collapse-branches-via-identity-element`          | diff                  | 2         | 0.30 → 0.59                | 0.07 → 0.15                  |
| `namespace-brand-key-prefixing`                   | —                     | 3         | 0.66 → 0.71                | 0.15 → 0.26                  |
| `reactive-state-via-atom-bridge`                  | —                     | 2         | 0.68 → 0.54                | 0.06 → 0.09                  |
| `query-capability-extends-filter-query-dsl`       | similar               | 3         | 0.64 → 0.63                | 0.12 → 0.20                  |
| `layout-only-wrapper-invisible-to-a11y`           | —                     | 2         | 0.45 → 0.48                | 0.05 → 0.06                  |
| `no-precision-loss-on-generic-refactor`           | diff                  | 4         | 0.80 → 0.56                | 0.14 → 0.14                  |
| `no-wrapper-div-around-asChild-single-child`      | —                     | 2         | 0.47 → 0.44                | 0.04 → 0.04                  |
| `no-mixed-promise-effect-lifecycle`               | imports               | 5         | 0.49 → 0.64                | 0.12 → 0.24                  |
| `setter-must-not-own-transaction`                 | importers             | 2         | 0.55 → 0.48                | 0.05 → 0.10                  |
| `extract-non-rendering-logic-from-component`      | —                     | 4         | 0.40 → 0.52                | 0.08 → 0.13                  |
| `isolate-benchmark-setup-and-flaky-tests`         | —                     | 3         | 0.53 → 0.44                | 0.04 → 0.05                  |
| `inject-dependencies-via-constructor`             | diff                  | 4         | 0.29 → 0.59                | 0.15 → 0.21                  |
| `story-for-new-ui-component`                      | diff, siblings        | 4         | 0.64 → 0.49                | 0.10 → 0.11                  |
| `consistent-private-field-convention`             | —                     | 2         | 0.11 → 0.47                | 0.07 → 0.10                  |
| `lifecycle-owned-by-its-resource`                 | diff, siblings        | 4         | 0.45 → 0.47                | 0.07 → 0.11                  |
| `reuse-shared-test-layer`                         | similar               | 5         | 0.43 → 0.43                | 0.05 → 0.08                  |
| `flat-layer-composition`                          | —                     | 4         | 0.39 → 0.53                | 0.11 → 0.20                  |
| `namespace-export-with-internal-hiding`           | siblings, public-api  | 1         | 0.46 → 0.55                | 0.07 → 0.22                  |
| `schema-persists-source-not-derived-duplicate`    | —                     | 3         | 0.19 → 0.45                | 0.08 → 0.14                  |
| `business-logic-out-of-ui`                        | diff, siblings        | 5         | 0.34 → 0.44                | 0.09 → 0.13                  |
| `error-messages-carry-context`                    | diff                  | 4         | 0.55 → 0.59                | 0.09 → 0.29                  |
| `comment-hygiene`                                 | diff                  | 5         | 0.51 → 0.66                | 0.18 → 0.36                  |
| `test-real-scenario-not-narrower-proxy`           | imports               | 5         | 0.32 → 0.38                | 0.08 → 0.12                  |
| `consistent-file-naming-within-folder`            | siblings              | 2         | 0.18 → 0.50                | 0.09 → 0.24                  |
| `keep-parallel-apis-structurally-aligned`         | similar               | 2         | 0.38 → 0.54                | 0.13 → 0.28                  |
| `schema-field-uses-platform-reference-mechanism`  | —                     | 5         | 0.29 → 0.41                | 0.11 → 0.17                  |
| `functions-before-classes`                        | diff                  | 4         | 0.38 → 0.35                | 0.10 → 0.14                  |
| `co-locate-tightly-coupled-code`                  | siblings              | 3         | 0.19 → 0.30                | 0.08 → 0.11                  |
| `dependency-direction`                            | diff, package         | 3         | 0.28 → 0.39                | 0.17 → 0.20                  |
| `dont-recompute-in-reactive-closures`             | diff                  | 4         | 0.27 → 0.29                | 0.06 → 0.10                  |
| `structural-regions-use-design-system-components` | imports               | 4         | 0.19 → 0.24                | 0.05 → 0.05                  |
| `dont-leak-internal-api-through-public-surface`   | public-api, importers | 5         | 0.52 → 0.50                | 0.21 → 0.32                  |
| `follow-existing-lazy-loading-pattern`            | siblings              | 2         | 0.36 → 0.25                | 0.07 → 0.07                  |
| `options-object-with-defaults`                    | importers             | 5         | 0.39 → 0.44                | 0.15 → 0.27                  |
| `construct-populated-dont-mutate-after`           | diff                  | 2         | 0.37 → 0.34                | 0.08 → 0.18                  |
| `standalone-service-accessor`                     | —                     | 3         | 0.18 → 0.27                | 0.06 → 0.11                  |
| `jsdoc-non-obvious-identifiers`                   | siblings              | 5         | 0.33 → 0.52                | 0.22 → 0.36                  |
| `state-owned-once`                                | diff, siblings        | 5         | 0.23 → 0.29                | 0.09 → 0.16                  |
| `event-handler-naming-convention`                 | —                     | 2         | 0.28 → 0.35                | 0.12 → 0.23                  |
| `deprecated-tag-must-be-accurate`                 | diff                  | 2         | 0.26 → 0.26                | 0.07 → 0.14                  |
| `consistent-field-and-list-ordering`              | siblings              | 5         | 0.23 → 0.29                | 0.11 → 0.19                  |
| `prefer-branded-types-over-raw-primitives`        | importers             | 5         | 0.33 → 0.39                | 0.17 → 0.30                  |
| `no-pointless-indirection`                        | diff                  | 5         | 0.36 → 0.40                | 0.21 → 0.35                  |
| `canonical-api-surface`                           | imports, public-api   | 5         | 0.28 → 0.29                | 0.15 → 0.26                  |
| `name-for-general-behavior`                       | importers             | 4         | 0.20 → 0.33                | 0.20 → 0.32                  |
| `reuse-existing-mechanism`                        | diff, similar         | 4         | 0.25 → 0.20                | 0.16 → 0.24                  |
| `no-impossible-state-handling`                    | diff                  | 5         | 0.24 → 0.25                | 0.16 → 0.32                  |
| `barrel-imports-not-internal-paths`               | imports               | 2         | 0.09 → 0.09                | 0.15 → 0.22                  |
