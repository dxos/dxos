# Depot cache benchmark — Tasks

_Resume: start Phase 0 — confirm the runReport.json remote-operation taxonomy, then measure the M2 ceiling and the sequential-round-trip count. Only open question left is the Gate 1 threshold (DESIGN.md §9 Q2). Uncommitted: none. Last: host fixed as DigitalOcean and motivation fixed as latency, which promotes the netem arm to the Stage B decision._

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
- [ ] **Count sequential round-trips per run** — decides the whole DO question
  - How many CAS calls does a full run make, and how well does moon batch them?
  - Few batched calls ⇒ the DO RTT penalty is noise. One call per artifact ⇒ the
    penalty multiplies by the artifact count and Stage B is likely dead on
    arrival. Record the blob-count and call-count distribution, not just totals.
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
