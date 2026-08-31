# moon remote cache (self-hosted)

`bazel-remote` on a DigitalOcean droplet, behind mTLS, replacing Depot's hosted cache.
Measurements and the decision behind it: [`.agents/projects/ci/REPORT.md`](../../.agents/projects/ci/REPORT.md).

Depot spent **1,100 s** hydrating a 324-task `:build`; this server spends **109 s** from the same
machine, over the same 25 ms of RTT. Wall clock per run: **338 s → 30 s**.

## Local development

Once per machine, not per checkout:

```bash
./tools/moon-cache/install-certs.sh --op
```

Then add the line it prints to your shell profile:

```bash
[ -f ~/.config/dxos/moon-cache/env.sh ] && source ~/.config/dxos/moon-cache/env.sh
```

Certificates live in `~/.config/dxos/moon-cache` and are found through `MOON_REMOTE_MTLS_*`, which
take absolute paths — so every worktree on the machine uses the cache, including ones created
later. Storing them in the repo would mean repeating this in each of them.

Without the 1Password CLI, get `ca.pem`, `client.pem` and `client.key` from an admin and pass the
directory instead of `--op`.

Check it is actually working — moon **never fails** on a broken cache, it just quietly rebuilds:

```bash
moon run :build && node -e 'const r=require("./.moon/cache/runReport.json");console.log(r.actions.flatMap(a=>a.operations??[]).filter(o=>o.meta?.type==="output-hydration"&&o.status==="cached-from-remote").length,"tasks hydrated")'
```

Zero on a warm tree means the cache is unreachable or your certificate is rejected, not that
there was nothing to fetch.

To bypass the remote cache for one command, blank the host — moon then uses the local cache only:

```bash
MOON_REMOTE_HOST= moon run :build
```

## The local cache

The remote cache is the second place moon looks. The first is a content-addressable store on your
own disk, and `.moon/workspace.yml` turns on two settings that govern it:

```yaml
experiments:
  casOutputsCache: true

cache:
  unstable_sharedWorktreeCache: true
```

`casOutputsCache` moves task outputs out of `.moon/cache/outputs`, which held one tar archive per
task hash, and into `blobs/` and `manifests/` beside it. `unstable_sharedWorktreeCache` then points
every git worktree of this repo at one such store, held in the base checkout's `.moon/cache`. The
base checkout is the one whose `.git` directory `git rev-parse --git-common-dir` names, which is
how to find it from inside a worktree. Only blobs and manifests are shared. Hashes, locks and
states stay per-worktree because they embed absolute paths, so a worktree still decides for itself
what is stale.

The payoff is that a worktree created this morning builds from artifacts another worktree produced
last week, without touching the network. A cold worktree on its own branch hydrated a 14-task build
chain in 0.2 s of task time against 25 s to rebuild it, with the remote cache switched off.

Two things follow from where the store lives. A plain clone is its own base checkout, so on a CI
runner the setting resolves to the same directory it would have used anyway and changes nothing.
And the store grows inside the base checkout rather than under `~`, so it needs a bound of its own.
`cache.cas.maxSize` is set to 10 GB, evicted least-recently-used. A full 332-task `:build` occupies
463 MB of it, so that is roughly twenty distinct build states before anything is dropped. Left
unset the store is unbounded, which on a laptop is a slow leak rather than an error.

Mind the spelling of that value. moon accepts `maxSize: 'not-a-size'` without a word, at any log
level, and runs unbounded. A typo here reads exactly like a working bound. `MOON_LOG=debug` is how
you check the whole arrangement is live; it names the shared directory before anything else happens:

```text
DEBUG moon_app::session  In a VCS worktree, using a shared cache directory for blobs and manifests  dir=Some("/Users/you/Code/dxos/.moon/cache")
DEBUG moon_cas::cas      Creating CAS store  root="/Users/you/Code/dxos/.moon/cache/blobs"
```

