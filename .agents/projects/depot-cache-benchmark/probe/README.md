# Phase 0 probe

Throwaway scripts behind [`../REPORT.md`](../REPORT.md) F5–F7. Kept so the
numbers are reproducible; superseded by `tools/bench-remote-cache/` once Phase 1
lands.

## Running it

```bash
go install github.com/buchgr/bazel-remote/v2@v2.5.0
bazel-remote --dir /tmp/moon-cache --max_size 8 --storage_mode zstd \
  --grpc_address 127.0.0.1:9092 --http_address 127.0.0.1:9093 \
  --enable_endpoint_metrics &

# Populate, then sweep.
DEPOT_TOKEN=anything MOON_REMOTE_HOST='grpc://127.0.0.1:9092' moon run react-ui:build
TARGET=react-ui:build REPS=3 RTTS="0 2 5 10 20 40" ./bench.sh
```

`DEPOT_TOKEN` must be set to *something* or moon silently skips the remote
entirely (REPORT.md F1) — the value is irrelevant against a server with auth
disabled, only its presence matters. Never pass a real token to a local server.

Check `curl -s localhost:9093/metrics | grep bazel_remote_incoming` after a run:
zero requests means the arm measured nothing.

## Files

- `delay-proxy.mjs` — TCP relay injecting RTT/2 per direction. Substitute for
  `tc netem` where the kernel lacks `sch_netem`; inflates the RTT=0 baseline, so
  only its slope is usable.
- `bench.sh` — clears moon's local cache per rep, runs the target, extracts
  hydration/hash timings from `.moon/cache/runReport.json`.
- `latency-sweep.csv` — raw data for REPORT.md F6.
