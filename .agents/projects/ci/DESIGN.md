# CI — design notes

The build/test pipeline itself: runners, caching, and the workflows in `.github/workflows`.
Measurements live in [`REPORT.md`](./REPORT.md), open work in [`TASKS.md`](./TASKS.md), and the
cache's operational runbook in [`tools/moon-cache/`](../../../tools/moon-cache/README.md).

## Shape of the pipeline

One workflow, **Check** (`.github/workflows/check.yml`) — build, test, lint, fmt. Seven job types
on `depot-ubuntu-24.04-8`, all inside `ghcr.io/dxos/gh-actions`, with e2e sharded further. Roughly
300 tasks in the composer-app dependency closure, so ~10 concurrent cache clients per run.

Everything routes through `moon`, and `.moon/workspace.yml` decides where the remote cache lives.

## The failure mode that governs every decision here

**moon treats every remote-cache failure as non-fatal.** A missing credential, a rejected
credential, an unresolvable host and a dropped blob batch all produce the same outcome: a warning,
a green run, and a full rebuild. Four separate instances of this have now been observed
(see REPORT.md, “Silent-degradation modes”).

Two consequences that any change in this area has to respect:

1. **Nothing here can be verified by "CI is green."** Correctness and cache health are independent
   signals, and only one of them turns the build red.
2. **Every cache change needs an explicit assertion** on hits, or a regression is invisible.
   `.github/actions/assert-remote-cache` exists for this.

A live example: `preview.yml`, `upload-introspect-cache.yml` and `publish-all.yml` call the setup
action and run moon tasks but never set `DEPOT_TOKEN`, so they have had **no remote cache at all**
for an unknown length of time, with no signal.

## Cache: where it stands

Depot's hosted cache hydrates a 324-task `:build` in ~1,100 s; a self-hosted `bazel-remote` does it
in ~86 s from the same machine at the same RTT. The cost is not bandwidth and not network latency —
it is invariant to where the client sits, which is why it does not improve on a Depot runner
either. Full analysis in [`REPORT.md`](./REPORT.md).

Current direction: self-hosted `bazel-remote` on a DigitalOcean droplet behind mTLS, with
Blacksmith sticky disks as an alternative under evaluation. The two are not equivalent —
sticky disks are snapshot/clone/commit with no live sharing between concurrent jobs, so they
change cache semantics rather than just relocating the cache.

## Open questions

1. **Runner→cache numbers.** Every measurement so far is from a dev machine. The CI-side figure
   needs a PR that actually runs Check against the self-hosted cache.
2. **Concurrency.** One client pulling 449 MB is measured; ten concurrent jobs are not, and that
   is where a shared-egress droplet could bind on bandwidth.
3. **Trust boundary for cache writes.** Any client with a certificate can write, and
   `bazel-remote` has no per-client ACL — so a developer's machine can currently poison CI's
   cache. The pnpm store already has a `cache-scope` isolation story for exactly this; the remote
   cache does not.
