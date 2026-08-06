# Depot cache benchmark — Tasks

_Resume: **Gates 1 and 2 passed; the droplet is provisioned, behind mTLS, and wired into the repo.** Stage B (F19–F21): a NYC3 `s-4vcpu-8gb` running bazel-remote hydrates the 324-task `:build` in **86 s / 26.8 s wall** against Depot's **1,100 s / 338 s** — 12.6×, at a marginally lower RTT (22.8 vs 25.0 ms). mTLS costs +11% wall (F20). Config landed: `.moon/workspace.yml` → `grpcs://cache.dxos.network:9092` + mtls block, certs materialised by `.github/actions/setup` from three secrets across all 14 call sites, new `.github/actions/assert-remote-cache` guard, ops docs in `tools/moon-cache/`. **Remaining before it can be used: DNS for `cache.dxos.network`, the three GitHub secrets, and CA-key custody** — see the to-do list below. Nothing is committed yet._

_Prior: **Gate 1 passed — provisioning a droplet is now justified.** Stage A ran on a dev machine: 324-task `:build`, interleaved A/B/A/B, 5 reps each. Depot hydration median **1,149 s** / wall **349 s**; loopback `bazel-remote` **17.2 s** / **16.9 s** — 67× and 21× (F15). The local Depot arm reproduces CI's per-task figures within ~20% and its 3.0–3.7× parallelism, so CI's slowness is Depot, not the runner (F16); it is not bandwidth (1.29 MB/s used of a 39 MB/s link, F17); and Depot dropped a 606-blob batch in 1 rep of 5, giving it a 55% wall-clock CV against loopback's 1.5% (F18). Next: Stage B (a DO NYC droplet, predicted ~31 s hydration / ~18 s wall at the measured 25 ms RTT) and one CI run with a loopback server to confirm F16 by paired measurement. Findings in [`REPORT.md`](./REPORT.md); harness in [`probe/`](./probe/)._

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
- [x] **Measure the M2 ceiling on the real workload** — done locally (F9), not
      yet in CI
  - 324 cache-eligible actions, 6 reps: hydration median **13.3 s** (p50 21 ms
    per task), wall **14.7 s**, 324/324 hits every rep, CV 3.8% on wall.
  - Cold equivalent: 161.5 s wall / 915.4 s `task-execution`. Working set
    **209 MB / 449 MB / 25,863 blobs** (`:build`); **815 MB / 2.28 GB / 49,562**
    with `:bundle`.
  - The gate did **not** stop the project: hydration is ~90% of task time in CI
    (handoff) and the recoverable cost is transport, not client work (F10).
- [ ] **Confirm F16 inside CI by paired measurement** — no longer gates the
      decision, but it is the one inference Stage A rests on
  - One `workflow_dispatch` job at a pinned SHA running both arms: Depot, and a
    `bazel-remote` on the runner's loopback.
  - F16 argues from agreement between the local Depot arm and the handoff's CI
    figures that Depot's cost is invariant to network position. A loopback arm
    on the runner tests that directly, on the hardware that matters.
  - Also captures runner→Depot RTT and runner-class throughput, which the local
    measurements cannot.
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
  - [x] Re-measure on the real graph — **2.31 per cached task** over 324 tasks
        and 449 MB (F11). The model holds: hydration is latency-bound, not
        bandwidth-bound, at this scale. Wall-clock slope is 143 ms per ms RTT.
  - [ ] Re-measure on a CI runner — Linux, containerised, and a runner-class
        network are all still unmeasured.
- [x] **Record the working set (M6)** — F9. `:build` **209 MB compressed /
      449 MB uncompressed / 25,863 blobs**; with `:bundle` **815 MB / 2.28 GB /
      49,562 blobs**. Largest single blob 75.9 MB.
- [x] **Localise the four never-hydrating targets** — F13. All four hydrate
      through `bazel-remote` (309/309 hits, 3 reps), `docs:bundle` and its two
      checked-in mp4s included. Neither moon's client nor the artifacts are at
      fault; the 4 MB abort does not fire against a server that negotiates
      ByteStream. Points at Depot's endpoint or the CI environment.
  - [ ] Confirm against Depot once a working token exists — blocked by F12.
- [x] **Get a Depot token with cache scope for org `t8fblrl00n`** — the prior
      value was a 73-character truncated paste of a 74-character token, which
      moon degrades on silently and greenly (F12). Arm A runs with it corrected.
- [ ] **Reword the "expected and harmless" token warning** in `AGENTS.md` and
      `REPOSITORY_GUIDE.md` to cover rejected tokens as well as missing ones
      (F1 + F12). Separate change, not this branch.

## Phase 2b: Adoption — what is left before CI can use it

Everything here needs a credential, a DNS record, or a decision that is not mine
to make. The code side is done and uncommitted in this branch.

- [ ] **DNS: point `cache.dxos.network` at `64.225.13.237`.** `.moon/workspace.yml`
      already uses the name, and the server certificate carries both the name and
      the IP as SANs, so nothing needs re-issuing. **Until this record exists, CI
      and any fresh checkout cannot resolve the cache** and will silently fall
      back to local-only.
- [ ] **Reserve the droplet's IP** (`doctl compute reserved-ip`). A rebuild
      currently changes the address, which invalidates the server certificate's
      IP SAN.
- [ ] **Add three repository secrets** from the generated certificates —
      `MOON_CACHE_CA_PEM`, `MOON_CACHE_CLIENT_PEM`, `MOON_CACHE_CLIENT_KEY`.
      Wired into all 14 `./.github/actions/setup` call sites already.
- [ ] **Put `ca.key` somewhere durable and restricted** (1Password). It signs new
      client certificates; there is no revocation path, so losing it means
      re-issuing everything and leaking it means anyone can poison build outputs.
- [ ] **Distribute client certs to developers** — decide the channel (1Password
      item is the obvious one) and document it in `tools/moon-cache/README.md`,
      which currently says "from an admin".
- [ ] **Decide read-only vs read-write for developer certs.** Today every client
      can write. `bazel-remote` has no per-client ACL, so a read-only tier means
      a second instance or `--allow_unauthenticated_reads` plus a private write
      path. Relevant because a developer's machine can currently poison CI's cache.
- [ ] **Flip `assert-remote-cache` from `warn-only` to failing** in the `check`
      job once the cache has a week of green, and add it to the other five moon
      jobs (`test`, `storybook`, `workerd`, `e2e`, `cli`).
- [ ] **Monitoring + alerting** on `:9093/metrics` — at minimum disk usage
      approaching the 100 GB LRU bound and a liveness check on `/status`.
      A dead cache is invisible today: CI just gets slow.
- [ ] **Egress budget.** 449 MB per job for `:build`, 2.28 GB with `:bundle`;
      ~10 jobs per Check run puts 10–20 GB per run on DO egress against a 5 TB
      allowance, so ~$40–130/month at 30 runs/day. Measure a week before assuming.
- [ ] **Decide the fate of `DEPOT_TOKEN`.** Still referenced by the rollback
      comment in `.moon/workspace.yml`; keep the secret until the cache has
      proven itself, then remove it and the Depot org.
- [ ] **Backup/restore story.** The cache is regenerable, so a lost droplet costs
      one cold build rather than data — but that cold build is ~915 s of
      `task-execution` per job, so decide whether that is acceptable unplanned.

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
