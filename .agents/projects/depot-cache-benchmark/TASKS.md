# Depot cache benchmark — Tasks

_Resume: answer DESIGN.md §9 (runner region, Gate 1 threshold, Stage B home, motivation), then start Phase 0. Uncommitted: none. Last: plan written (DESIGN.md)._

Design, methodology, controls and gates: [`DESIGN.md`](./DESIGN.md).

## Phase 0: Is the cache even on the critical path?

The cheapest question, asked first. If remote-cache operations are a small share
of job wall-clock, the ceiling on any cache change is that share — and the
project ends here with a number instead of a deployment. Also validates the
measurement instrument before anything depends on it.

### Tasks

- [ ] **Confirm the runReport operation taxonomy for moon 2.4.5**
  - Run one real task with the Depot cache warm; dump
    `.moon/cache/runReport.json` and enumerate the distinct
    `actions[].operations[]` kinds.
  - Identify which kinds are remote download, remote upload, and local
    hydration. If they are not separable, fall back to `moon --dump` (chrome
    trace) or `--log trace --log-file`.
- [ ] **Cross-check against `moon run --summary detailed`**
  - The parser and moon's own summary must agree on total cached-task time.
- [ ] **Measure the M2 ceiling on the real CI workload**
  - One instrumented `check`/`test` job at a pinned SHA, cache warm.
  - Report: remote-cache seconds vs total moon-step seconds, per job.
  - **If M2 is a negligible share of M1, stop and write it up.**
- [ ] **Raw endpoint latency from inside the runner**
  - TCP connect + TLS handshake time to `cache.depot.dev`, N samples.
  - This is the RTT figure the Stage A netem arm will use.
- [ ] **REAPI micro-benchmark**
  - `FindMissingBlobs` / `BatchReadBlobs` / ByteStream `Read` over a 4 KB /
    64 KB / 1 MB / 16 MB blob ladder against Depot.
  - Separates endpoint latency from moon client cost.
- [ ] **Record the working set (M6)**
  - CAS bytes moved by one full `moon run :lint :build` — sizes Stage B's disk
    and its egress estimate.

## Phase 1: Harness

One harness used unchanged by every arm; an arm that needs a bespoke measurement
is not comparable to the others.

### Tasks

- [ ] **`tools/bench-remote-cache/` — runner**
  - N interleaved reps (A/B/A/B), pinned SHA, no `--affected`.
  - Wipes `.moon/cache/{outputs,states,hashes}` per rep; leaves toolchain and
    pnpm store warm.
  - Records a ~5s CPU + disk micro-baseline per rep for runner-drift detection.
- [ ] **`tools/bench-remote-cache/` — reporter**
  - Parses `runReport.json` → M1, M2, M3 (p50/p90/max, MB/s), M4, M5, M6.
  - **Asserts equal hit rate (M4) across arms and fails the run if it differs.**
  - Emits JSON + a markdown table; median and p90, never mean.
- [ ] **`.github/workflows/bench-remote-cache.yml`**
  - `workflow_dispatch` only, matrix over arms, uploads the JSON artifact.
  - Never on push — it is expensive and it is not a check.
- [ ] **Prime-then-measure protocol**
  - Full run at the pinned SHA against each arm's cache before any measured rep.

## Phase 2: Stage A — localhost floor → Gate 1

`bazel-remote` on `127.0.0.1`, on the same runner class in CI (not a laptop —
different CPU and disk make the floor unusable for predicting CI).

### Tasks

- [ ] **Stand up `bazel-remote` in the CI job**
  - `--storage_mode zstd --grpc_address 127.0.0.1:9092`, disk sized above M6.
  - `remote.host: 'grpc://127.0.0.1:9092'`, compression and `verifyIntegrity`
    matched to the Depot arm.
- [ ] **Run arms: Depot vs localhost**
  - Warm (download) and cold (upload, M5) reported separately.
- [ ] **Run the netem prediction arm**
  - localhost + `tc qdisc … netem delay <RTT from Phase 0>`.
  - If it lands on the Depot arm, Stage B is already answered: no.
- [ ] **Evaluate Gate 1** (DESIGN.md §6)
  - Requires ≥ 20% M2 win on median _and_ p90, **and** ≥ 10% of M1 on the
    largest job. One metric alone is a null result.
  - Record the decision and its numbers in `REPORT.md` either way.

## Phase 3: Stage B — deployed self-hosted → Gate 2

**Gated on Phase 2.** Do not start until Gate 1 passes and DESIGN.md §9 Q1/Q3
are answered.

### Tasks

- [ ] **Confirm the Depot runner region** — cross-region placement loses on RTT
      before it starts; this is a prerequisite, not a detail.
- [ ] **Deploy `bazel-remote` same-region** — NVMe-backed, disk above the M6
      working set so eviction never fires during a measured rep.
- [ ] **Auth + TLS** — token/basic auth plus TLS (or mTLS via moon's `mtls`
      block). Never an open CAS. Budget the certificate lifecycle into the ops
      estimate.
- [ ] **Run the third arm through the unchanged harness**
- [ ] **Cost model** — Depot cache spend over the measured window vs instance +
      storage + egress + eviction-tuning + on-call.
- [ ] **Evaluate Gate 2** (DESIGN.md §7) — p90 must hold, and the win must
      survive the ops bill and the no-SLA reality.

## Phase 4: Report and decision

### Tasks

- [ ] **`REPORT.md`** — numbers, both gate decisions, recommendation.
- [ ] **Land the harness regardless of the outcome** — a reusable A/B rig for
      the next cache question is worth keeping even if the answer is "stay on
      Depot".
- [ ] **If adopting:** migration plan covering the `DEPOT_TOKEN` →
      self-hosted-auth swap across every job in `check.yml`, plus a documented
      fallback for a cache outage.

## References

- Config under test: `.moon/workspace.yml` (`remote.*`), consumed by every job
  in `.github/workflows/check.yml` on `depot-ubuntu-24.04-8`.
- moon remote caching: https://moonrepo.dev/docs/guides/remote-cache
- `bazel-remote`: https://github.com/buchgr/bazel-remote
- NativeLink (fallback candidate): https://github.com/TraceMachina/nativelink
- moon workspace config reference:
  `.agents/skills/moon/references/workspace-config.md` (§Remote Caching)
