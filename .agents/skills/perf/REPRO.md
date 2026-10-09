# Repro: from a field report to a scenario

A report says "it is slow when I do X". Until X is a scenario with a number, no fix can be shown
to help. A scenario is a spec under `packages/apps/composer-app/src/playwright/scenarios/`, built
and served like the projects flow, with its own fixture, stages and (once calibrated) budgets.

## 1. Capture the field evidence

If the slow app is still running, profile it before it is closed. Any browser with a debugging
port works: a dev tab, a preview, the desktop app.

```bash
pnpm perf capture --attach 9222 --seconds 30      # while the user repeats X
```

The capture keeps a profile per realm and prints the hot functions. Its run name is the
`--capture` argument below. With no live app, use the report's own evidence (a trace, SigNoz lag,
the steps) and skip the signature check.

## 2. Write the scenario

```bash
pnpm perf scenario new <name> --reproduces '<what the report said, in one line>'
```

Fill in the spec it writes:

- **fixture**: the data the report needs, built outside every stage (`perf/fixture.ts` builds the
  projects fixture). Size it like the reporter's space, not like a demo.
- **stages**: one per step the report describes, named for the step. Each id becomes a metric
  suffix (`wall > first-answer`).
- **navigates**: set it when a step reloads or navigates the page. The harness then leaves the
  coordinator shared worker unattached; an inspector session on it breaks a reload.

`scenarios/perf-reload-populated.spec.ts` is a worked example.

## 3. Prove it before using it

```bash
pnpm perf run --scenario <name> -n 1              # does it run, is the symptom in the numbers?
git commit                                        # check measures committed trees
pnpm perf scenario check <name> --capture <run>
```

Never hillclimb on a scenario that has not passed `check`. It passes only when an A/A run makes no
false call, an injected slowdown sized from the A/A run is caught, and at least half the capture's
hot functions are among the scenario's. A scenario that fails the last one reproduces some other
problem; change the fixture or the steps, not the bar. A run that does not show the report's symptom at all needs
a bigger or older fixture before it needs `check`.

## 4. Land it

The scenario lands in its own PR, before any fix, so a fix's PR can show
`pnpm perf compare --base main --scenario <name>` against it. Calibrate budgets from a few runs
with `scripts/score-perf.ts calibrate` when the scenario should be trended. Scenarios run only on
request; adding one to the nightly is a workflow change of its own.
