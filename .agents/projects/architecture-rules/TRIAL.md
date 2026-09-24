# System One trial

A full pass over the four most recent squash merges on `main` when this was written
(`a66b79b9~4..a66b79b9`, which includes the `client-services` restructure), prepared with
`prepare.ts --pr-only` and filled with `system-one.ts` at the defaults. Run on 2026-09-24.

## Scale and cost

|                                          | First run   | Second run                  |
| ---------------------------------------- | ----------- | --------------------------- |
| Uncertain bound                          | flat 0.15   | 0.15 and rule median + 0.15 |
| Rule-file verdicts                       | 23,281      | 23,281                      |
| Requests                                 | 13,528      | 9,216                       |
| Verdicts re-asked with requested context | 6,707       | 2,335                       |
| Billed input tokens                      | 89.5M       | 65.0M                       |
| Cost                                     | $3.76       | $2.73                       |
| Wall time                                | 4m 52s      | 3m 44s                      |
| Reported violations                      | 314         | 312                         |
| Uncertain, routed to an agentic reviewer | 9,846 (42%) | 3042 (13%)                  |
| Dismissed as clean                       | 13,121      | 19927                       |

681 files and 92 rules took part. The measured ratio was 3.14 to 3.19 characters per billed
token, against the three the planner assumes. `finalize.ts` merged the fragments unchanged and
stamped each diagnostic with its rule's severity.

In the first run, the context round moved 2,566 verdicts up and 3,253 down, so what the model asks
for changes its answers in both directions rather than only confirming them.

## Where the verdicts land

Most reported violations come from rules a reader can judge from the code alone:

| Rule                                         | Reported |
| -------------------------------------------- | -------- |
| `no-casts`                                   | 114      |
| `no-styling-wrapper-divs`                    | 43       |
| `effect-fn-not-hand-wrapped-gen`             | 21       |
| `no-sleep-in-test`                           | 20       |
| `error-messages-carry-context`               | 18       |
| `declare-optional-services-with-noop-layers` | 11       |
| `use-context-scoped-cancellation`            | 10       |
| `no-mixed-promise-effect-lifecycle`          | 9        |
| `extract-non-rendering-logic-from-component` | 8        |
| `story-for-new-ui-component`                 | 6        |

The uncertain band is dominated by subjective rules, which score 0.2 to 0.4 on almost any file.
That is why the bound is relative to each rule's median; with a flat bound these rules alone
filled most of the 42%:

| Rule                                            | Uncertain in the second run |
| ----------------------------------------------- | --------------------------- |
| `event-handler-naming-convention`               | 210                         |
| `prefer-branded-types-over-raw-primitives`      | 153                         |
| `jsdoc-non-obvious-identifiers`                 | 148                         |
| `no-impossible-state-handling`                  | 140                         |
| `comment-hygiene`                               | 135                         |
| `no-trivial-wrappers-over-official-apis`        | 133                         |
| `options-object-with-defaults`                  | 124                         |
| `dont-leak-internal-api-through-public-surface` | 122                         |

## Precision, by hand

Sixteen reported violations, sampled at random from the first run and read against their rule:

- **Eleven are right.** `as any` casts, `any` parameters and `ComponentType<any>`, raw styling
  wrapper `div`s, a `Data.TaggedError` subclass where the rule wants `BaseError.extend`, an
  optional service read with `Effect.serviceOption`.
- **Two are borderline.** A cast that carries the justifying comment the rule allows, and a rule
  about components applied to a story file.
- **Three point at the wrong segment.** The verdict may be right, but the chosen location does not
  show the problem. Location is the weaker half: segments run up to 40 lines and the model picks
  among labels, not code.

## Not yet done

The key ran out of credits (`402 billing_error`) after these runs. Once credits are added, the
next steps are a re-run of `dataset/calibrate.ts` with context fetched for the context-dependent
rules, and a comparison of the uncertain band against a subagent review of the same groups.
