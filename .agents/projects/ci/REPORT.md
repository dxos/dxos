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
| `sync-operation`                                | moon's own bookkeeping, not tasks       |

`task-execution` is easy to miss: on a fully-cached run nothing executes, so it never appears, and
`process-execution` looks like the execution channel. Any ratio computed without it understates
the denominator. [`analyze.mjs`](../../../tools/moon-cache/bench/analyze.mjs) counts all of them.

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

This also refutes the per-file-overhead hypothesis below, which was inferred from restore time
tracking file count rather than bytes.

**It is not the client's network position.** The CI column comes from `depot-ubuntu-24.04-8`
runners that Depot co-locates with its cache; the middle column is a laptop 25 ms away. They agree
within ~20%, and effective parallelism matches too — 3.28–3.35× here against CI's 3.0–3.7×. So
Depot's cost does not improve on a runner, and **CI's slowness is Depot rather than the runner
environment.**

**It is not bandwidth.** The link measures 29.7–39.3 MB/s against public CDNs; the Depot arm moved
449 MB in 349 s of wall clock, **1.29 MB/s — about 3% of what was available.**

**It is not RTT.** `cache.depot.dev` and `nyc3.digitaloceanspaces.com` are equidistant from this
machine (25.0 ms vs 25.5 ms), and the droplet measured 22.8 ms. A latency sweep through a TCP relay
delaying each direction by RTT/2, 3 reps per RTT:

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

All four produce a **green run that quietly rebuilt everything**, which is why the setup action
probes the cache before any task runs rather than trusting a green build.

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

## Restoring is often slower than rebuilding

Measured on CI (run `31050679009`, commit `5c73a0bb`) before the cache moved, by joining two jobs in
the same workflow run that resolved **identical task hashes** — `e2e-bundle` executed them cold,
the `e2e (chromium)` shard restored them minutes later.

| task                        | build cold | restore | verdict                |
| --------------------------- | ---------: | ------: | ---------------------- |
| `composer-app:prebuild`     |      0.2 s |   7.2 s | **restore 35× slower** |
| `devtools-extension:bundle` |      5.6 s |  51.9 s | restore 9.3× slower    |
| `testbench-app:bundle`      |      6.4 s |  47.3 s | restore 7.4× slower    |
| `client:typedoc`            |      3.2 s |  15.9 s | restore 4.9× slower    |
| `cli:bundle`                |      5.2 s |  24.1 s | restore 4.6× slower    |
| `react-client:typedoc`      |      3.4 s |  13.7 s | restore 4.0× slower    |
| `app-framework:typedoc`     |      3.7 s |  11.6 s | restore 3.1× slower    |
| `todomvc:bundle`            |      1.8 s |   4.2 s | restore 2.3× slower    |
| `shell:bundle`              |      2.0 s |   1.1 s | restore 1.9× faster    |
| `rpc-tunnel-e2e:bundle`     |      0.3 s |   0.1 s | restore 2.7× faster    |
| `examples:bundle`           |      2.5 s |   0.4 s | restore 6.0× faster    |
| `composer-crx:bundle`       |      4.3 s |   0.4 s | restore 11.2× faster   |

**8 of 12 slower to restore, ~146 s wasted per job across those eight.** The clearest case,
`composer-app:prebuild`, is literally a `cp -R` of one package's assets: 0.2 s to copy locally,
7.2 s to download the copied result.

Two caveats on those numbers: the columns come from different runners so network variance is
included, and the build column excludes upload cost. Ratios of 35×/9×/7× are far outside noise;
`todomvc` at 2.3× is not.

This measurement predates the cache migration, so the restore column would now be much faster —
but the _shape_ survives, because it is a property of the task rather than the cache: a task that
is cheap to compute and emits many files is a poor caching candidate at any speed. The fix is
`options.cache: false` on high-output-bytes/low-compute tasks, independent of where the cache
lives. Tracked in [`TASKS.md`](./TASKS.md).

## Operational consequences

