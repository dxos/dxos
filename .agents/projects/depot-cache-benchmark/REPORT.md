# Depot cache benchmark — findings

Methodology, metric definitions (M1–M6) and the decision gates are in
[`DESIGN.md`](./DESIGN.md). This file records measurements only.

## Phase 0 — instrument validation

Run on the session container (4 cores, 15 GB, Firecracker), **not** a Depot
runner, against `bazel-remote` v2.5.0 on loopback. Every number here is
directional for CI, not a substitute for it — see §Limits.

### F1 — A missing `DEPOT_TOKEN` silently disables remote caching entirely

The most consequential finding, and it invalidates any benchmark arm that does
not guard against it.

With the token unset, moon reports a connection and then reports storing
outputs — but nothing is transmitted:

```
DEBUG moon_cache_remote::grpc_remote_storage  Connecting to gRPC host grpc://127.0.0.1:9092 (with auth)
 WARN moon_cache_remote::headers  Auth token DEPOT_TOKEN does not exist, unable to authorize for remote storage
DEBUG moon_task_runner::output_archiver  Storing task outputs in local and remote caches  task_target="log:build"
   … the same line for all 12 tasks
```

Server side, after that run: **0 requests received, 0 files stored.** Re-running
the identical command with `DEPOT_TOKEN` set to an arbitrary value (the local
server has auth disabled, so the value is irrelevant — only its presence
matters):

| `DEPOT_TOKEN` | Files stored | Bytes  | AC lookups | CAS blob checks |
| ------------- | ------------ | ------ | ---------- | --------------- |
| unset         | 0            | 0      | 0          | 0               |
| set           | 519          | 3.3 MB | 12         | 507             |

Two consequences:

1. **The repo's own guidance is misleading.** `AGENTS.md` and
   `REPOSITORY_GUIDE.md` both call the missing-token warning expected and
   harmless. It is harmless for _correctness_, but it means a developer seeing
   it has **no remote cache at all** — every local build is local-cache-only.
   Worth rewording independently of this project.
2. **The harness must assert remote traffic.** An arm that loses its token
   silently measures "no remote cache" while printing a clean green run. Added
   as a Phase 1 requirement.

### F2 — Operation taxonomy confirmed (moon 2.4.5)

From `.moon/cache/runReport.json`, `actions[].operations[]`, on a fully-hydrated
run of 12 tasks:

| `meta.type`         | Count | Total ms | Status seen          | Role                       |
| ------------------- | ----: | -------: | -------------------- | -------------------------- |
| `setup-operation`   |     5 | 19,477.5 | `passed`             | not cache (pnpm install)   |
| `process-execution` |     1 | 19,410.3 | `passed`             | not cache                  |
| `hash-generation`   |    17 |    774.3 | `passed`             | client-side, unrecoverable |
| `output-hydration`  |    12 |    211.2 | `cached-from-remote` | **M2, download side**      |
| `sync-operation`    |    26 |     28.5 | `passed`             | not cache                  |

So the harness can compute **M2 deterministically** as the sum of
`output-hydration` operations whose `status` is `cached-from-remote` — the
status field is what separates a remote hit from a local one (`cached`). The
upload side (M5) appears as `archive-creation` on miss runs.

`hash-generation` matters for the decision: at 774 ms it is **3.7× the entire
remote hydration cost**, and no cache server can reduce it. It is a floor under
any arm.

### F3 — `MOON_REMOTE_HOST` overrides `.moon/workspace.yml`

Arms can be switched by environment variable alone. No config edits, so no risk
of a benchmark config reaching a commit, and no `workspace.yml` churn between
reps.

### F4 — `--no-actions` destroys cache hits; do not use it in the harness

Added to strip pnpm-install noise from wall-clock; instead every task missed and
rebuilt (13 reps × ~44 s, `output-hydration` count 0 throughout). Recorded
because it is an inviting-looking flag that silently converts a cache benchmark
into a build benchmark — the same failure class as F1.

### F5 — `tc netem` is unavailable here; a userspace delay proxy substitutes

This Firecracker kernel (6.18.5-fc-v18) has no loadable-module tree and no
`sch_netem`, so `tc qdisc … netem` fails. [`probe/delay-proxy.mjs`](./probe/) — a TCP
relay that delays each direction by RTT/2 — stands in, needs no `NET_ADMIN`, and
is portable to any runner. It adds its own overhead, so only the **slope**
across RTTs is meaningful, never the absolute at RTT=0.

### F6 — Latency sensitivity: moon's hydration path is well batched

