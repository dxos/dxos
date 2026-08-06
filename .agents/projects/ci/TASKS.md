# CI — Tasks

_Resume: branch `claude/depot-vs-self-hosted-cache-3fbd62`, being prepared for a PR. The moon remote cache is migrated to a self-hosted `bazel-remote` on a DO NYC3 droplet (64.225.13.237) behind mTLS — 12.6× faster than Depot on the 324-task `:build` from a dev machine. **Blocked on two things only the user can do: `ca.key` into 1Password, and the three `MOON_CACHE_*` repository secrets — without which every job fails at setup, by design.** Benchmark evidence: [`REPORT.md`](./REPORT.md)._

Context and the failure mode that governs this area: [`DESIGN.md`](./DESIGN.md).

## Phase 1: Adopt the self-hosted cache

Committed on the branch; none of it has run in CI yet.

- [x] **Provision and harden the cache** — `bazel-remote` v2.5.0 on `s-4vcpu-8gb` NYC3,
      systemd, zstd, 100 GB LRU, mTLS via a private CA. Verified 401 without a client
      certificate on both reads and writes; `/status` stays open for health checks.
- [x] **Point moon at it** — `.moon/workspace.yml`; the Depot cache config and every
      `DEPOT_TOKEN` env entry are removed, so rollback is a revert rather than an edit.
- [x] **Materialise certificates in CI** — `.github/actions/setup` writes them from three
      `MOON_CACHE_*` environment variables, bound once per workflow rather than at every call
      site (a composite action cannot read the `secrets` context). It **fails** when they are
      absent, except on fork PRs.
- [x] **Guard against silent degradation** — `.github/actions/assert-remote-cache`,
      warn-only in `check`.
- [x] **Document operations and local setup** — [`tools/moon-cache/`](../../../tools/moon-cache/README.md),
      including `install-certs.sh --op`.
- [ ] **Store `ca.key` in 1Password** — it exists only in a session scratchpad. Everything
      else is recoverable from it; it is recoverable from nothing.
- [ ] **Set `MOON_CACHE_CA_PEM` / `MOON_CACHE_CLIENT_PEM` / `MOON_CACHE_CLIENT_KEY`.**
      Gates the PR: without them every cache-using job fails at setup, by design.
- [ ] **Open the PR and read the CI numbers.** The first measurement of this cache from a
      real runner, and the first test of whether the mTLS path works from inside the job
      container. Expect a full cold build on the first run — a `workspace.yml` change
      re-hashes every task.
- [ ] **DNS `cache.dxos.network` → the droplet**, then switch `workspace.yml` off the literal
      IP. The server certificate already carries both, so no re-issue.
- [ ] **Reserve the droplet IP** — a rebuild currently invalidates the certificate's IP SAN.
- [ ] **Monitoring** on `:9093/metrics` — disk against the 100 GB bound, liveness on `/status`.
      A dead cache is invisible: CI just gets slow.
- [ ] **Read-only certificates for developers.** Any client with a certificate can write and
      `bazel-remote` has no per-client ACL, so a laptop can poison CI's cache today.
- [ ] **Promote `assert-remote-cache` to failing** and add it to the other five moon jobs
      (`test`, `storybook`, `workerd`, `e2e`, `cli`).
- [ ] **Cancel the Depot cache subscription** once this has a track record. Depot remains the
      runner provider (`depot-ubuntu-24.04-8`); only the cache moved.

## Phase 2: Evaluate Blacksmith

Not started — the benchmark workflow was written and then removed rather than merged, because it
cannot run until the app has repository access and an unrunnable workflow on `main` is worse than
none. Recreate it when the prerequisite lands.

**Sticky disks are not a drop-in replacement for a shared CAS.** Blacksmith exposes no remote-cache
endpoint; it snapshots a disk, clones it per job, and commits at job end. Every job works on its
own clone, so concurrent jobs never see each other's writes, and with branch protection enabled
only `push`/`schedule`/`workflow_dispatch` on the default branch may commit at all.

- [ ] **Get the Blacksmith app access to `dxos/dxos`.** The one prerequisite: a first run sat
      queued 12 minutes and never got a runner. `blacksmith-8vcpu-ubuntu-2404` is a valid label,
      so this is repository access, not configuration.
- [ ] **Recreate the benchmark workflow** — dispatch-only, one job, `useblacksmith/stickydisk@v1`
      mounting `.moon/cache`, `remote-cache: 'false'` on setup so the sticky disk is the only
      thing under test, then `moon run :build` and a local/remote/executed breakdown from the run
      report. Key it per job (`…-moon-cache-${{ github.job }}`): on a shared key only the last job
      to finish keeps its artifacts.
  - Note `workflow_dispatch` only fires for workflows already on the default branch, so testing it
    from a branch needs a temporary branch-scoped `push` trigger.
- [ ] **Run it twice** — once to populate and commit a snapshot, once to measure hydration off it.
- [ ] **Answer three questions before considering a migration**
  - Does the sticky disk mount reach inside the job container? Jobs run in
    `ghcr.io/dxos/gh-actions`, and the mount happens on the runner.
  - How does hydration compare to 109 s (self-hosted, mTLS) and 1,100 s (Depot)?
  - What is left once hydration is local — `hash-generation` was ~31 s and no cache touches it.
- [ ] **Decide on PR-run semantics.** With branch protection on, PR jobs read the snapshot but
      cannot commit, so iterating on a PR rebuilds the same packages every run — a regression
      against a shared cache. Turning it off reintroduces the poisoning risk the pnpm
      `cache-scope` already guards against.
- [ ] **Weigh it against the migration cost.** This is a runner migration, not a cache swap:
      `runs-on` changes in seven job definitions, and it means leaving Depot's runners too.
- [ ] **Cost** — $0.50/GB/month, 7-day idle eviction, ~6 per-job keys each holding the `:build`
      outputs.

## Phase 3: Backlog

- [ ] **Fix the three cacheless workflows properly.** `preview.yml`,
      `upload-introspect-cache.yml` and `publish-all.yml` run moon tasks with no cache
      credential. Incidentally fixed by the mTLS change, but the class of bug deserves a check
      that a moon-running job always has a cache credential.
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
