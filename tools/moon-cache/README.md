# moon remote cache (self-hosted)

`bazel-remote` on a DigitalOcean droplet, behind mTLS, replacing Depot's hosted cache.
Measurements and the decision behind it: [`.agents/projects/ci/REPORT.md`](../../.agents/projects/ci/REPORT.md).

Depot spent **1,100 s** hydrating a 324-task `:build`; this server spends **109 s** from the same
machine, over the same 25 ms of RTT. Wall clock per run: **338 s → 30 s**.

## Local development

One command, if you have the 1Password CLI and access to the `CI` vault:

```bash
./tools/moon-cache/install-certs.sh --op
```

Otherwise get `ca.pem`, `client.pem` and `client.key` from an admin and point the script at them:

```bash
./tools/moon-cache/install-certs.sh ~/Downloads/moon-cache-certs
```

Either way they land in `.moon/certs/`, which is gitignored. Nothing else changes; `moon run`
picks the cache up from `.moon/workspace.yml`.

Check it is actually working — moon **never fails** on a broken cache, it just quietly rebuilds:

```bash
moon run :build && node -e 'const r=require("./.moon/cache/runReport.json");console.log(r.actions.flatMap(a=>a.operations??[]).filter(o=>o.meta?.type==="output-hydration"&&o.status==="cached-from-remote").length,"tasks hydrated")'
```

Zero on a warm tree means the cache is unreachable or your certificate is rejected, not that
there was nothing to fetch.

To bypass the remote cache for one command, point it somewhere that does not exist — moon
degrades to the local cache:

```bash
MOON_REMOTE_HOST='grpc://127.0.0.1:1' moon run :build
```

## The server

| | |
| --- | --- |
| hosts | `cache.dxos.network` -> 64.225.13.237 (NYC3) · 143.198.61.162 (SFO3, no DNS record; its certificate shares the same SAN so `mtls.domain` verifies) |
| service | `bazel-remote` v2.5.0, systemd unit `bazel-remote` |
| ports | 9092 gRPC, 9093 HTTPS (metrics + `/status`) |
| storage | `/var/cache/moon`, zstd, 100 GB LRU |
| certificates | `/etc/bazel-remote/{server.pem,server.key,ca.pem}` |

`--tls_ca_file` is what makes it mTLS. Without it the cache would be world-readable and
world-writable, which on a public IP means anyone can poison your build outputs.
`/status` stays unauthenticated so health checks do not need a certificate; every CAS and AC
route returns 401 without one.

```bash
# Health, no certificate needed.
curl -s https://cache.dxos.network:9093/status

# Anything real needs the client certificate.
curl -s --cacert .moon/certs/ca.pem --cert .moon/certs/client.pem --key .moon/certs/client.key \
  https://cache.dxos.network:9093/metrics | grep bazel_remote_incoming

# Service state.
ssh root@cache.dxos.network 'systemctl status bazel-remote; journalctl -u bazel-remote -n 50'
```

Deploying a config change is `scp bazel-remote.service root@…:/etc/systemd/system/` then
`systemctl daemon-reload && systemctl restart bazel-remote`. Restarts are safe — the cache is on
disk and survives.

## Certificates

`gen-certs.sh` issues a private CA, a server certificate and a client certificate, all valid ten
years. There is no revocation path, so **rotation means re-issuing everything and updating both
the droplet and the CI secrets** — treat the CA key accordingly.

```bash
./tools/moon-cache/gen-certs.sh ~/moon-cache-certs 64.225.13.237 cache.dxos.network
```

`ca.key` signs new clients. It must never reach the droplet, the repository, or CI — only the
operator's machine and whatever the team uses for shared secrets.

All six files live in 1Password's `CI` vault as documents named `moon-cache-<filename>`:

```bash
for f in ca.key ca.pem client.pem client.key server.pem server.key; do
  op document create "./certs/$f" --title "moon-cache-$f" --vault CI
done
```

CI reads three of them from repository secrets — `MOON_CACHE_CA_PEM`, `MOON_CACHE_CLIENT_PEM`,
`MOON_CACHE_CLIENT_KEY`. Set them from files rather than pasting, so the trailing newline
survives:

```bash
gh secret set MOON_CACHE_CA_PEM < .moon/certs/ca.pem
gh secret set MOON_CACHE_CLIENT_PEM < .moon/certs/client.pem
gh secret set MOON_CACHE_CLIENT_KEY < .moon/certs/client.key
```

The server certificate carries the droplet IP and `cache.dxos.network` as SANs, so it stays valid
whether clients dial the name or the address.

## CI

`.github/actions/setup` writes the three files into `.moon/certs/` before any moon task runs, and
**fails the job if they are missing** — except on fork PRs, which cannot receive secrets and fall
back to local-cache-only with a warning.

They arrive as environment variables, bound once per workflow, because a composite action cannot
read the `secrets` context:

```yaml
env:
  MOON_CACHE_CA_PEM: ${{ secrets.MOON_CACHE_CA_PEM }}
  MOON_CACHE_CLIENT_PEM: ${{ secrets.MOON_CACHE_CLIENT_PEM }}
  MOON_CACHE_CLIENT_KEY: ${{ secrets.MOON_CACHE_CLIENT_KEY }}
```

Deployment and publish workflows opt out instead — `remote-cache: 'false'` on the setup call, which
points moon at an unroutable host. A released artifact is built from source rather than trusted
from a cache any CI job can write to.

| secret | contents |
| --- | --- |
| `MOON_CACHE_CA_PEM` | `ca.pem` |
| `MOON_CACHE_CLIENT_PEM` | `client.pem` |
| `MOON_CACHE_CLIENT_KEY` | `client.key` |

`.github/actions/assert-remote-cache` checks the run report for a minimum number of
`cached-from-remote` tasks. This exists because every remote-cache failure mode observed so far —
absent credentials, rejected credentials, a dropped blob batch — produces a **green** run that
silently rebuilt everything. It runs `warn-only` in the `check` job today.

## Rolling back

Revert the `remote:` block in `.moon/workspace.yml` and restore the `DEPOT_TOKEN` env entries in
the workflows — both are one commit back in history. **Any change to `.moon/workspace.yml`
re-hashes every task**, so the first run after a switch in either direction is a full cold build
regardless of which cache is at fault.

To turn the cache off entirely without editing config, point it at nothing:

```bash
MOON_REMOTE_HOST='grpc://127.0.0.1:1' moon run :build
```

## Benchmarking a cache change

[`bench/`](./bench/README.md) holds the harness that produced the numbers above — interleaved A/B
reps, an RTT sweep, and the run-report parser. Use it before changing where the cache lives.
