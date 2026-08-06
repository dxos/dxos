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

**Incomplete — corrected by F8.** The table above was taken from a fully-cached
run, where nothing executes, so it never showed the operation that carries real
task work: `task-execution`. `process-execution` is the pnpm install, not the
tasks. Any ratio computed without `task-execution` understates the denominator.

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

**Both legs were wrong at real scale — see F9, F10 and F11.** "Little to win"
held only because the workload was small; against the real graph, CI spends
90%+ of task time hydrating. "Little to lose" held up and then some: the
round-trip model reproduced almost exactly at 11× the task count.

## Phase 0b — real workload, dev machine

Environment for everything in this section: **Apple silicon, 14 cores, local
NVMe, macOS**, moon **2.4.5** via the proto shim (matching `.prototools` and
CI's pin — `which moon` resolves to a stale 2.2.6 from `proto activate`, which
is not what CI runs), `bazel-remote` v2.5.0 on loopback with
`--storage_mode zstd`, repo pinned at `0604e5b8bf`. moon's own
`remote.cache.compression` is left unset, matching production.

Scale: **316 projects, 309 `:build` tasks** (324 cache-eligible actions
including deps) — the same order as the ~300-task CI closure, and 11× the
workload behind F6/F7.

### F8 — `task-execution` is where task work is recorded, not `process-execution`

Correcting F2. On a cold build of 324 actions:

| `meta.type`         | Count | Total s | Role                       |
| ------------------- | ----: | ------: | -------------------------- |
| `task-execution`    |   324 |   915.4 | **the tasks themselves**   |
| `hash-generation`   |   330 |    39.3 | client-side, unrecoverable |
| `archive-creation`  |   324 |    32.6 | upload side (M5)           |
| `setup-operation`   |     5 |    15.5 | pnpm install               |
| `process-execution` |     1 |    15.5 | the install's own process  |
| `sync-operation`    |   624 |     9.6 | not cache                  |

F2 was taken from a fully-cached run where nothing executes, so
`task-execution` never appeared and `process-execution` looked like the
execution channel. It is the pnpm install. Any harness parser must count
`task-execution`.

### F9 — The real-workload ceiling, against an infinitely fast network

324 `:build` tasks, all `cached-from-remote`, 6 reps, cold local cache each:

| Metric          |  Median | Range       |    CV |
| --------------- | ------: | ----------- | ----: |
| Wall clock      |  14.7 s | 14.2–16.0 s |  3.8% |
| Hydration (M2)  |  13.3 s | 12.5–16.6 s | 10.1% |
| Hash-generation |  31.1 s | 29.3–36.2 s |     — |
| Remote hits     | 324/324 | every rep   |     — |

Per-task hydration: **p50 21 ms, p90 ~95 ms, max ~1.2 s.** The same build cold
is 161.5 s wall / 915.4 s of `task-execution`, so the cache is doing its job —
an 11× wall-clock reduction.

Working set, `:build` only: **209 MB compressed, 449 MB uncompressed, 25,863
CAS blobs.** Adding `:bundle`: **815 MB / 2.28 GB / 49,562 blobs.** That sizes
a droplet's disk and its egress bill, and it is two orders of magnitude past the
single-digit MB behind F6/F7.

### F10 — Hydration cost is the path to the server, not per-file client work

The handoff [`2026-08-05-moon-remote-cache-slowness.md`](../../../agents/superpowers/handoffs/2026-08-05-moon-remote-cache-slowness.md)
hypothesised per-file syscall/unpack overhead, on the correlation between
restore time and file count. Loopback refutes it: identical client, identical
artifacts, identical file counts, ~100× faster.

| target               | Depot, on CI | loopback here | ratio |
| -------------------- | -----------: | ------------: | ----: |
| `protocols:build`    |      25–27 s |        0.32 s |  ~80× |
| `devtools:build`     |      24–26 s |        0.26 s |  ~96× |
| `plugin-inbox:build` |      24–25 s |        0.30 s |  ~82× |
| `plugin-space:build` |      20–23 s |        0.25 s |  ~86× |
| `react-ui:build`     |      15–18 s |        0.16 s | ~103× |

