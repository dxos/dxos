# Depot cache benchmark — Tasks

_Resume: Phase 0 is done except the one measurement that needs CI — the M2 ceiling on a real job, with `DEPOT_TOKEN` present. Findings in [`REPORT.md`](./REPORT.md); probe scripts in [`probe/`](./probe/). Uncommitted: none. Last: F1 (a missing token silently disables remote caching outright), F6 (~2.2 round-trips per cached task — moon batches, so DO's RTT penalty is ~11 ms/task) and F7 (hydration is only 23% of cached-task time; hash-generation is the other 77% and no cache can touch it)._

Design, methodology, controls and gates: [`DESIGN.md`](./DESIGN.md).

## Phase 0: Is the cache even on the critical path?

The cheapest question, asked first. If remote-cache operations are a small share
of job wall-clock, the ceiling on any cache change is that share — and the
project ends here with a number instead of a deployment. Also validates the
measurement instrument before anything depends on it.

### Tasks

- [x] **Confirm the runReport operation taxonomy for moon 2.4.5** — REPORT.md F2.
  - M2 = sum of `output-hydration` ops with `status == 'cached-from-remote'`
    (`cached` means a local hit). Upload side is `archive-creation`.
  - `hash-generation` is client-side and unrecoverable by any cache — it was
    3.7× the whole remote hydration cost on the sample run, so it is a floor
    under every arm.
- [x] **Cross-check against `moon run --summary detailed`** — agrees; the
      summary's per-task `cached from remote` markers match the report's
      `cached-from-remote` statuses 12/12.
- [x] **A missing `DEPOT_TOKEN` silently disables remote caching** — REPORT.md
      F1. Not a planned task; found while validating the instrument.
  - [ ] Reword the "expected and harmless" claim in `AGENTS.md` and
        `REPOSITORY_GUIDE.md` — it is harmless for correctness, but it means
        local dev has no remote cache at all. Separate change, not this branch.
- [x] **`MOON_REMOTE_HOST` overrides `workspace.yml`** — REPORT.md F3. Arms
      switch by env var, so no benchmark config can leak into a commit.
- [x] **`--no-actions` destroys cache hits** — REPORT.md F4. Do not use it to
      strip pnpm-install noise from wall-clock; it converts the cache benchmark
      into a build benchmark silently.
- [ ] **Measure the M2 ceiling on the real CI workload** — the one blocking item
  - One instrumented `check`/`test` job at a pinned SHA, cache warm, with
    `DEPOT_TOKEN` present so the arm is real (F1).
  - Report: remote-cache seconds vs total moon-step seconds, per job.
  - **If M2 is a negligible share of M1, stop and write it up.**
  - Locally this came out at **23% of cached-task time**, with hash-generation
    (unrecoverable by any cache) taking the other 77% — REPORT.md F7. That is a
    client property and may transfer; the working-set scale will not.
- [ ] **Raw endpoint latency from inside the runner**
  - TCP connect + TLS handshake time to `cache.depot.dev`, N samples.
- [ ] **Confirm the runner region empirically**
  - IMDSv2 (`.../placement/availability-zone`), falling back to a geo-IP lookup
    of the egress IP; cross-check the Depot dashboard. Published figure is AWS
    `us-east-1` — verify rather than assume.
- [ ] **Measure DO-NYC → runner RTT** — the number the netem arm needs
  - Stand up a throwaway droplet in NYC1/2/3 and measure RTT both ways.
  - This is the only Stage B input that cannot be derived from inside CI, and
    it is far cheaper than deploying the real thing.
- [ ] **REAPI micro-benchmark**
  - `FindMissingBlobs` / `BatchReadBlobs` / ByteStream `Read` over a 4 KB /
    64 KB / 1 MB / 16 MB blob ladder against Depot.
  - Separates endpoint latency from moon client cost.
- [x] **Count sequential round-trips per run** — REPORT.md F6. **~2.2 per cached
      task**, measured as a 63.7 ms/ms-RTT slope over 29 tasks. moon batches: the
      same run moves 498–6,972 blobs, so RTT is charged per task, not per
      artifact. At a hypothesised +5 ms for DO-NYC that is +11 ms per task, and
      wall-clock did not move outside noise across 0–40 ms.
  - [ ] Re-measure on a real CI job — the linear model assumes latency-bound
        hydration and a GB-scale working set may be bandwidth-bound instead.
- [ ] **Record the working set (M6)**
  - CAS bytes moved by one full `moon run :lint :build` — sizes the droplet's
    disk, and its network throughput, and the DO egress estimate.

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
  - Parses `runReport.json` → M1, M2, M3 (p50/p90/max, MB/s), M4, M5, M6, using
    the F2 taxonomy.
  - **Asserts equal hit rate (M4) across arms and fails the run if it differs.**
  - **Asserts the remote endpoint actually received traffic** — F1 and F4 are
    both silent-green failures where the run looks fine and measures nothing.
    Check the server's request counter, or a nonzero `cached-from-remote` count.
  - Emits JSON + a markdown table; median and p90, never mean.
- [ ] **Port `delay-proxy.mjs` into the harness** (from the scratchpad; F5)
  - `tc netem` needs `NET_ADMIN` and an `sch_netem`-capable kernel; the
    userspace proxy needs neither. Prefer netem on the runner if it works there,
    since the proxy's own overhead inflates the RTT=0 baseline.
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
- [ ] **Run the netem prediction arm** — the cheap stand-in for Stage B
  - localhost + `tc qdisc … netem delay <measured DO-NYC RTT from Phase 0>`.
  - This approximates the DigitalOcean arm to within droplet-vs-loopback, for
    one CI run and no infrastructure. If it lands on the Depot arm, Stage B is
    answered: no — do not deploy anything.
- [ ] **Evaluate Gate 1** (DESIGN.md §6)
  - Requires ≥ 20% M2 win on median _and_ p90, **and** ≥ 10% of M1 on the
    largest job. One metric alone is a null result.
  - Record the decision and its numbers in `REPORT.md` either way.

## Phase 3: Stage B — DigitalOcean → Gate 2

**Gated on Phase 2, and specifically on the netem arm.** No DO region is
co-located with Depot's `us-east-1` runner fleet (DESIGN.md §7), so this stage
starts at an RTT disadvantage and is only worth its cost if the netem arm — which
simulates exactly that disadvantage for free — still beats Depot.

### Tasks

- [ ] **Provision the droplet** — DO NYC (nearest to `us-east-1`), NVMe-backed,
      disk above the M6 working set so eviction never fires during a measured
      rep, and sized for **network throughput** as well as disk: a shared-egress
      droplet against Depot's 12.5 Gbps runners may bind on bandwidth before
      latency.
- [ ] **Deploy `bazel-remote`** — `--storage_mode zstd`, matched to the other
      arms' compression and `verifyIntegrity`.
- [ ] **Auth + TLS** — token/basic auth plus TLS (or mTLS via moon's `mtls`
      block). Never an open CAS on a public droplet. Budget the certificate
      lifecycle into the ops estimate.
- [ ] **Run the third arm through the unchanged harness**
- [ ] **Check the netem prediction against it** — if they disagree materially,
      the prediction model was wrong and any future arm has to be measured, not
      simulated. Worth knowing either way.
- [ ] **Cost model** — Depot cache spend over the measured window vs droplet +
      storage + DO egress + eviction-tuning + on-call. Recorded, not decisive.
- [ ] **Evaluate Gate 2** (DESIGN.md §7) — p90 must hold (cross-provider paths
      are noisier), and a latency tie means stay on Depot.

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
