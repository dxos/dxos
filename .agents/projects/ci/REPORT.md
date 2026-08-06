# Remote cache — measurements

Why the moon remote cache moved off Depot's hosted cache onto a self-hosted `bazel-remote`.
Design context in [`DESIGN.md`](./DESIGN.md); the harness that produced these numbers is
[`tools/moon-cache/bench/`](../../../tools/moon-cache/bench/README.md).

## Method

One dev machine (Apple silicon, 14 cores, local NVMe), moon **2.4.5** via the proto shim, repo
pinned at `0604e5b8bf`, the full `:build` graph — **316 projects, 309 tasks, 324 cache-eligible
actions**, the same order as CI's ~300-task closure. Arms interleaved A/B(/C), five reps each,
`.moon/cache/{outputs,states,hashes}` wiped per rep, hit rate asserted equal across arms. Medians
and p90, never means.

Four things that will silently invalidate a re-run of this:

1. **`MOON_REMOTE_HOST` overrides `.moon/workspace.yml`**, so arms switch by environment variable
   and no benchmark config can reach a commit. It does **not** carry the TLS block — an mTLS arm
   needs the real config.
2. **`--no-actions` destroys cache hits.** It looks like a way to strip pnpm-install noise from
   wall-clock; it silently converts this into a build benchmark.
3. **`which moon` is not the pinned moon.** `proto activate` caches a versioned bin directory
   ahead of `~/.proto/shims` on `PATH`, so a bare `moon` was 2.2.6 against CI's 2.4.5.
4. **`bazel-remote`'s log must not live inside `--dir`** — the next start fails its directory scan
   and panics.

### Operation taxonomy (`.moon/cache/runReport.json`, `actions[].operations[]`)

| `meta.type`                                     | meaning                                 |
| ----------------------------------------------- | --------------------------------------- |
| `output-hydration`, status `cached-from-remote` | **remote download** — the metric        |
| `output-hydration`, status `cached`             | local hit, a different thing            |
| `archive-creation`                              | upload                                  |
| `task-execution`                                | the task itself                         |
| `hash-generation`                               | client-side, unrecoverable by any cache |
| `process-execution`, `setup-operation`          | the pnpm install, not tasks             |

`task-execution` is easy to miss: on a fully-cached run nothing executes, so it never appears, and
`process-execution` looks like the execution channel. Any ratio computed without it understates
the denominator. [`parse-report.mjs`](../../../tools/moon-cache/bench/parse-report.mjs) counts all of them.

## Result

324 tasks, 5 reps per arm, 324/324 hits on every rep.

| arm                               | hydration median | hydration p90 | wall median | wall range    | wall CV | per-task p50 |
| --------------------------------- | ---------------: | ------------: | ----------: | ------------- | ------: | -----------: |
| Depot (`grpcs://cache.depot.dev`) |        1,100.1 s |     1,183.7 s |     338.0 s | 325.6–363.3 s |    4.7% |     2,027 ms |
| loopback `bazel-remote` (floor)   |           16.3 s |        17.6 s |      16.8 s | 16.4–18.0 s   |    3.1% |        28 ms |
| **DO NYC3 droplet, plaintext**    |       **86.0 s** |       203.0 s |  **26.8 s** | 24.1–45.5 s   |   26.8% |   **133 ms** |
| **DO NYC3 droplet, mTLS**         |      **109.2 s** |             — |  **29.9 s** | —             |       — |       173 ms |

**The deployable configuration is 11.3× faster than Depot on wall clock, 10× on hydration.**

Cold-build reference for the same graph: 161.5 s wall, 915.4 s of `task-execution`. Working set
**209 MB compressed / 449 MB uncompressed / 25,863 blobs** for `:build`; **815 MB / 2.28 GB /
49,562 blobs** including `:bundle`. Largest single blob 75.9 MB.

## Why Depot is slow, and why a runner would not fix it

**It is not the client.** Loopback runs the identical client over identical artifacts and file
counts, ~100× faster per task:

| target               | Depot on CI | Depot from here | loopback |
| -------------------- | ----------: | --------------: | -------: |
| `protocols:build`    |     25–27 s |         30.91 s |  0.346 s |
| `devtools:build`     |     24–26 s |         27.58 s |  0.245 s |
| `plugin-inbox:build` |     24–25 s |         29.05 s |  0.362 s |
| `plugin-space:build` |     20–23 s |         22.22 s |  0.180 s |
| `react-ui:build`     |     15–18 s |         20.62 s |  0.173 s |

This also refutes the per-file-overhead hypothesis in
[the handoff](../../../agents/superpowers/handoffs/2026-08-05-moon-remote-cache-slowness.md), which
inferred it from restore time tracking file count.

**It is not the client's network position.** The CI column comes from `depot-ubuntu-24.04-8`
runners that Depot co-locates with its cache; the middle column is a laptop 25 ms away. They agree
within ~20%, and effective parallelism matches too — 3.28–3.35× here against CI's 3.0–3.7×. So
Depot's cost does not improve on a runner, and **CI's slowness is Depot rather than the runner
environment.**

**It is not bandwidth.** The link measures 29.7–39.3 MB/s against public CDNs; the Depot arm moved
449 MB in 349 s of wall clock, **1.29 MB/s — about 3% of what was available.**