1. **Any `.moon/workspace.yml` change re-hashes every task.** Switching cache host produced 0/324
   hits and a full 144 s rebuild, then 324/324 on the next run. The first CI run after a cache
   change, in either direction, is a cold build.
2. **mTLS costs ~11% of wall clock, ~27% of hydration.** Worth it; not free.
3. **Hash-generation is the floor.** ~31 s on this graph, client-side, untouchable by any cache. It
   is 66% of run-task time against the loopback arm and 3% against Depot.

## In CI

Everything above is from a dev machine. These are the same graph on real runners, one rep per
cell except where noted, all cache arms at 324/324 hits.

| runner               | cache    |       RTT |    build | tests | hydration | per-task p50 |
| -------------------- | -------- | --------: | -------: | ----: | --------: | -----------: |
| Depot `us-east-1`    | off      |         — |    161 s |  16 s |         — |            — |
| Depot                | **nyc3** |  **7 ms** | **14 s** |   2 s |    13.6 s |        31 ms |
| Depot                | sfo3     |     66 ms |     26 s |   3 s |    59.5 s |       156 ms |
| Blacksmith `us-west` | off      |         — |    177 s |  15 s |         — |            — |
| Blacksmith           | nyc3     |     62 ms |     24 s |   3 s |    55.3 s |       146 ms |
| Blacksmith           | **sfo3** | **19 ms** | **11 s** |   2 s |    25.4 s |        63 ms |

**The cache is worth ~11× on a Depot runner: 161 s uncached against 14 s cached.** mTLS works
from inside the job container, which had not been tested before this.

**Cache location dominates; runner choice barely registers.** A near cache is 11–14 s, a
cross-country one 24–26 s, none at all 161–177 s. Hydration tracks RTT across four independent
points (7→13.6 s, 19→25.4 s, 62→55.3 s, 66→59.5 s), which is the latency-bound model holding on
real runners rather than a laptop.

### Runners

Blacksmith was evaluated as an alternative and **rejected**:

1. **Compute is a wash.** Cold builds: Depot 161–162 s over two runs, Blacksmith 164–177 s.
   Blacksmith's 10 vCPUs against Depot's 8 buy nothing measurable here.
2. **Depot sits closest to the cache.** 7 ms to NYC3, the tightest pairing available — Blacksmith's
   own coast is 19 ms, because their `us-west` is not in DO's SFO3 metro.
3. Migrating would mean `runs-on` changes across seven job definitions and leaving Depot's runners
   entirely, for no measured gain.

Two results worth keeping, since they cut against the recommendation:

- **Blacksmith+sfo3 (11 s) edged out Depot+nyc3 (14 s)** despite nearly double the hydration.
  Blacksmith parallelises restore better — ~2.3× effective against Depot's ~1.0× — so its extra
  cores show up in restore rather than compilation. On single reps, an 11 s vs 14 s gap is not a
  reason to migrate, but it is not noise-free either.
- **Sticky disks were never measurable.** Four consecutive runs failed to mount
  (`Device /dev/vdb still reports zero size after 10000ms`) across two host generations on the
  latest action. Their action degrades to an empty directory, so the job goes green having
  measured a plain disk.
- **Blacksmith's own RE cache rejects moon.** It is gated to registered client identities and only
  Bazel and Buck2 are registered: `instance_name "moon-outputs" does not match registered VM`.
  moon can present another name via `MOON_REMOTE_CACHE_INSTANCE_NAME`, and the registered one is
  derivable as `production/<installation-model-id>/<github-repository-id>/bazel` — but that
  borrows Bazel's identity, and the endpoint is undocumented.

## Depot re-measured after their blob-batching fix (2026-08-18)

Depot support (Pedro) reported the root cause independently: moon requests hundreds of blobs at
once, Depot was fetching them from its own backend one at a time, so the small per-blob delay
compounded — the same mechanism as "Why Depot is slow" above. They shipped a fix and asked for a
retest.

### Dev machine

