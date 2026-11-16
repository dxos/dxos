# @dxos/echo-sync-worker

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dxos/dxos/tree/main/packages/core/echo/echo-sync-worker)

The sync server for [`@dxos/echo-sqlite-demo`](../../../apps/echo-sqlite-demo): a Cloudflare Worker
with one Durable Object per graph. The button above copies this directory into a new repository on
your account and deploys it; the Durable Object is provisioned from `wrangler.jsonc`.

This directory has no dependencies outside itself — no `@dxos/*` imports, no `workspace:` or
`catalog:` versions — because the button clones it alone and installs it with npm. Keep it that way.

## Protocol

Two counters, no clocks:

- The **server** keeps one `seq` per graph and stamps every accepted write with the next one. That
  is the total order; a client's wall clock never enters it.
- Each **client** keeps its own `clientSeq`, one per push, so a retried push is applied once and its
  answer can be matched to it.

A round is **pull → merge → push**:

1. `pull { since }` — the server answers with every record above `since`.
2. The client merges them into its local edits (three-way, field by field, against the version
   each edit was made on).
3. `push { client, clientSeq, since, records }` — each record names the `seq` it was edited on
   (`base`). The server applies the push only if every `base` is still current, all or nothing.
   Either way it answers with everything above `since`: the pushed records with their new seqs, or
   what the client missed — which it merges, and pushes again.

Other sockets get every accepted write as it lands. The same push works as a POST, for a script:

```bash
curl -X POST https://<worker>/api/space/my-graph/sync \
  -H 'content-type: application/json' \
  -d '{"since":0,"records":[]}'
```

A record sent without `base` is written unconditionally.

## Run it

```bash
npm install
npm run dev     # wrangler dev, on :8787
npm run deploy  # wrangler deploy
```

Point the demo at a deployed server with `VITE_SYNC_URL=https://<worker>` when building it; without
it the demo talks to its own origin.

Graphs are deleted 24 hours after creation.