`react-ui:build` (29 tasks, all cached from remote), 3 reps per RTT, medians,
through the delay proxy:

| RTT (ms) | Hydration (ms) | Δ vs 0 | Wall (ms) |
| -------: | -------------: | -----: | --------: |
|        0 |          2,188 |      — |    23,033 |
|        2 |          2,447 |   +259 |    23,238 |
|        5 |          2,519 |   +331 |    22,817 |
|       10 |          2,952 |   +764 |    24,251 |
|       20 |          3,621 | +1,434 |    23,642 |
|       40 |          4,763 | +2,576 |    23,727 |

Least-squares slope: **63.7 ms of hydration per 1 ms of RTT across 29 tasks =
2.2 ms per task per ms of RTT**, i.e. **~2.2 effective sequential round-trips
per cached task.**

That is the answer to the question Stage B hinges on. The same run moves 498–6,972
CAS blobs; if moon issued a round-trip per blob the slope would be two to three
orders of magnitude worse. It batches, so **RTT is charged per task, not per
artifact.**

Applying it to the DigitalOcean question, at a hypothesised +5 ms for DO-NYC vs
Depot in-region: **+11 ms of hydration per cached task.** Across the sweep,
wall-clock never moved outside noise — 23.0 s at 0 ms RTT vs 23.7 s at 40 ms —
because hydration parallelises across tasks.

### F7 — Hydration is a minority of even fully-cached task time

Direct connection, no proxy (the proxy inflates hydration ~4×, so only F6's
_slope_ is usable, never its absolute):

| Rep | Wall (ms) | Hydration (ms) | Hash-generation (ms) |
| --- | --------: | -------------: | -------------------: |
| 1   |    21,318 |            527 |                1,755 |
| 2   |    22,022 |            560 |                1,797 |
| 3   |    22,131 |            519 |                1,710 |

Breaking the pipeline down by action type on the same run:

| Action                 | Total ms |
| ---------------------- | -------: |
| `install-dependencies` |   18,814 |
| `run-task` (29 tasks)  |    2,296 |
| everything else        |      171 |

The `install-dependencies` figure is a container artifact — CI restores a cached
pnpm store — so **the honest denominator is `run-task`, not wall-clock.** Within
it:

- **hash-generation ≈ 1,755 ms (77%)** — client-side, and no cache server on any
  network can reduce it.
- **remote hydration ≈ 527 ms (23%)** — the only recoverable part.

On a fully-cached run these two _are_ the task time; nothing executes. So the
ceiling on switching cache providers is **23% of cached-task time**, before
accounting for the fact that a self-hosted arm has to beat Depot rather than
beat infinity.

### What this implies for the gates

Directionally — and subject to every limit below — the DigitalOcean arm looks
unlikely to clear Gate 1's ≥10%-of-wall-clock leg, from both sides at once:

1. **Little to win.** Hydration is ~23% of cached-task time and hash-generation
   dominates it.
2. **Little to lose.** Batching means DO's RTT penalty is ~11 ms per task and
   parallelises away.

The measurement that would overturn this is a real CI job: hundreds of tasks and
a working set orders of magnitude larger, where hydration could be bandwidth-
rather than latency-bound. That is exactly where F6's slope stops being the
right model, and it is the next thing to measure.

## Limits

Read these before quoting any number above.

- **No Depot arm at all.** `DEPOT_TOKEN` is not present in this container, so
  every measurement is localhost-only. Nothing here says Depot is fast or slow —
  it characterises _moon's client_ and the shape of the cache path. The actual
  comparison needs CI.
- **Not a Depot runner.** 4 cores, 15 GB, Firecracker — versus
  `depot-ubuntu-24.04-8` with different disk and a 12.5 Gbps network. Absolute
  times do not transfer; the per-task round-trip slope (F6) and the
  hash-vs-hydration ratio (F7) plausibly do, since they are client properties.
- **Small workload.** 12–29 tasks and single-digit MB, against real CI jobs of
  hundreds of tasks. F6's linear model assumes latency-bound hydration; a
  GB-scale working set may be bandwidth-bound instead, where it does not apply.
- **The delay proxy is not netem.** It inflates the RTT=0 baseline roughly 4×
  (2,188 ms vs a direct 527 ms), so only its slope is meaningful. Re-measure with
  real netem on a runner if the slope ends up load-bearing for a decision.
- **`install-dependencies` dominates wall-clock here** and would not in CI, which
  is why F7 uses `run-task` as the denominator.