`unstable_sharedWorktreeCache` is unstable in the sense moon means it: the name carries the prefix
and may be renamed. moon rejects unknown keys outright, so if a future release drops the prefixed
spelling this file stops parsing until the key is updated. To opt out of either setting for one
command, without editing config:

```bash
MOON_CACHE_SHARED_WORKTREE_CACHE=false MOON_EXPERIMENT_CAS_OUTPUTS_CACHE=false moon run :build
```

## Things that will catch you out

1. **The `cache.dxos.network` A record must stay DNS-only in Cloudflare.** The proxy does not pass
   gRPC on 9092, and moon answers an unreachable cache with one warning and a green build — so
   proxying it looks like nothing is wrong.
2. **Any edit to `.moon/workspace.yml` re-hashes every task**, so the next run after a config
   change is a full cold build regardless of which cache is configured. So does a moon version
   bump, on its own: the same task hashed `ad0ce946` under 2.4.5 and `78dc6382` under 2.5.2 with
   identical inputs. Bundle a config change into the same commit as a version bump and the two
   share one invalidation instead of costing two.
3. **`--max_size` is bounded by RAM, not by disk.** It is 50 (GiB), enforced as an LRU:
   `bazel-remote` evicts the least recently used blobs rather than filling the volume. The
   temptation is to size it against the 320 GiB disk, and that is how it was first set, at 200.
   The real constraint is that `bazel-remote` holds one index entry per cache file, measured here
   at ~1.2 KB against a mean compressed blob of ~14.3 KB. Budget **a quarter of RAM** for the
   index, not half: the heap has to leave room for the GC target above it and the page cache
   beside it, and the 16 GB droplet was already thrashing at a 11.7 GB heap. A quarter of 16 GB
   is 4 GB, which buys 4 GB / 1.2 KB = ~3.3M files, which at 14.3 KB each is ~44 GiB. 50 GiB is
   that rounded up, and it measured out at 3.78M files and a 4.59 GB heap. See item 7 for what
   happens when the cap is set from the disk instead.
4. **Release workflows deliberately skip the cache** — `remote-cache: 'false'` on the setup action,
   or a workflow-level `MOON_REMOTE_HOST` where the workflow does not use that action.
5. **`--access_log_level` defaults to `all`.** At CI volume that's one line per request: 8 days
   produced 50 GB of logs, which was enough to consume the headroom left by the 100 GiB cache
   budget and exhaust the disk. The unit sets `--access_log_level none`; do not drop it when
   copying this config elsewhere. `rsyslog-logrotate.conf` (below) is the backstop for the next
   service that logs at this volume without a bound of its own.
6. **A restart costs minutes of downtime, not seconds.** `bazel-remote` walks every cache file to
   rebuild its in-memory index before it binds 9092/9093, so both ports refuse connections until
   that finishes — moon falls back to a local build for anyone hitting it during that window.
   Restarts are safe for the data (below), just not instantaneous. The scan/sort/index sequence is
   visible in `journalctl -u bazel-remote` and scales with file count: 70 s at low counts, several
   minutes at 7.2M. Lowering `--max_size` adds an eviction pass on top, which is far more expensive
   than the scan. Cutting 200 GiB to 50 on 2026-08-25 took **15 min 46 s** end to end at 10.5M
   files: 2 min to scan, 26 s to sort, then 13 min to delete 6.7M files and 81 GB.