An M-series NVMe beats an 8-vCPU containerised runner, but not by 80–100×. The
recoverable cost is in the transport, which is the one thing this project can
change.

**This does not yet convict Depot.** It crosses machine and network at once. A
Depot arm from this same machine is the only measurement that separates "Depot's
server path is slow" from "the CI runner's environment is slow" — and that arm
is blocked (F12).

### F11 — The round-trip model holds at 11× the task count

Sweep through [`probe/delay-proxy.mjs`](./probe/), 3 reps per RTT, medians,
324/324 hits at every point:

| RTT (ms) | Hydration (ms) |  Δ vs 0 | Wall (s) |
| -------: | -------------: | ------: | -------: |
|        0 |         12,784 |       — |     14.7 |
|        2 |         15,320 |  +2,535 |     14.6 |
|        5 |         16,077 |  +3,292 |     15.0 |
|       10 |         20,112 |  +7,328 |     15.5 |
|       20 |         27,311 | +14,526 |     17.0 |
|       40 |         43,091 | +30,307 |     20.2 |

Least-squares slope: **748.1 ms of hydration per 1 ms RTT over 324 tasks = 2.31
ms per task per ms of RTT**, i.e. **~2.3 sequential round-trips per cached
task.** F6 measured 2.2 on 29 tasks; this is 2.31 on 324. **Hydration is
latency-bound, not bandwidth-bound, up to at least 449 MB / 25,863 blobs** —
the concern that F6's model would break at scale does not materialise.

Unlike in the container, the proxy costs almost nothing here — 12.78 s at RTT=0
versus 13.3 s direct — so these absolutes are usable, not only the slope.

Wall-clock slope is **143 ms per 1 ms RTT**: hydration parallelises, so RTT is
heavily discounted at the job level.

### F12 — An _invalid_ token fails exactly like a missing one

Extending F1. With `DEPOT_TOKEN` set to a token Depot rejects, every remote call
warns and the run proceeds green:

```
WARN moon_cache_storage::storage_backend  Failed to find missing blobs, aborting store operation
  storage="grpc-remote-cache"
  error="The request does not have valid authentication credentials: invalid token"
```

Result: **0/324 `cached from remote`** against Depot versus 324/324 against
bazel-remote in the same interleaved sequence; the Depot arm rebuilt from
scratch (149.6 s wall, 870 s of `task-execution`) while reporting success. So
the harness's traffic assertion must cover _rejected_ credentials, not just
absent ones — an expiring token silently uncaches CI with no red build.

This blocks the Depot arm, and therefore Stage A. Needs a token with cache scope
for org `t8fblrl00n`.

### F13 — The four "never hydrate" targets round-trip fine through bazel-remote

Handoff Finding 3 lists `composer-app:bundle`, `storybook-react:bundle`,
`docs:bundle` and `tasks:bundle` as re-executing in every CI job despite correct
hashes, and suspects moon's 4 MB blob abort. Against bazel-remote, 3 reps,
309/309 hits every rep:

| target                   | hydration |
| ------------------------ | --------: |
| `composer-app:bundle`    |   6.788 s |
| `storybook-react:bundle` |   3.269 s |
| `docs:bundle`            |   1.244 s |
| `tasks:bundle`           |   0.293 s |
| `todomvc:bundle`         |   0.314 s |

`docs:bundle` carries the two checked-in mp4s (7.9 MB and 5.7 MB) that the
handoff identified as its explanation, and it hydrates. The cache holds **11
blobs over 4 MB, the largest 75.9 MB**, all stored and served.

So neither moon's client nor the artifacts are the fault: the 4 MB abort is not
firing on a server that negotiates ByteStream properly. That localises Finding 3
to **Depot's endpoint or the CI environment**. Confirming which needs the same
Depot arm that F12 blocks.

