# System One calibration

Each rule's verdict question was asked of every diff hunk cited by any rule: 211 hunks, 62 rules (report rebuilt from the saved scores).
A rule's own hunks are the code its source reviewers flagged. Other rules' hunks are presumed clean for it, which overstates false positives wherever one hunk breaks two rules.

| Threshold | Recall on own hunks | Flag rate on other hunks |
| --------- | ------------------- | ------------------------ |
| 0.5       | 36%                 | 2%                       |
| 0.7       | 25%                 | 1%                       |
| 0.8       | 16%                 | 0%                       |

## As a triage filter

Used as a first pass, a verdict under the lower bound is dismissed and everything above it goes on to an agentic reviewer. What matters is how many real findings survive and how much reviewer work is saved.

| Lower bound | Own hunks kept for review | Other pairs sent to review needlessly |
| ----------- | ------------------------- | ------------------------------------- |
| 0.15        | 80%                       | 19%                                   |
| 0.2         | 69%                       | 12%                                   |
| 0.3         | 54%                       | 6%                                    |
| 0.4         | 43%                       | 3%                                    |

A flat bound treats every rule alike, but subjective rules score middling on almost any code. Raising each rule's bound to its own median plus a lift routes less and keeps more:

| Floor | Lift over the rule median | Own hunks kept for review | Other pairs sent to review needlessly |
| ----- | ------------------------- | ------------------------- | ------------------------------------- |
| 0.15  | 0.1                       | 71%                       | 11%                                   |
| 0.15  | 0.15                      | 64%                       | 8%                                    |
| 0.15  | 0.2                       | 55%                       | 6%                                    |

## Per rule, by separation

