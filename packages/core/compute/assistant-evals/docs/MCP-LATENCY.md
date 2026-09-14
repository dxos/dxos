# MCP eval against deployed workers — observations and fixes

Running log of what the MCP eval (`src/evals/mcp-server.eval.ts`) has established about the deployed
MCP surface, what has been fixed, and what is still open. Newest section last.

Sources: `assistant-evals` runs, Signoz traces (`dxos.eu.signoz.cloud`), and live probes against
`mcp.dev.dxos.network` / `mcp.preview.dxos.network`.

---

## 2026-09-14 — first deployed runs

### Corrections to earlier claims in this branch

Two things reported earlier were wrong. Both were stated with more confidence than the evidence
carried, and are recorded here because the wrong version reached a PR body and a code comment.

1. **"The sandbox egress proxy blocks WebSockets, so the eval cannot replicate to EDGE."** False.
   The first probe crashed on module resolution (`ws` was not resolvable from the script's
   directory) and the crash was read as a connection failure. Re-run from a directory where `ws`
   resolves, `wss://dev.dxos.network/ws/<identity>/<peer>` answers **HTTP 401** — the TLS connection
   reaches the server and the server declines the credentials. The transport works.
2. **"~2.5s per deployed tool call is a fixed transport cost, not the worker's."** Not established,
   and contradicted by Signoz: production `McpServer.…/tools/call` spans are **p50 3.3s / p95 6.1s
   server-side**. The server is the dominant cost, not the network.

The real prerequisite is authorization, not transport: `edgeAuth` admits a chained HALO identity on
the WebSocket upgrade route only when an account is bound to it, waiving that only for the ephemeral
(self-issued, chainless) presentations used during halo invitation bootstrap. A freshly created eval
identity is chained, so it is refused with `identity_not_associated_with_account`.

### 1. Is MCP operation invoke succeeding?

**Partly — production is at a 50% error rate.** `operation.invoke` spans, production, 24h:

| has_error | count |
| --------- | ----- |
| true      | 13    |
| false     | 13    |

The failures carry:

```
Error: Service not found: @dxos/echo/Hypergraph/Service
  at OperationServiceEntrypoint.invokeOperation   (operation-service, 1781ms, has_error=true)
  at operation.invoke                             (mcp-space-service, 1911ms, has_error=true)
```

Note the failure is **slow**: ~1.8s spent before erroring, and the enclosing MCP request still
returns HTTP 200 — the error is reported inside the JSON-RPC result, so nothing upstream sees a
failed request. Trace: `0b979f4b50d74bda8d574babd11ad30f`.

Invocations that do succeed genuinely work: `space.queryObjects` (listing and `includeContent`)
returned correct data from a real space on production during this session.

### 2. Can the full claude-code eval pass?

**Not yet against a deployed worker**, for one reason: the eval's identity has no account on the
target EDGE, so its space never replicates and every `invokeOperation` in the run errors. Everything
before that point works — the grant is minted headlessly, `initialize` returns 200, and Claude Code
dispatches real tool calls at the deployed worker.

`local` passes 7/7 scorers.

### 3. Operation timings

**Local, in-process host** (`DX_EVAL_MCP_TARGET=local`, client-observed, 5 iterations):

| Row                                           | p50 | p95 |
| --------------------------------------------- | --- | --- |
| `queryOperations`                             | 63  | 64  |
| `loadSkill`                                   | 5   | 6   |
| `invokeOperation:space.queryObjects`          | 49  | 54  |
| `invokeOperation:space.queryObjects(content)` | 53  | 57  |
| `invokeOperation:tasks.listSessions`          | 47  | 71  |
| `invokeOperation:projects.get`                | 47  | 51  |
| `invokeOperation:tasks.list`                  | 41  | 48  |
| `*`                                           | 48  | 64  |

**Production, server-side** (Signoz, 24h, `service.name = mcp-space-service`):

| Span                                | p50  | p95  |
| ----------------------------------- | ---- | ---- |
| `fetchHandler POST` (whole request) | 2773 | 7383 |
| `operation.invoke`                  | 3454 | 6161 |
| `McpServer.…/tools/call`            | 3316 | 6147 |
| `space.query`                       | 2024 | 2620 |
| `space.members`                     | 1879 | 2061 |
| `space.tags`                        | 1868 | 2071 |
| `fetch POST eu.i.posthog.com`       | 332  | 639  |
| `KV OAUTH_KV put`                   | 243  | 529  |
| `operation.traceFlush`              | 150  | 2316 |
| `KV OAUTH_KV get`                   | 3    | 221  |
| `fetchHandler GET` (`/status`)      | 11   | 19   |

So a deployed operation invocation costs **~3.5s at p50** server-side against ~50ms for the same
operation in-process. `/status` at 11ms is the floor for the worker itself, which bounds how much of
this is Cloudflare overhead: almost none of it.

Client-observed figures measured from the Claude Code sandbox (~2.5s/call) are **not** a useful
upper bound on the network — they are smaller than the server-side p50, so the sandbox's proxy is a
minor term next to the worker.

### 4. Where the time goes, and what to do about it

Ranked by evidence, not guess:

1. **`space.query` + `space.tags` + `space.members` ≈ 5.8s of p50 span time.** These are `whoami`'s
   per-space reads (`mcp/space-tools.ts`), each a separate `DataServiceBinding` round trip, and they
   are per _space_ — a user with N spaces pays N times unless they are issued concurrently. Check
   whether the listing awaits them in sequence; batching or `Effect.all(..., { concurrency })` is the
   single biggest available win.
2. **`operation.traceFlush` p95 2316ms** (`mcp/util.ts:102`). A p50 of 150ms against a p95 of 2.3s is
   the signature of a flush occasionally landing in the request path. If it can move to `waitUntil`,
   the tail improves without touching the median.
3. **The 50% failure path costs ~1.8s before it fails.** Fixing `Service not found:
@dxos/echo/Hypergraph/Service` removes both the error _and_ its latency.
4. **`KV OAUTH_KV get` p95 221ms** — the bearer is validated against KV on every call. An isolate-local
   cache keyed by token hash (bounded, short TTL) would remove it from the warm path.
5. **PostHog `fetch` p50 332ms / p95 639ms** — confirm it is on `waitUntil` and not awaited.

Not yet attempted; none of these is verified by measurement, and (1) needs a reading of the listing's
concurrency before it is worth changing.

### Obstacles to iterating on dev

- **Dev spans record `duration_nano: 0`** for every `McpServer.*` span, where production records real
  durations. Dev is therefore unobservable for timing — the exact thing needed to iterate there.
  Dev currently runs a hand-deployed build from this branch rather than a CI build, which is the
  first thing to rule out.
- **Dev is hand-deployed only.** No workflow targets it (`deploy-main.yml` → preview,
  `deploy-edge-prod.yml` → production), so dev's deployed state is whatever a person last pushed.
- **`deploy:dev` is wrong.** `packages/services/mcp-space-service/package.json` runs
  `wrangler deploy --env=` — an empty `--env`, which deploys the _top-level_ (local) config onto the
  dev worker, since both share the worker name. It briefly pointed dev's `DX_AUTH_BASE_URL` at
  `http://localhost:8790` on 2026-09-14 08:24 until a correct `--env dev` deploy at 08:25. Fix is
  `--env dev`.
