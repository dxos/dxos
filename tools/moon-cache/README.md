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

## Things that will catch you out

1. **The `cache.dxos.network` A record must stay DNS-only in Cloudflare.** The proxy does not pass
   gRPC on 9092, and moon answers an unreachable cache with one warning and a green build — so
   proxying it looks like nothing is wrong.
2. **Any edit to `.moon/workspace.yml` re-hashes every task**, so the next run after a config
   change is a full cold build regardless of which cache is configured.
3. **Disk is bounded by `--max_size 100`** (GiB), enforced as an LRU: `bazel-remote` evicts the
   least recently used blobs rather than filling the disk. Size it under the volume with room for
   the OS — 100 GiB on the current 154 GiB disk.
4. **Release workflows deliberately skip the cache** — `remote-cache: 'false'` on the setup action,
   or a workflow-level `MOON_REMOTE_HOST` where the workflow does not use that action.
5. **`--access_log_level` defaults to `all`.** At CI volume that's one line per request and will
   fill the disk within days — it took 8 days to produce 50 GB and exhaust a 154 GiB disk. The unit
   sets `--access_log_level none`; do not drop it when copying this config elsewhere.
6. **A restart costs about 70 s of downtime.** `bazel-remote` walks every cache file to rebuild its
   in-memory index before it binds 9092/9093, so both ports refuse connections until that finishes
   — moon falls back to a local build for anyone hitting it during that window. Restarts are safe
   for the data (below), just not instantaneous.

## The server

| | |
| --- | --- |
| host | `cache.dxos.network` -> 64.225.13.237 (DigitalOcean NYC3) |
| service | `bazel-remote` v2.5.0, systemd unit `bazel-remote` |
| ports | 9092 gRPC, 9093 HTTPS (metrics + `/status`) |
| storage | `/var/cache/moon`, zstd, 100 GB LRU |
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