Full `:bundle` run, fully hydrated: 309 hits, hydration median **51.0 s**, wall
**34.8 s** (3 reps, 33.5–35.0 s).

### F14 — Depot and DigitalOcean NYC are equidistant from this machine

TCP connect, 5 samples each:

| endpoint                      | connect |
| ----------------------------- | ------: |
| `cache.depot.dev`             | 25.0 ms |
| `nyc3.digitaloceanspaces.com` | 25.5 ms |
| `sfo3.digitaloceanspaces.com` | 68.6 ms |

A local A/B against a NYC droplet would therefore be latency-fair, not
laptop-versus-loopback. Caveat: `cache.depot.dev` is likely fronted by an
anycast edge, so 25 ms may reach a POP rather than the cache origin.

Applying F11's slope at 25 ms RTT predicts a NYC droplet arm at **~31 s
hydration / ~18 s wall** for `:build`, against 13.3 s / 14.7 s on loopback.

This is the developer's RTT, not a runner's. Depot co-locates cache with
runners, so from `depot-ubuntu-24.04-8` their RTT is far below 25 ms and a
droplet's would not be — the local A/B cannot settle the CI question.

## Stage A — Depot vs bazel-remote, measured

The token in F12 was a one-character truncated paste (73 chars, should be 74).
With it corrected, arm A runs. Same machine, same SHA, same 324-task `:build`,
interleaved A/B/A/B, 5 reps each, cold local cache per rep, both arms at
324 hits.

### F15 — Depot is ~67× slower than a loopback cache on hydration, ~21× on wall

| Metric                 |         Depot |    loopback | ratio |
| ---------------------- | ------------: | ----------: | ----: |
| Hydration, median      |     1,149.2 s |      17.2 s |   67× |
| Hydration, p90         |     1,172.4 s |      17.5 s |   67× |
| Per-task hydration p50 |      2,127 ms |       28 ms |   76× |
| Per-task hydration p90 |      7,983 ms |      128 ms |   62× |
| Per-task hydration max |     30,907 ms |    1,161 ms |   27× |
| Wall clock, median     |       349.1 s |      16.9 s |   21× |
| Wall clock, range      | 335.1–997.6 s | 16.5–17.1 s |     — |
| Wall-clock CV          |         55.0% |        1.5% |     — |
| Effective parallelism  |    3.28–3.35× |       ~1.0× |     — |

Hash-generation is unchanged across arms (30.6–35.9 s), as it must be — it is
client-side. It was 66% of run-task time on the loopback arm; against Depot it
is **3%**, and hydration is the other 97%.

### F16 — The local Depot arm reproduces CI's Depot numbers

The decisive control. The handoff's per-task figures came from
`depot-ubuntu-24.04-8` runners; these come from a laptop 25 ms away:

| target                   | Depot on CI | Depot from here | loopback |
| ------------------------ | ----------: | --------------: | -------: |
| `protocols:build`        |     25–27 s |         30.91 s |  0.346 s |
| `devtools:build`         |     24–26 s |         27.58 s |  0.245 s |
| `plugin-inbox:build`     |     24–25 s |         29.05 s |  0.362 s |
| `plugin-space:build`     |     20–23 s |         22.22 s |  0.180 s |
| `plugin-assistant:build` |        19 s |         22.69 s |  0.261 s |
| `react-ui:build`         |     15–18 s |         20.62 s |  0.173 s |

Effective parallelism matches too: **3.28–3.35× here against 3.0–3.7× in CI.**

This settles the question F10 had to leave open. Depot co-locates its cache with
its runners, so a co-located runner should beat a laptop on a 25 ms link by a
wide margin. It does not — the two agree within ~20%. **Depot's hydration cost
is therefore invariant to the client's network position, so it will not improve
on a runner, and CI's slowness is Depot rather than the runner environment.**

### F17 — Not bandwidth, and not the developer's link

Downlink from this machine, measured against public CDNs:

