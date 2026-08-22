# worker-framework stress suite

Manually-run stress tests for the worker framework. Real Chromium, real tabs, a real dedicated
worker, and a real SharedWorker coordinator — Playwright runs in Node and drives the browser from
the outside, which is what the package's in-page browser tests (`src/stories/counter.browser.test.ts`)
cannot do: those exercise a real worker, but every client lives in one tab.

```bash
moon run worker-framework:e2e-stress
```

Deliberately **not** part of `check`: the suite wedges workers on purpose and waits out
stale-timeout-driven failover, so a run takes minutes.

## What it does

Both tests throw disruptive commands at the worker and then assert the system converged back:

- `recovers after every individual command` — one command per iteration against a known-good fleet,
  so a failure names the culprit.
- `survives a randomised storm…` — a seeded random walk, which is where command _interactions_ show
  up.

Commands (`stress-commands.ts`):

| Command | What it provokes |
| --- | --- |
| `open-tab` / `close-tab` | Ordinary follower churn. |
| `reload-tab` | Tab loses its client identity; if it was the leader, failover. |
| `close-all-tabs-and-open-new` | Whole system torn down (worker + coordinator) and rebuilt. |
| `hang-worker` | Worker event loop starved for 8s — RPCs queue behind a busy spin. |
| `block-leader-main-thread` | Leader's heartbeat starved; its worker keeps serving, so nothing should move. |
| `block-leader-main-thread-and-open-tab` | The lock-steal path: the joining tab times out on `provide-port`, judges the leader stale, and steals. |
| `hang-worker-forever-and-recycle-tabs` | Atomic: worker wedged in an unbreakable loop, then every tab that could observe it destroyed before it yields. |
| `increment-counter` | Ordinary traffic; allowed to fail mid-storm. |

## The recovery assertions

`stress-recovery.ts`, run at the end (and after every command in the scripted test):

1. At least one tab is open.
2. Every tab reaches `connected`.
3. Every tab reports the **same `workerId`** — the framework's per-worker liveness lock key, so this
   rules out a split brain of two live workers rather than merely two workers agreeing on a count.
4. Every tab agrees on the leader.
5. The worker answers a `ping` from every tab — a wedged worker still holding the lock hangs here.
6. A write through one tab reaches every other tab's subscription.

## Knobs

| Env var | Default | Meaning |
| --- | --- | --- |
| `DX_STRESS_SEED` | `1` | RNG seed. A failure prints its seed; re-run with it to replay exactly. |
| `DX_STRESS_ITERATIONS` | `30` | Commands in the random walk. Raise for a soak. |
| `DX_STRESS_TABS` | `2` | Tabs the random walk starts with. |
| `DX_STRESS_PORT` | `9010` | Harness dev-server port. Move it when something else already owns the default. |

## Layout

- `harness/` — the page under test: `index.html`, `main.ts`, and `stress-harness.ts`, which installs
  `window.__workerStress` (status / increment / ping / hang-worker / block-main-thread). Served by a
  minimal Vite dev server (`harness/vite.config.ts`), not Storybook — the page needs no React or
  design-system assets.
- `stress-fleet.ts` — `StressTab` and `StressFleet`. All tabs share **one** `BrowserContext`: Web
  Locks and the SharedWorker coordinator are scoped per context+origin, so tabs in separate contexts
  would each get their own worker and the suite would assert nothing.
- `stress-commands.ts` — the command catalogue and the seeded RNG.
- `stress-recovery.ts` — the assertions above.
