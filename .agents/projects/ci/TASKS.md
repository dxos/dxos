# CI — Tasks

_Resume: branch `claude/depot-vs-self-hosted-cache-3fbd62`, PR #12494 OPEN as a draft — watch Check, then mark ready. The moon remote cache is a self-hosted `bazel-remote` at `cache.dxos.network` (DO NYC3) behind mTLS, and it is now **measured in CI**: a fully-cached 324-task `:build` takes **14 s against 161 s uncached** on a Depot runner, hydrating 324/324 in 13.6 s at 31 ms per task over a 7 ms link. Runners were compared and Depot stays: compute is identical and it sits closest to the cache. Evidence in [`REPORT.md`](./REPORT.md), runbook in [`tools/moon-cache/`](../../../tools/moon-cache/README.md)._

Context and the failure mode that governs this area: [`DESIGN.md`](./DESIGN.md).

## Phase 1: Adopt the self-hosted cache

Committed, verified from a dev machine, and now measured on a Depot runner via PR #12494 — see
REPORT.md, "In CI". What remains is operational hardening, not the rollout itself.

- [x] **Provision and harden the cache** — `bazel-remote` v2.5.0 on `s-4vcpu-8gb` NYC3,
      systemd, zstd, 100 GB LRU, mTLS via a private CA. Verified 401 without a client
      certificate on both reads and writes; `/status` stays open for health checks.
- [x] **Point moon at it** — `.moon/workspace.yml`; the Depot cache config and every
      `DEPOT_TOKEN` env entry are removed, so rollback is a revert rather than an edit.
- [x] **Materialise certificates in CI** — `.github/actions/setup` writes them from three
      `MOON_CACHE_*` environment variables, bound once per workflow rather than at every call
      site (a composite action cannot read the `secrets` context). It **fails** when they are
      absent, except on fork PRs.
- [x] **Guard against silent degradation** — the setup action probes the cache for reachability
      and client-certificate acceptance before any task runs, and fails the job if either is
      wrong. Connectivity rather than a hit count: a legitimately cold branch has zero hits, so a
      hit count cannot tell "nothing to restore" from "cache is broken".
- [x] **Document operations and local setup** — [`tools/moon-cache/`](../../../tools/moon-cache/README.md),
      including `install-certs.sh --op`.
- [x] **Store the certificates** — one `moon-cache-certs` item in the 1Password `CI` vault, each
      file its own concealed field; `install-certs.sh --op` reads the three client files from it.
      `ca.key` is in the item but never fetched by that path.
- [x] **Install once per machine, not per worktree** — certificates live in
      `~/.config/moon-cache` and are found via `MOON_REMOTE_MTLS_*`, which take absolute
      paths. The in-repo `.moon/certs` layout would have needed repeating in every checkout, and a
      machine here has twenty-three. CI keeps the in-repo layout via `--worktree`, since a runner
      has one.
- [x] **Set the three `MOON_CACHE_*` repository secrets** on `dxos/dxos`.
- [x] **Measure the cache in CI** — 14 s cached against 161 s uncached on a Depot runner,
      324/324 hits, mTLS working from inside the job container. REPORT.md, "In CI".
- [x] **Open the PR** — https://github.com/dxos/dxos/pull/12494 (draft).
- [x] **DNS `cache.dxos.network` → the droplet** — A record, DNS-only (the Cloudflare proxy does
      not pass gRPC on 9092). `.moon/workspace.yml` now uses the name; verified 12/12 hits over it.
- [ ] **Reserve the droplet IP.** Now that clients dial the name, a rebuild costs a DNS edit
      rather than a config change — but it still invalidates the certificate's IP SAN, and a
      reserved IP removes both.
- [ ] **Monitoring** on `:9093/metrics` — disk against the 100 GB bound, liveness on `/status`.
      A dead cache is invisible: CI just gets slow.
- [ ] **Read-only certificates for developers.** Any client with a certificate can write and
      `bazel-remote` has no per-client ACL, so a laptop can poison CI's cache today.
- [ ] **Cancel the Depot cache subscription** once this has a track record. Depot remains the
      runner provider (`depot-ubuntu-24.04-8`); only the cache moved.

## Phase 2: Backlog

- [x] **Check that every moon-running job has a cache credential** —
      `scripts/check-cache-wiring.mjs`, run in `check`. `model-fixture.yml` landed from main after
      the call sites were wired and had neither binding nor opt-out, which the setup action caught
      in CI; this catches it before pushing.
- [x] **Reword the cache warning** in `AGENTS.md`, `REPOSITORY_GUIDE.md` and the
      composer-plugin-dev skill — it is harmless, but it means no shared cache, and the docs said
      to filter it rather than fix it.
- [ ] **Audit restore-vs-rebuild cost per task.** 8 of 12 measured tasks were slower to restore
      than to rebuild, `composer-app:prebuild` by 35× — ~146 s per job. That is a property of the
      task, not the cache, so a faster cache does not fix it: `options.cache: false` on
      high-output-bytes/low-compute tasks does. Numbers in [`REPORT.md`](./REPORT.md).
- [ ] **Measure `remote.cache.compression: 'zstd'`** — currently unset, so no client-side
      compression. Its own arm, not folded into a hosting change.
- [ ] **13 MB of video in `docs/public/`** — two checked-in mp4s that Astro copies into
      `docs:bundle`'s output. Worth removing on its own merits.