7. **An oversized `--max_size` degrades the cache slowly, and the symptom looks like disk.** With
   the cap at 200 GiB the cache never reached it, so `bazel_remote_disk_cache_evicted_bytes_total`
   sat at 0 from the day the server was built and the file count only ever grew. By 2026-08-25 it
   was 10.5M files, an 11.7 GB heap and a `go_memstats_next_gc_bytes` target of 14.06 GB on a
   16 GB box: every GC cycle dragged the index back through swap. `BatchReadBlobs` averaged
   **18.3 s**, a CI shard spent 70 min of cumulative hydration inside a 28 min budget and was
   cancelled without running a test, and the merge queue jammed. Lowering the cap to 50 GiB and
   restarting took the heap to 4.59 GB, `BatchReadBlobs` to normal and the same CI shard's
   per-task p50 from 6,016 ms to 29 ms.

   What makes this one nasty is that it reads as a disk problem. `sar -u` shows 20-24% iowait and
   `vmstat` shows the disk busy, but the I/O is swap traffic, not cache I/O, and adding disk would
   not have touched it. Two counters separate the cases in one look: `evicted_bytes_total` at 0
   means the cap is not the constraint, and `next_gc_bytes` above physical RAM means the index is.
   Watch `pswpin/s` in `sar -W` for the early warning — it ran 247/s on 2026-08-17 and 6,260/s on
   2026-08-24, a slide visible eight days before anything went red.

   The related failure it was originally blamed for is real but separate: a saturated host also
   queues the CI setup action's `/status` preflight past its 20 s budget, which reddened three
   otherwise-unrelated jobs between 2026-08-09 and 2026-08-19 with a false "unreachable or
   certificate does not verify" error while the host was up the whole time. That one is already
   handled: `.github/actions/setup/action.yml` retries the probe (`--retry 3 --retry-all-errors`)
   and its `degrade()` then warns, blanks `MOON_REMOTE_HOST` and exits 0 rather than failing the
   job, so an unreachable cache costs a slower build instead of a red one.

## The server

| | |
| --- | --- |
| host | `cache.dxos.network` -> 64.225.13.237 (DigitalOcean NYC3) |
| service | `bazel-remote` v2.5.0, systemd unit `bazel-remote` |
| ports | 9092 gRPC, 9093 HTTPS (metrics + `/status`) |
| storage | `/var/cache/moon`, zstd, 50 GiB LRU (~3.8M files, see item 3) |
| certificates | `/etc/bazel-remote/{server.pem,server.key,ca.pem}` |

`--tls_ca_file` is what makes it mTLS. Without it the cache would be world-readable and
world-writable, which on a public IP means anyone can poison your build outputs.
`/status` stays unauthenticated so health checks do not need a certificate; every CAS and AC
route returns 401 without one.

```bash
# Health. No client certificate needed, but the CA is private, so it must still be trusted.
curl -s --cacert ~/.config/dxos/moon-cache/ca.pem https://cache.dxos.network:9093/status

# Anything real needs the client certificate.
curl -s --cacert ~/.config/dxos/moon-cache/ca.pem \
  --cert ~/.config/dxos/moon-cache/client.pem --key ~/.config/dxos/moon-cache/client.key \
  https://cache.dxos.network:9093/metrics | grep bazel_remote_incoming

# Service state.
ssh root@cache.dxos.network 'systemctl status bazel-remote; journalctl -u bazel-remote -n 50'
```

Deploying a config change is `scp bazel-remote.service root@…:/etc/systemd/system/` then
`systemctl daemon-reload && systemctl restart bazel-remote`. Restarts are safe for the cache
data — it's on disk and survives — but not instantaneous: see item 6 above for the ~70 s of
downtime while the index rebuilds.

`rsyslog-logrotate.conf` bounds the six paths rsyslog writes on this box (`syslog`, `mail.log`,
`kern.log`, `auth.log`, `user.log`, `cron.log`) — daily rotation, 500 MB max size, 3 generations
kept — so a future chatty service fills at most a few GB before rotation catches it, rather than
the whole disk. Deploy with `scp rsyslog-logrotate.conf root@…:/etc/logrotate.d/rsyslog`; nothing
to reload — `logrotate` reads the file fresh from its daily systemd timer, no service restart
involved. Run `logrotate -d /etc/logrotate.d/rsyslog` after deploying — it names every file it
plans to rotate, so a path missing from the config (and therefore left unbounded) shows up
immediately.

