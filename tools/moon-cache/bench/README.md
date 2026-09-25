# Remote cache benchmark harness

Two scripts: `bench.sh` runs reps against a cache, `analyze.mjs` reads the reports. That is the
whole thing. It produced the numbers in
[`.agents/projects/ci/REPORT.md`](../../../.agents/projects/ci/REPORT.md), and it is here so the next
cache question gets measured the same way rather than re-invented.

Output lands in `.moon-bench/` (gitignored).

```bash
# Interleave the arms — A, B, A, B — never all of one then all of the other.
./tools/moon-cache/bench/bench.sh A 5                            # the configured cache
./tools/moon-cache/bench/bench.sh B 5 'grpc://127.0.0.1:9092'    # a local bazel-remote

node tools/moon-cache/bench/analyze.mjs .moon-bench
```

```text
arm        n  hits      wall median  wall range          CV  hydration median  per-task p50
A          5       324       338.0s  325.6-363.3s      4.7%           1100.1s  2027ms
B          5       324        16.8s  16.4-18.0s        3.1%             16.3s  28ms

B is 20.1x faster than A on wall clock.
```

That sample is the historical Depot-versus-loopback comparison, kept because it shows the output
shape at a large margin — arm A there is Depot's hosted cache, not the self-hosted one now
configured.

`analyze.mjs` also takes a single report — `node analyze.mjs .moon/cache/runReport.json` — for the
operation breakdown of one run, which is the quickest way to check whether a cache is working at
all.

## A local server to measure against

```bash
go install github.com/buchgr/bazel-remote/v2@v2.5.0
bazel-remote --dir /tmp/moon-cache --max_size 20 --storage_mode zstd \
  --grpc_address 127.0.0.1:9092 --http_address 127.0.0.1:9093 --enable_endpoint_metrics
```

Keep the server's log **outside** `--dir`, or the next start fails its directory scan and panics.

## Rules that make the numbers mean anything

1. **Check the hit counts match across arms.** `analyze.mjs` warns when they differ. Unequal hits
   means you are comparing a rebuild against a cache, not two caches.
2. **A green run proves nothing.** Absent credentials, rejected credentials and an unresolvable
   host all produce a passing build with no caching — three of the four failure modes in the report
   were found that way. Non-zero hits is the only evidence the arm measured anything.
3. **Pin the SHA and never use `--affected`** — the action graph must be identical across arms.
4. **Never `--no-actions`.** It destroys cache hits and silently turns this into a build benchmark.
5. **Median and p90, never mean.** Both hosted and self-hosted caches produced multi-x tail reps.
6. Editing `.moon/workspace.yml` re-hashes every task, so the first run after a config change is a
   cold build and is not a measurement.
