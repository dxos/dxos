# Triage: from a signal to a target

The output is one sentence an agent can act on: which interaction, which stage or scenario, which
metric, and how far it is from where it should be.

## 1. Find the signal

- **Nightly series**: PostHog dashboards
  [991193](https://eu.posthog.com/project/126171/dashboard/991193) (scores) and
  [993718](https://eu.posthog.com/project/126171/dashboard/993718) (regression heatmap), and the
  per-stage tiles in [DASHBOARD.md](../../../packages/e2e/perf-harness/DASHBOARD.md). A step change
  on one date with a commit range is a target. A slow drift is a budget question first
  (`packages/apps/composer-app/spec/PERF-BUDGETS.md`).
- **Budgets**: `pnpm perf run -n 3` scores the working tree. A metric past its limit is a target.
- **Field**: SigNoz `dxos.client.runtime.eventLoop.lag` per realm, and user reports. These say
  something is slow in production; they rarely say what. The lag gauge discards gaps over 10 s, so
  the longest freezes are missing from it. Go to [REPRO.md](REPRO.md).
- **The App Performance project** in the DXOS space lists known problems; claim the task before
  starting.

## 2. Is it visible here?

Run the flow or scenario that covers the interaction and read the stage table:

```bash
pnpm perf run -n 3                                # the projects flow
pnpm perf run -n 3 --scenario <name>              # a reproduction
```

If no stage shows the problem, the flow does not do what the report does. Write a scenario
([REPRO.md](REPRO.md)) rather than stretching the projects flow.

## 3. Where does the time go?

```bash
pnpm perf summarize --stage <stage>               # top functions by self time, source-mapped
pnpm perf expand h3                               # who calls it, what it calls
```

Read the realm column. Main-thread time in `page` is rendering and handlers; time in the dedicated
or shared worker is ECHO, indexing and Automerge. A stage that is long in wall time but short in
CPU is waiting: on the worker, the network or a timer. Look at the worker realm before the page.

## 4. Write the target down

On the task: the metric id as `compare` names it (`wall > open-tasks`, `reactRenders > scroll-tasks`),
today's value with the run directory, the budget target if one exists, and the functions
`summarize` named. Then [HILLCLIMB.md](HILLCLIMB.md).