| Rule                                              | Own hunks | Mean p own | Mean p other | Separation | Own ≥ 0.7 | Other ≥ 0.7 |
| ------------------------------------------------- | --------- | ---------- | ------------ | ---------- | --------- | ----------- |
| `structured-logging-not-console`                  | 3         | 0.93       | 0.06         | 0.87       | 100%      | 0%          |
| `schema-declare-and-brand`                        | 2         | 0.91       | 0.07         | 0.84       | 100%      | 0%          |
| `moon-yml-entrypoint-registration`                | 3         | 0.81       | 0.04         | 0.77       | 100%      | 0%          |
| `parent-ref-backs-parent-pointer`                 | 2         | 0.80       | 0.06         | 0.74       | 100%      | 0%          |
| `test-asserts-real-behavior`                      | 3         | 0.72       | 0.05         | 0.67       | 67%       | 0%          |
| `no-precision-loss-on-generic-refactor`           | 4         | 0.82       | 0.15         | 0.67       | 100%      | 1%          |
| `reactive-state-via-atom-bridge`                  | 2         | 0.68       | 0.06         | 0.62       | 50%       | 0%          |
| `design-tokens-not-raw-spacing-sizing`            | 3         | 0.65       | 0.05         | 0.60       | 67%       | 0%          |
| `story-for-new-ui-component`                      | 4         | 0.65       | 0.10         | 0.55       | 50%       | 5%          |
| `effect-fn-not-hand-wrapped-gen`                  | 2         | 0.65       | 0.10         | 0.54       | 50%       | 5%          |
| `namespace-brand-key-prefixing`                   | 3         | 0.69       | 0.15         | 0.54       | 33%       | 1%          |
| `batch-queries-not-n-plus-1`                      | 2         | 0.58       | 0.05         | 0.53       | 50%       | 0%          |
| `use-context-scoped-cancellation`                 | 3         | 0.59       | 0.06         | 0.53       | 67%       | 1%          |
| `query-capability-extends-filter-query-dsl`       | 3         | 0.63       | 0.12         | 0.51       | 33%       | 0%          |
| `setter-must-not-own-transaction`                 | 2         | 0.55       | 0.05         | 0.49       | 50%       | 0%          |
| `isolate-benchmark-setup-and-flaky-tests`         | 3         | 0.53       | 0.04         | 0.49       | 33%       | 0%          |
| `service-via-shared-factory`                      | 2         | 0.58       | 0.11         | 0.47       | 50%       | 4%          |
| `error-messages-carry-context`                    | 4         | 0.55       | 0.10         | 0.45       | 25%       | 1%          |
| `deferred-callback-owns-its-context`              | 2         | 0.53       | 0.09         | 0.44       | 50%       | 0%          |
| `no-wrapper-div-around-asChild-single-child`      | 2         | 0.46       | 0.03         | 0.43       | 50%       | 0%          |
| `layout-only-wrapper-invisible-to-a11y`           | 2         | 0.46       | 0.05         | 0.41       | 0%        | 0%          |
| `namespace-export-with-internal-hiding`           | 2         | 0.46       | 0.07         | 0.40       | 50%       | 1%          |
| `reuse-shared-test-layer`                         | 5         | 0.44       | 0.05         | 0.39       | 20%       | 0%          |
| `lifecycle-owned-by-its-resource`                 | 4         | 0.45       | 0.07         | 0.38       | 25%       | 0%          |
| `no-mixed-promise-effect-lifecycle`               | 5         | 0.48       | 0.12         | 0.36       | 20%       | 1%          |
| `scope-multi-tenant-queries-by-space`             | 2         | 0.44       | 0.09         | 0.35       | 50%       | 0%          |
| `comment-hygiene`                                 | 5         | 0.53       | 0.18         | 0.34       | 40%       | 2%          |
| `effect-requirement-type-not-erased`              | 2         | 0.40       | 0.07         | 0.33       | 50%       | 0%          |
| `extract-non-rendering-logic-from-component`      | 4         | 0.40       | 0.08         | 0.32       | 25%       | 2%          |
| `no-env-vars-in-low-level-modules`                | 2         | 0.36       | 0.05         | 0.32       | 0%        | 0%          |
| `follow-existing-lazy-loading-pattern`            | 2         | 0.37       | 0.07         | 0.30       | 0%        | 0%          |
| `dont-leak-internal-api-through-public-surface`   | 5         | 0.51       | 0.22         | 0.30       | 0%        | 2%          |
| `flat-layer-composition`                          | 4         | 0.39       | 0.11         | 0.28       | 25%       | 0%          |
| `functions-before-classes`                        | 4         | 0.37       | 0.10         | 0.27       | 25%       | 0%          |
| `construct-populated-dont-mutate-after`           | 2         | 0.34       | 0.08         | 0.26       | 0%        | 0%          |
| `business-logic-out-of-ui`                        | 5         | 0.35       | 0.09         | 0.26       | 40%       | 1%          |
| `keep-parallel-apis-structurally-aligned`         | 2         | 0.37       | 0.13         | 0.24       | 0%        | 0%          |
| `collapse-branches-via-identity-element`          | 2         | 0.30       | 0.07         | 0.24       | 0%        | 0%          |
| `options-object-with-defaults`                    | 5         | 0.38       | 0.15         | 0.24       | 40%       | 0%          |
| `test-real-scenario-not-narrower-proxy`           | 5         | 0.31       | 0.08         | 0.23       | 0%        | 0%          |
| `dont-recompute-in-reactive-closures`             | 4         | 0.28       | 0.07         | 0.21       | 0%        | 0%          |
| `deprecated-tag-must-be-accurate`                 | 2         | 0.28       | 0.07         | 0.20       | 0%        | 0%          |
| `schema-field-uses-platform-reference-mechanism`  | 5         | 0.29       | 0.11         | 0.18       | 0%        | 0%          |
| `no-pointless-indirection`                        | 5         | 0.38       | 0.22         | 0.16       | 20%       | 0%          |
| `prefer-branded-types-over-raw-primitives`        | 5         | 0.32       | 0.17         | 0.16       | 0%        | 1%          |
| `structural-regions-use-design-system-components` | 5         | 0.20       | 0.05         | 0.15       | 0%        | 0%          |
| `event-handler-naming-convention`                 | 2         | 0.26       | 0.11         | 0.15       | 0%        | 0%          |
| `inject-dependencies-via-constructor`             | 4         | 0.29       | 0.15         | 0.14       | 25%       | 2%          |
| `state-owned-once`                                | 5         | 0.24       | 0.10         | 0.14       | 0%        | 1%          |
| `canonical-api-surface`                           | 5         | 0.30       | 0.16         | 0.14       | 20%       | 1%          |
| `consistent-field-and-list-ordering`              | 5         | 0.24       | 0.11         | 0.13       | 0%        | 0%          |
| `standalone-service-accessor`                     | 3         | 0.18       | 0.06         | 0.12       | 0%        | 0%          |
| `jsdoc-non-obvious-identifiers`                   | 5         | 0.34       | 0.22         | 0.12       | 0%        | 1%          |
| `schema-persists-source-not-derived-duplicate`    | 3         | 0.19       | 0.08         | 0.11       | 0%        | 0%          |
| `co-locate-tightly-coupled-code`                  | 4         | 0.18       | 0.08         | 0.10       | 0%        | 0%          |
| `dependency-direction`                            | 5         | 0.27       | 0.18         | 0.10       | 20%       | 0%          |
| `no-impossible-state-handling`                    | 5         | 0.25       | 0.16         | 0.09       | 0%        | 0%          |
| `reuse-existing-mechanism`                        | 5         | 0.26       | 0.17         | 0.08       | 0%        | 0%          |
| `consistent-file-naming-within-folder`            | 3         | 0.17       | 0.09         | 0.08       | 0%        | 0%          |
| `consistent-private-field-convention`             | 2         | 0.14       | 0.07         | 0.07       | 0%        | 0%          |
| `name-for-general-behavior`                       | 4         | 0.21       | 0.20         | 0.00       | 0%        | 0%          |
| `barrel-imports-not-internal-paths`               | 2         | 0.09       | 0.15         | -0.06      | 0%        | 1%          |