This file is a dpkg conffile owned by the `rsyslog` package, so `apt upgrade`'d rsyslog will
prompt about the local modification; `apt.systemd.daily` runs unattended-upgrades here, which
keeps the local version by default, so this is a footnote, not a risk.

## Certificates

`gen-certs.sh` issues a private CA, a server certificate and a client certificate, all valid ten
years. There is no revocation path, so **rotation means re-issuing everything and updating both
the droplet and the CI secrets** — treat the CA key accordingly.

```bash
./tools/moon-cache/gen-certs.sh ~/moon-cache-certs 64.225.13.237 cache.dxos.network
```

`ca.key` signs new clients. It must never reach the droplet, the repository, or CI — only the
operator's machine and whatever the team uses for shared secrets.

All six files live in one 1Password item — `moon-cache-certs` in the `CI` vault, one concealed
field per file. `install-certs.sh --op` reads the three client files from it; `ca.key` is stored
there but never fetched by that path.

CI reads three of them from repository secrets — `MOON_CACHE_CA_PEM`, `MOON_CACHE_CLIENT_PEM`,
`MOON_CACHE_CLIENT_KEY`. Set them from files rather than pasting, so the trailing newline
survives:

```bash
gh secret set MOON_CACHE_CA_PEM < ~/.config/dxos/moon-cache/ca.pem
gh secret set MOON_CACHE_CLIENT_PEM < ~/.config/dxos/moon-cache/client.pem
gh secret set MOON_CACHE_CLIENT_KEY < ~/.config/dxos/moon-cache/client.key
```

The server certificate carries the droplet IP and `cache.dxos.network` as SANs, so it stays valid
whether clients dial the name or the address.

## CI

`.github/actions/setup` writes the three files into `.moon/certs/` before any moon task runs —
the in-repo layout that `.moon/workspace.yml` points at, which suits a runner because it has
exactly one checkout — and **fails the job if they are missing**, except on fork PRs, which
cannot receive secrets and fall back to local-cache-only with a warning.

They arrive as environment variables, bound once per workflow, because a composite action cannot
read the `secrets` context:

```yaml
env:
  MOON_CACHE_CA_PEM: ${{ secrets.MOON_CACHE_CA_PEM }}
  MOON_CACHE_CLIENT_PEM: ${{ secrets.MOON_CACHE_CLIENT_PEM }}
  MOON_CACHE_CLIENT_KEY: ${{ secrets.MOON_CACHE_CLIENT_KEY }}
```

Deployment and publish workflows opt out instead — `remote-cache: 'false'` on the setup call, which
blanks `MOON_REMOTE_HOST`. A released artifact is built from source rather than trusted from a
cache any CI job can write to.

| secret | contents |
| --- | --- |
| `MOON_CACHE_CA_PEM` | `ca.pem` |
| `MOON_CACHE_CLIENT_PEM` | `client.pem` |
| `MOON_CACHE_CLIENT_KEY` | `client.key` |

After writing the certificates the action probes the cache — `/status` for reachability and the
server certificate, then a CAS path with the client certificate, where 404 means authorised and
401 means rejected — and fails the job if either check does not pass. Every remote-cache failure
mode observed so far (absent credentials, rejected credentials, an unresolvable host, a dropped
blob batch) produces a **green** run that silently rebuilt everything, so a passing build is not
evidence the cache worked.

## Rolling back

Revert the `remote:` block in `.moon/workspace.yml` and restore the `DEPOT_TOKEN` env entries in
the workflows — both are one commit back in history. **Any change to `.moon/workspace.yml`
re-hashes every task**, so the first run after a switch in either direction is a full cold build
regardless of which cache is at fault.

To turn the cache off entirely without editing config, blank the host:

```bash
MOON_REMOTE_HOST= moon run :build
```

## Benchmarking a cache change

[`bench/`](./bench/README.md) holds the harness that produced the numbers above: `bench.sh` runs
interleaved reps against a cache, `analyze.mjs` reads the reports. Use it before changing where
the cache lives.
