# Depot cache vs self-hosted — benchmark design

## 1. Question

`.moon/workspace.yml` points every moon task at Depot's hosted remote cache:

```yaml
remote:
  host: 'grpcs://cache.depot.dev'
  auth:
    token: 'DEPOT_TOKEN'
    headers:
      'X-Depot-Org': 't8fblrl00n'
```

Every CI job in `.github/workflows/check.yml` (`check`, `test`, `storybook`,
`workerd`, `e2e`, `cli`) reads and writes that cache from a
`depot-ubuntu-24.04-8` runner inside `ghcr.io/dxos/gh-actions:24.11.1`.

**Is that cache costing us wall-clock relative to a cache we run ourselves?**

Answered in two stages, the second gated on the first:

- **Stage A — localhost.** `bazel-remote` on `127.0.0.1` on the same runner
  class. Zero RTT, so it measures the _floor_: what remote caching costs when
  the network is free.
- **Stage B — deployed.** Only if Stage A shows recoverable headroom: a
  self-hosted instance co-located with the Depot runner fleet, measured with the
  identical harness.

## 2. Stated prior

CI already runs on Depot runners, and Depot's pitch for its cache is that it
sits on the same network as those runners — so the RTT is probably already close
to optimal. The honest hypothesis is that the delta will be **small**, and that
the plausible reasons to self-host are cost, cache size/eviction control, and
independence rather than latency.

That is not a reason to skip the experiment; it is a reason to run Phase 0
first, because Phase 0 answers the cheap question — _is remote-cache time even a
meaningful share of job wall-clock?_ — and a "no" there ends the whole thing for
the price of one instrumented CI run.

## 3. What "faster" means

Ordered; **M1 decides**, the rest explain it.

| ID  | Metric                                                       | Role                                                  |
| --- | ------------------------------------------------------------ | ----------------------------------------------------- |
| M1  | Job wall-clock for the moon step                             | The decision metric — the only one users feel.        |
| M2  | Cache time on the critical path (hydration + archive/upload) | Where an M1 delta must come from, if it is real.      |
| M3  | Per-artifact latency p50/p90/max, effective MB/s             | Distinguishes "slow per blob" from "many blobs".      |
| M4  | Cache hit rate                                               | A **control**, not a result — must match across arms. |
| M5  | Upload cost on the miss path                                 | Cold runs pay this; report separately from M1/M2.     |
| M6  | Working-set size (CAS bytes moved per full run)              | Sizes Stage B's disk and its egress bill.             |

M2 has an upper bound: if remote-cache operations are (say) 40s of a 14-minute
job, then **no** cache can save more than 40s, and Stage B is pointless
regardless of how much faster it is per-blob. Establishing that ceiling is
Phase 0's entire job.

## 4. Instrument (validate before measuring)

moon 2.4.5 is available locally (`node_modules/.bin/moon`) and in CI. Three
independent sources, in preference order:

1. **`.moon/cache/runReport.json`** — `actions[].operations[]` carries
   `startedAt`/`finishedAt`/`duration` per operation. This is the primary
   source. **Phase 0 must first confirm which operation kinds in 2.4.5
   correspond to remote download vs upload vs local hydration** — the shape is
   known (`label`, `node`, `operations`, `status`, `duration`) but the remote
   operation taxonomy has not been verified on a real task run in this repo.
2. **`moon run --summary detailed`** — human-readable cross-check that the
   report parser agrees with what moon prints.
3. **`moon --dump`** (chrome trace profile) and `--log trace --log-file` —
   fallback if (1) does not separate remote from local time.

Plus two measurements that bypass moon entirely, so we can tell "Depot is slow"
apart from "moon's client is slow":

4. **Raw RTT** to `cache.depot.dev` from inside the runner (TCP connect + TLS
   handshake timing), vs the same to the Stage B host.
5. **A REAPI micro-benchmark** — `FindMissingBlobs`, `BatchReadBlobs`, and
   ByteStream `Read` of a fixed blob-size ladder (4 KB / 64 KB / 1 MB / 16 MB)
   against each endpoint. This yields clean per-endpoint latency and throughput
   curves that are independent of moon's client, hashing, and disk writes.

If (5) shows the endpoints are within noise but (1) shows a large M2 gap, the
gap is in moon's client and self-hosting cannot fix it.

## 5. Controls

This is where cache benchmarks usually lie. Every arm must hold these fixed:

- **Pinned commit SHA.** No `--affected`; the action graph must be identical
  across arms. (CI's normal `moon run :lint :build --affected remote` is not a
  benchmark workload.)
- **Equal hit rate (M4).** Prime each cache with a full run at that SHA before
  any measured run, and assert M4 is equal across arms in the harness. An arm
  with a lower hit rate is measuring a rebuild, not a cache.
- **Cold local state per rep.** `rm -rf .moon/cache/{outputs,states,hashes}`
  between measured runs — otherwise a local hit masks the remote path entirely.
  Keep the toolchain and pnpm store warm (they are not under test).