**It is not RTT.** `cache.depot.dev` and `nyc3.digitaloceanspaces.com` are equidistant from this
machine (25.0 ms vs 25.5 ms), and the droplet measured 22.8 ms. A latency sweep through
[`delay-proxy.mjs`](../../../tools/moon-cache/bench/delay-proxy.mjs), 3 reps per RTT:

|   RTT | hydration |   wall |
| ----: | --------: | -----: |
|  0 ms | 12,784 ms | 14.7 s |
|  2 ms | 15,320 ms | 14.6 s |
|  5 ms | 16,077 ms | 15.0 s |
| 10 ms | 20,112 ms | 15.5 s |
| 20 ms | 27,311 ms | 17.0 s |
| 40 ms | 43,091 ms | 20.2 s |

Slope **748.1 ms of hydration per 1 ms of RTT over 324 tasks = 2.31 ms per task per ms**, i.e.
**~2.3 sequential round-trips per cached task**, and 143 ms of wall clock per ms of RTT. An earlier
probe measured 2.2 on 29 tasks and single-digit MB; reproducing at 2.31 across an 11× workload
change means hydration is **latency-bound rather than bandwidth-bound to at least 449 MB**.

Against that model, Depot's 2,127 ms median per-task hydration at 25 ms RTT implies roughly **85
sequential round-trips per task, against bazel-remote's 2.3** — or an equivalent per-request server
cost. Something in Depot's path either fails to batch the way a stock RE v2 server does, or charges
far more per request than the network does.

## Reliability

Both hosted and self-hosted showed tails, in separate runs:

- **Depot dropped a 606-blob batch** in 1 rep of 5 — `Failed to retrieve blobs … expected_count=606
actual_count=0 … transport error`. One task fell through to re-execution, parallelism collapsed
  from ~3.3× to 1.15×, and that rep took 997.6 s against a 349 s median.
- **The droplet's wall CV was 26.8%** against Depot's 4.7% in the three-arm run, from one rep at
  45.5 s against a 26.8 s median.

The droplet's _worst_ rep is still 7× better than Depot's _best_ (45.5 s vs 325.6 s), so the
variance is noise around a number an order of magnitude smaller.

## Silent-degradation modes

All four produce a **green run that quietly rebuilt everything**, which is why
`.github/actions/assert-remote-cache` exists.

| condition                  | what moon does                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `DEPOT_TOKEN` unset        | `Auth token … does not exist`, then reports storing outputs. Server receives **zero requests**. |
| Token present but rejected | `invalid token` per blob, exit 0. Measured **0/324 hits** against 324/324 on a working arm.     |
| Host does not resolve      | `Failed to connect to storage backend, disabling it`, exit 0.                                   |
| Server drops a blob batch  | Falls back to re-execution, exit 0.                                                             |

The repo's own guidance in `AGENTS.md` and `REPOSITORY_GUIDE.md` called the first of these
"expected and harmless". It is harmless for _correctness_ — it also means no remote cache at all.

## The four never-hydrating `:bundle` targets

The handoff found `composer-app:bundle`, `storybook-react:bundle`, `docs:bundle` and
`tasks:bundle` re-executing in every CI job despite correct hashes, and suspected moon's 4 MB blob
abort. Against `bazel-remote`, 3 reps, 309/309 hits every rep:

| target                     | hydration |
| -------------------------- | --------: |
| `composer-app:bundle`      |   6.788 s |
| `storybook-react:bundle`   |   3.269 s |
| `docs:bundle`              |   1.244 s |
| `tasks:bundle`             |   0.293 s |
| `todomvc:bundle` (control) |   0.314 s |

`docs:bundle` carries the two checked-in mp4s (7.9 MB and 5.7 MB) named as its explanation, and it
hydrates. The cache holds 11 blobs over 4 MB, largest 75.9 MB, all stored and served. **Neither
moon's client nor the artifacts are at fault** — the abort does not fire against a server that
negotiates ByteStream, which points at Depot's endpoint.

## Operational consequences

1. **Any `.moon/workspace.yml` change re-hashes every task.** Switching cache host produced 0/324
   hits and a full 144 s rebuild, then 324/324 on the next run. The first CI run after a cache
   change, in either direction, is a cold build.
2. **mTLS costs ~11% of wall clock, ~27% of hydration.** Worth it; not free.
3. **Hash-generation is the floor.** ~31 s on this graph, client-side, untouchable by any cache. It
   is 66% of run-task time against the loopback arm and 3% against Depot.

## Limits

- **Nothing here was measured in CI.** Every number is from one dev machine. The
  runner→cache figure, and whether ten concurrent jobs bind on a droplet's shared egress, are
  both unmeasured.
- **macOS, not Linux**, on hardware faster than an 8-vCPU containerised runner. Absolute times do
  not transfer; the round-trip slope and the hash-vs-hydration split plausibly do, being client
  properties — the slope reproducing across an 11× workload change is evidence for that.
- **The Depot arm ran once, over about an hour.** A shared hosted cache may behave differently
  under different load.
- **Loopback is a floor, not a candidate** — same machine, working set in page cache.