| source          | throughput |
| --------------- | ---------: |
| CacheFly        |  39.3 MB/s |
| Hetzner Ashburn |  29.7 MB/s |
| npm registry    |  31.4 MB/s |

The Depot arm moved a 449 MB working set in 349 s of wall clock — **1.29 MB/s,
about 3% of the available link.** Combined with F11 (2.31 round-trips per task
against bazel-remote) and F14 (both endpoints at 25 ms), the cost is neither
bandwidth nor network RTT: at 25 ms, a 2,127 ms median per-task hydration
implies roughly **85 sequential round-trips per task, versus 2.3 against
bazel-remote** — or an equivalent per-request server cost. Something in the
Depot path is either failing to batch the way bazel-remote does, or charging
far more per request than the network does.

### F18 — Depot dropped a 606-blob batch in 1 rep of 5

Rep A4 took **997.6 s against a 349 s median** — 3×, and the reason is in the
log:

```
WARN moon_cache_storage::storage_backend  Failed to retrieve blobs, will attempt to retrieve
  remaining from other storage backends  storage="grpc-remote-cache"
  expected_count=606  actual_count=0  errors=["Failed to make gRPC call. Unknown error: transport error"]
```

`plugin-space:build` fell through to re-execution (323 hits instead of 324), and
effective parallelism collapsed from ~3.3× to 1.15×. Hydration _total_ stayed
flat (CV 2.2%) — the lost time was stall, not transfer.

This is the consistency question directly: **Depot's wall-clock CV is 55% across
5 reps; the loopback arm's is 1.5% across 5.** One run in five taking 3× as long
is the failure mode that makes CI unpredictable, and it is invisible in a median.

### Gate 1 evaluation (DESIGN.md §6)

Both legs pass, by margins that leave no interpretive room:

1. **≥20% hydration win at median and p90** — actual is 98.5% at both.
2. **≥10% of job wall-clock** — actual is 95% (349.1 s → 16.9 s).

**But the winning arm is loopback, not a droplet.** Applying F11's slope at
F14's measured 25 ms RTT predicts a DigitalOcean NYC arm at **~31.5 s hydration
/ ~18 s wall** — still **36× better than Depot on hydration and 19× on wall**,
and still clearing both legs by an order of magnitude. That prediction assumes
RTT is the only difference between loopback and a droplet, which understates a
real droplet: it adds server CPU, disk, TLS termination and shared egress.
Provisioning one and measuring it is Stage B, and Gate 1 no longer blocks it.

## Stage B — the DigitalOcean arm, measured

A `s-4vcpu-8gb` droplet in NYC3 running the same `bazel-remote` v2.5.0 with the same
flags as the loopback arm, so the only difference is the network path. TCP
connect from the dev machine: **22.8 ms**, against Depot's 25.0 ms — the droplet
is marginally _closer_, so this is not a latency handicap.

Three arms interleaved A/B/C, 5 reps each, 324/324 hits on every rep.

### F19 — The droplet is 12.6× faster than Depot, and 1.6× slower than loopback

| arm                 | hydration median | hydration p90 | wall median | wall range    | wall CV |   p50/task |
| ------------------- | ---------------: | ------------: | ----------: | ------------- | ------: | ---------: |
| Depot               |        1,100.1 s |     1,183.7 s |     338.0 s | 325.6–363.3 s |    4.7% |    2027 ms |
| loopback            |           16.3 s |        17.6 s |      16.8 s | 16.4–18.0 s   |    3.1% |      28 ms |
| **DO NYC3 droplet** |       **86.0 s** |   **203.0 s** |  **26.8 s** | 24.1–45.5 s   |   26.8% | **133 ms** |

The F11 slope predicted ~31.5 s of hydration for a droplet at this RTT; the
measurement is 86 s. **A real remote server costs ~3× more than pure added RTT
predicts** — server CPU, disk and TLS are not free, exactly the caveat attached
to that prediction. The prediction was wrong; the conclusion is not, because
Depot is another 12.8× beyond that.