- **Same runner class, image, and `MOON_CONCURRENCY`.**
- **Same `remote.cache.compression: zstd` and `verifyIntegrity`** on every arm.
  Depot's server-side compression and bazel-remote's `--storage_mode zstd` must
  be configured to match, or we are benchmarking gzip vs zstd.
- **Interleaved A/B/A/B, N ≥ 5 per arm** — never 5×A then 5×B; shared-runner
  drift over a 40-minute window is larger than the effect we are hunting.
- **Report median and p90**, never the mean. One evicted runner ruins a mean.
- **A per-rep machine baseline** (fixed CPU + disk micro-bench, ~5s) recorded
  alongside each result, so a slow runner is identifiable rather than averaged
  in.
- **Miss path and hit path reported separately.** Cold (upload, M5) and warm
  (download, M2) are different questions with different answers.

## 6. Stage A — localhost floor

Run `bazel-remote` on `127.0.0.1` **on the same runner class in CI**, not on a
laptop: a laptop's CPU and disk differ from the runner's, which makes the floor
meaningless for predicting CI.

```bash
bazel-remote --dir /mnt/moon-cache --max_size 20 \
  --storage_mode zstd --grpc_address 127.0.0.1:9092
```

```yaml
remote:
  host: 'grpc://127.0.0.1:9092'
```

`t_depot − t_localhost` is the **maximum** any self-hosted deployment could
recover — and only the RTT-attributable share of it is actually recoverable,
since a deployed server adds back the network that localhost removed.

**Third arm: predict Stage B before paying for it.** Re-run the localhost arm
behind `tc qdisc add dev lo root netem delay <RTT>ms` with the RTT set to a
plausible same-region figure (measured in Phase 0, step 4). If the netem arm
lands on top of the Depot arm, Stage B is already answered: no.

### Gate 1

Proceed to Stage B only if **both** hold:

1. The localhost arm beats Depot on M2 by ≥ 20% (median _and_ p90), and
2. that delta is ≥ 10% of M1 on the largest job.

Otherwise: stop, write up the numbers, and keep Depot. A gate that only one
metric passes is a null result, not a partial win.

## 7. Stage B — deployed self-hosted

**Candidate:** [`bazel-remote`](https://github.com/buchgr/bazel-remote) — mature,
REAPI v2 over gRPC, zstd, disk/S3/GCS backends, and the implementation moon's
own docs target. [NativeLink](https://github.com/TraceMachina/nativelink) is the
fallback if bazel-remote's eviction or S3 path disappoints; do not evaluate both
in the first pass.

**Placement is the experiment.** The server must sit in the same region as the
Depot runner fleet — confirm the org's runner region in the Depot dashboard
_first_, since a cross-region server loses on RTT before it starts and would
produce a foregone conclusion.

**Sizing** comes from M6: NVMe-backed instance with disk cache comfortably above
the measured working set, so eviction never runs during a measured rep.

**Auth is a required cost line, not an optional extra.** Never expose an
unauthenticated CAS. moon supports `auth.token` + headers, `tls` (cert +
domain), and `mtls` (CA + client cert/key); bazel-remote supports basic auth,
TLS, and mTLS. Budget the certificate lifecycle into the ops estimate.

### Gate 2

Adopt only if the deployed arm beats Depot on M1 by a margin that survives:

1. **p90, not just median** — a cache that is usually faster and occasionally
   terrible is worse than a consistent one.
2. **The ops bill** — instance + storage + egress + eviction tuning + the
   on-call reality that a cache outage turns every CI job into a full cold
   build. There is no SLA on a cache we run.
3. **Cost comparison (M6-driven)** — Depot cache spend over the measured window
   vs the estimated self-hosted bill. Secondary to perf, but it is the most
   likely _real_ reason to switch, so record it either way.

## 8. Deliverables

- `tools/bench-remote-cache/` — harness: runs N interleaved reps per arm, parses
  `runReport.json`, asserts equal M4, emits JSON + a markdown table.
- `.github/workflows/bench-remote-cache.yml` — `workflow_dispatch` only, matrix
  over arms, uploads the JSON as an artifact. Never on push; it is expensive and
  it is not a check.
- `REPORT.md` in this directory — the numbers, the gate decisions, and the
  recommendation.

## 9. Open questions

1. **Runner region + billing.** What region is the Depot runner fleet in, and do
   we have the cache spend figures? Both are prerequisites for Stage B.
2. **Gate 1 threshold.** The 20% / 10% figures above are a starting proposal —
   confirm or replace before any measuring, so the bar is not set after seeing
   the results.
3. **Where would a self-hosted instance live?** An AWS account, Fly.io, existing
   infra? If there is no plausible same-region home, Stage B is not reachable
   and only Phase 0–2 are worth running.
4. **What actually motivates this — cost, latency, or control?** Latency makes
   M1 decide; cost makes M6 and the Stage B bill decide, and would justify Stage
   B even on a latency tie.
