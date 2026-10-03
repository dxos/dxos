# Candidate rules from twelve months of review comments

Source: 5,613 human inline review comments on dxos/dxos (2025-09-24 to 2026-09-24), 1,161
kept after mechanical filtering, 834 classified as rule-worthy, clustered per category group in
`clusters/architecture.md`, `clusters/api-design.md` and `clusters/domain.md`. Ranking is by
distinct PRs, not comments: two refactor PRs (11458, 10913) contribute a hundred comments
between them and would otherwise dominate.

Three reviewers wrote 95% of the kept comments (dmaretskyi 656, wittjosiah 286, richburdon
162), so these rules encode how those three review.

## Ranked candidates

Merged across the three cluster files. `existing` names a rule or skill that already covers the
principle; a candidate marked existing is not a new rule, it is evidence that the existing one
matters.

| #   | Rule                                                                                                                                                           | PRs          | Comments     | Seed                           | Existing coverage                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ------------------------------ | ---------------------------------------------------------------------------- |
| 1   | `reuse-existing-mechanism`: before adding an export, method, type, registry, cache or test fixture, find the one that already serves the concern and extend it | 62 + 17 + 12 | 85 + 19 + 19 | `one-mechanism-per-concern`    | none as a rule                                                               |
| 2   | `delete-dead-code-after-migration`: when a replacement lands, remove the old path in the same change                                                           | 21           | 22           | `one-mechanism-per-concern`    | `no-compat-shims` covers re-exports only                                     |
| 3   | `dependency-direction`: foundational packages never import from higher-level or UI ones; type-only imports are the stated carve-out                            | 20           | 23           | `dependency-direction`         | none                                                                         |
| 4   | `state-owned-once`: no mirrored copies, side tables or duplicate fields for one piece of state; derive or subscribe                                            | 18           | 24           | `state-owned-once`             | `write-through-the-live-object` (ui.mdl) covers the React form               |
| 5   | `no-pointless-indirection`: do not wrap, name, generalize or abstract a value that has one use                                                                 | 17 + 4       | 20 + 4       | none                           | `no-trivial-wrappers-over-official-apis` covers one-expression wrappers only |
| 6   | `no-impossible-state-handling`: fail with an invariant on states the types exclude; model alternatives as a tagged union, not optional fields                  | 13           | 15           | `no-impossible-state-handling` | none                                                                         |
| 7   | `prefer-branded-types-over-raw-primitives`: an identifier or domain value carries its branded type through signatures, never a raw string                      | 11           | 18           | none                           | none                                                                         |
| 8   | `canonical-api-surface`: import the canonical public export, not an internal or legacy duplicate                                                               | 11           | 22           | `dependency-direction`         | `no-echo-internal-in-sdk` covers ECHO only                                   |
| 9   | `business-logic-out-of-ui`: sync and integration logic lives in operations, not container components                                                           | 11           | 11           | `dependency-direction`         | none                                                                         |
| 10  | `no-internal-leak-through-public-surface`: internal helpers and invariants stay out of a package's public API                                                  | 10           | 13           | none                           | producer-side twin of `no-echo-internal-in-sdk`                              |
| 11  | `comment-hygiene`: comments are current, load-bearing and say why                                                                                              | 10           | 10           | none                           | CLAUDE.md comment rule, no mdl rule                                          |
| 12  | `jsdoc-non-obvious-identifiers`: a parameter, field or handle whose meaning is not in its name gets a JSDoc line                                               | 9            | 11           | none                           | none                                                                         |
| 13  | `test-the-real-scenario`: a test exercises the behavior it claims, not a scripted or lower-fidelity stand-in                                                   | 9            | 9            | none                           | none                                                                         |
| 14  | `inject-dependencies-via-constructor`: shared dependencies are accepted once, not per method or via a global registry                                          | 8            | 9            | `functions-before-classes`     | none                                                                         |
| 15  | `namespace-import-export-consistency`                                                                                                                          | 8            | 11           | none                           | `import-as-namespace-is-all-or-nothing`                                      |
| 16  | `consistent-field-and-list-ordering`                                                                                                                           | 7            | 8            | none                           | none                                                                         |
| 17  | `design-system-primitives-not-raw-divs`                                                                                                                        | 6            | 8            | none                           | ui.mdl `no-styling-wrapper-divs`                                             |
| 18  | `reference-platform-identity-mechanism`: model a relationship with the platform's reference type, not an ad hoc id field                                       | 6            | 8            | none                           | `operations-take-refs-not-ids` (partial)                                     |
| 19  | `options-object-with-defaults`                                                                                                                                 | 5            | 5            | none                           | code-style skill, no mdl rule                                                |
| 20  | `no-mixed-promise-effect`: once an interface is Effect-based, its whole surface is Effect                                                                      | 5            | 5            | none                           | CLAUDE.md prose only                                                         |
| 21  | `fix-root-cause-not-symptom`: never swallow, retry around or paper over an undiagnosed failure                                                                 | 4            | 5            | none                           | none                                                                         |
| 22  | `error-messages-carry-context`                                                                                                                                 | 4            | 4            | none                           | none                                                                         |
| 23  | `functions-before-classes`                                                                                                                                     | 4            | 5            | `functions-before-classes`     | none                                                                         |
| 24  | `no-cast-to-silence-type-checker`                                                                                                                              | 3 + 3 + 4    | 12 + 11 + 5  | none                           | `no-casts`, and the most-cited existing rule in the data                     |

