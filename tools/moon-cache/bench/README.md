# Remote cache benchmark harness

Compares moon remote caches — hosted, self-hosted, or the same server at a simulated RTT. Produced
the numbers in [`.agents/projects/ci/REPORT.md`](../../../.agents/projects/ci/REPORT.md); kept because the
next cache question deserves the same instrument rather than a fresh one.

Results land in `.moon-bench/` (gitignored).

## Comparing two caches

```bash
# Arm A — whatever .moon/workspace.yml points at.
./tools/moon-cache/bench/reps.sh A 5

# Arm B — an override. Interleave the calls, never 5xA then 5xB.
./tools/moon-cache/bench/reps.sh B 5 'grpc://127.0.0.1:9092'

node tools/moon-cache/bench/analyze-ab.mjs .moon-bench
```

`analyze-ab.mjs` prints per-rep wall/hydration/hit counts and then median, p90, range and
coefficient of variation per arm. `analyze-3arm.mjs` does the same for arms labelled `A`/`B`/`C`.

## Simulating a cache at a different RTT

```bash
RTTS="0 2 5 10 20 40" REPS=3 ./tools/moon-cache/bench/sweep.sh 9092
node tools/moon-cache/bench/analyze-sweep.mjs .moon-bench
```

`delay-proxy.mjs` is a TCP relay delaying each direction by RTT/2 — a substitute for `tc netem`,
which needs `NET_ADMIN` and an `sch_netem`-capable kernel, and does not exist on macOS. It reports
a least-squares slope in ms of hydration per ms of RTT, and per-task round-trips.

## A local server to measure against

```bash
go install github.com/buchgr/bazel-remote/v2@v2.5.0
bazel-remote --dir /tmp/moon-cache --max_size 20 --storage_mode zstd \
  --grpc_address 127.0.0.1:9092 --http_address 127.0.0.1:9093 --enable_endpoint_metrics
```

Keep the server's log **outside** `--dir`, or the next start fails its directory scan and panics.

## Rules that make the numbers mean anything

1. **Assert server-side traffic on every arm.** `curl -s localhost:9093/status` must show a
   non-zero file count, or `cached from remote` must be non-zero. A missing credential, a rejected
   credential and an unresolvable host all produce a green run with no caching — three of the four
   failure modes in the report were found this way.
2. **Prime every arm at the same SHA before measuring**, and check the hit counts match. Otherwise
   you are comparing a rebuild against a cache.
3. **Pin the SHA and do not use `--affected`** — the action graph must be identical across arms.
4. **Never `--no-actions`.** It destroys cache hits and silently turns this into a build benchmark.
5. **Use `~/.proto/shims/moon`, not `moon`** — `proto activate` can put an older version ahead of
   the shims on `PATH`, and the client version is part of what you are measuring.
6. **Median and p90, never mean.** Both hosted and self-hosted caches showed multi-x tail reps.