Method: same harness, `.moon/workspace.yml` temporarily repointed at the pre-#12494 Depot config
(`grpcs://cache.depot.dev`, `DEPOT_TOKEN`), 5 reps of `:build` on commit `83bfa75fad`, moon 2.4.5.
Rep 1 was the config-switch cold build (0 hits, expected — excluded below); reps 2–5 hit
328–329/329 and are the comparison.

| metric              | Depot, before | Depot, retest | self-hosted (current) |
| ------------------- | ------------: | ------------: | --------------------: |
| wall median         |       338.0 s |        51.8 s |                29.9 s |
| hydration median    |     1,100.1 s |       207.9 s |               109.2 s |
| per-task p50        |      2,027 ms |        389 ms |                173 ms |
| wall CV             |          4.7% |          3.3% |                     — |
| dropped-batch fails |   1 of 5 reps |   0 of 5 reps |                     — |

**Depot is 6.5× faster on wall clock and 5.2× faster per-task than before the fix**, and the
per-task collapse (2,027 ms → 389 ms) is the signature of the sequential-round-trip mechanism
being fixed rather than a general speedup. No dropped-blob-batch failures in this run, against 1
of 5 previously — too small a sample to call reliability fixed, but consistent with it.

**Self-hosted is still faster** — 1.7× on wall clock, 2.25× per-task — but the margin dropped from
an order of magnitude to a real-but-modest gap.

### On an actual Depot runner

The 338 s/2,027 ms "before" numbers above were always from a laptop 25 ms from Depot's cache, never
from a runner co-located with it — the per-target CI-vs-laptop comparison earlier in this doc
covered only five individual build targets, not a full aggregate `:build`. A temporary
`push`-triggered workflow (`.github/workflows/moon-cache-bench-depot-retest.yml`, deleted after
this measurement) ran the same 5-rep bench as a two-arm matrix on `depot-ubuntu-24.04-8`, commit
`239dce9d47`, moon 2.4.5. Depot's rep 1 was again the config-switch cold build and is excluded;
self-hosted needed no config switch, so all 5 of its reps count.

| metric           | Depot, CI runner | self-hosted, CI runner | self-hosted is |
| ---------------- | ---------------: | ---------------------: | -------------: |
| wall median      |           31.1 s |                 14.8 s |    2.1× faster |
| hydration median |          120.1 s |                 37.8 s |    3.2× faster |
| per-task p50     |           265 ms |                  60 ms |    4.4× faster |

From a co-located runner Depot is faster still than from the laptop (31.1 s vs 51.8 s wall
median, lower RTT doing what the latency-bound model predicts), but the gap to self-hosted is
_wider_ here than the dev-machine retest suggested (2–4× against 1.7–2.25×) — the dev-machine
numbers understated how far ahead self-hosted actually is on the hardware that matters. This
changes the shape of the "cancel the Depot subscription" call in [`TASKS.md`](./TASKS.md): the
original decision rested on an 11× gap on a Depot runner, now closer to 2–4×, not the 1.7× the
laptop retest implied.

## Limits

- **Everything above "In CI" is from one dev machine**, and only the CI section is not. The
  dev-machine numbers do not transfer as absolutes — see the next point.
- **The CI numbers are one repetition per cell**, except the nyc3 and no-cache arms which have
  two. An 11 s vs 14 s gap on single reps is not a result to act on.
- **Concurrency is unmeasured everywhere.** Every measurement ran one cache client at a time;
  whether ten concurrent CI jobs bind on the droplet's shared egress is still an open question.
- **macOS, not Linux**, on hardware faster than an 8-vCPU containerised runner. Absolute times do
  not transfer; the round-trip slope and the hash-vs-hydration split plausibly do, being client
  properties — the slope reproducing across an 11× workload change is evidence for that.
- **The Depot arm ran once, over about an hour.** A shared hosted cache may behave differently
  under different load.
- **Loopback is a floor, not a candidate** — same machine, working set in page cache.