**Consistency cuts against the droplet in this run.** Its wall CV is 26.8% versus
Depot's 4.7%, driven by rep C5 at 45.5 s (203 s hydration) against a 26.8 s
median. Depot's own 55% CV rep — the dropped blob batch of F18 — landed in Stage
A, not here. Both have tails. What settles it is that **the droplet's worst rep
is still 7× better than Depot's best** (45.5 s vs 325.6 s), so the variance is
noise around a number that is an order of magnitude smaller.

### F20 — mTLS costs ~11% of wall clock

Re-measured after moving the droplet behind mutual TLS (server and client certs
from a private CA), 3 reps, 324/324 hits:

| arm                | hydration median | wall median |
| ------------------ | ---------------: | ----------: |
| droplet, plaintext |           86.0 s |      26.8 s |
| droplet, mTLS      |          109.2 s |      29.9 s |

So the fairness asymmetry flagged when the plaintext arm was chosen is real but
small: **+27% hydration, +11% wall.** The mTLS droplet is still **11.3× faster
than Depot on wall clock**, and unlike the plaintext arm it is a configuration
that can actually be deployed.

### F21 — Changing the cache config invalidates every task hash

Switching `.moon/workspace.yml` from Depot to the droplet produced **0/324 hits**
on the first run, with no warnings and a full 144 s rebuild — the workspace
config is a hash input, so every task key changed. The following run hit
324/324.

Operationally: **the first CI run after any cache-config change, in either
direction, is a full cold build.** Budget for it, and do not read it as the new
cache failing.

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

### Additional limits on Phase 0b and Stage A (F8–F18)

- **Loopback is not a droplet.** Every measured win is against a server on the
  same machine with the working set in page cache. The droplet figure is a
  prediction from F11's slope, not a measurement, and it credits a droplet with
  loopback's server CPU, disk and TLS costs. Stage B has to measure it.
- **One machine, one network position.** Arm A is a laptop 25 ms from Depot.
  F16 argues the result transfers to a runner because the local and CI figures
  agree, but that is an inference from the handoff's numbers, not a paired
  measurement — a loopback `bazel-remote` inside a CI job would settle it.
- **The Depot arm ran once, at one time of day.** A shared hosted cache can
  behave differently under load; 5 reps in one hour do not characterise it.
- **A dev laptop is not a runner.** 14 cores and local NVMe versus
  `depot-ubuntu-24.04-8` in a container. Absolute times do not transfer. The
  round-trip slope (F11) and the hash-vs-hydration split plausibly do, being
  client properties — F11 reproducing F6's slope across an 11× workload change
  is direct evidence for that.
- **macOS, not Linux.** Different filesystem and syscall costs on the unpack
  path — the exact path F10 argues is _not_ the bottleneck. A Linux runner with
  a loopback server would settle it.
- **`moon r storybook-react:serve` was running** on the machine throughout.
  Wall-clock CV stayed at 3.8% across 6 reps, so contention was not visible, but
  it is uncontrolled.
- **The proxy is still not netem.** It is nearly free here (F11) rather than the
  ~4× of F5, but it remains a userspace relay; `sch_netem` on a Linux runner
  stays the reference method. macOS `dnctl`/`pfctl` dummynet needs sudo and was
  not available non-interactively.

### Operational gotchas

- **`bazel-remote`'s log must not live inside `--dir`.** Redirecting output into
  the cache directory makes the next start fail its directory scan and panic
  (`Unexpected file: server.log` → `panic: send on closed channel`).
- **`which moon` is not the pinned moon.** `proto activate` caches a versioned
  bin directory ahead of `~/.proto/shims` on `PATH`, so a bare `moon` can be an
  older release than `.prototools` pins. Invoke `~/.proto/shims/moon` when the
  client version is under test.
- **Killing a `moon run` orphans its children.** `vite build`/`dx-build`
  processes survive and keep the machine loaded; reap them before the next rep.