## Seed check

| Seed                           | PRs | Verdict                                                                                                                                                                          |
| ------------------------------ | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `one-mechanism-per-concern`    | 91  | Keep. Split into `reuse-existing-mechanism` and `delete-dead-code-after-migration`; one rule this broad gives the reviewer subagent no boundary.                                 |
| `state-owned-once`             | 21  | Keep as written.                                                                                                                                                                 |
| `dependency-direction`         | 21  | Keep. Add the type-only import carve-out reviewers state themselves, and fold in `business-logic-out-of-ui` as its plugin-layer form.                                            |
| `no-impossible-state-handling` | 13  | Keep. Extend to "mutually exclusive optional fields are a tagged union".                                                                                                         |
| `functions-before-classes`     | 7   | Defer. The data pulls both ways (builder to function, and free function to method); the sharp, supported form is `inject-dependencies-via-constructor`.                          |
| `handle-errors-at-one-level`   | 0   | Drop for now. Nobody commented on catch-log-rethrow layering in a year; the error rules the team does apply are `fix-root-cause-not-symptom` and `error-messages-carry-context`. |

## Recommended first batch for `architecture.mdl`

Data-backed, not already enforced by an mdl rule, and with a clear flag boundary:

1. `reuse-existing-mechanism` (seed 1, split)
2. `delete-dead-code-after-migration` (seed 1, split)
3. `dependency-direction` with `business-logic-out-of-ui` as a clause (seed 4)
4. `state-owned-once` (seed 2)
5. `no-impossible-state-handling` (seed 3)
6. `no-pointless-indirection`, which was rejected from the seed list but is the fifth-strongest signal in the data
7. `no-internal-leak-through-public-surface`
8. `prefer-branded-types-over-raw-primitives`

Deferred: `functions-before-classes` (sharpen first), `handle-errors-at-one-level` (no data),
`comment-hygiene` and `jsdoc-non-obvious-identifiers` (docs rules, better in `code-style.mdl`),
`test-the-real-scenario` (testing rule, better next to `no-sleep-in-test`).

## Caveats

- The classifier and clusterer were Sonnet subagents; counts are approximate to within a few
  percent, and `confidence: low` rows (103 of 834) were included.
- Comments only say what reviewers flagged. Code the team accepts without comment is invisible
  here, so a rule's absence from the data does not mean the team does not hold it.
- 84 comments had an empty diff hunk from the API and were classified from the body alone.
