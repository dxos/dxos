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

## Checked against subagents

A second, smaller run over `ea4093cc~3..ea4093cc` (three merges: MCP servers in chat, Composer
login over MCP, a deck fix) gave 984 rule-file verdicts for $0.15: 16 reported, 223 uncertain, 745
dismissed. Eight Sonnet subagents then judged, blind to the checker's answer, every reported and
uncertain pair and 80 dismissed pairs drawn at random (the harness's own files left out, 303
pairs, about 1.7M subagent tokens).

| Checker said                 | Pairs | Subagent found a violation |
| ---------------------------- | ----- | -------------------------- |
| Reported (≥ 0.8)             | 16    | 12 (75%)                   |
| Uncertain, 0.65-0.8          | 22    | 6 (27%)                    |
| Uncertain, 0.5-0.65          | 43    | 8 (19%)                    |
| Uncertain, below 0.5         | 142   | 4 (3%)                     |
| Dismissed (random 80 of 745) | 80    | 1 (1%)                     |

Three in four reported verdicts hold up, and the dismissed side misses little: one of 80, or about
nine across all 745 against about 30 found. The uncertain band below 0.5 is nearly as clean as the
dismissed side, so raising the floor to 0.5 would route 65 pairs instead of 207 and keep 14 of 18
real findings. The mined-hunk calibration disagrees (at 0.4 it keeps 42% of positives against 79%
at 0.15), because a mined example is exactly the subtle case a reviewer had to point out; the
floor stays at 0.15 until a second trial settles it.

What the subagents confirmed is the kind of finding the rules were written for: `as any` on MCP
tool arguments, a per-chat lock map that is never evicted, error classes that skip `BaseError`,
hand-wrapped `Effect.gen` beside `Effect.fn` in the same file.
