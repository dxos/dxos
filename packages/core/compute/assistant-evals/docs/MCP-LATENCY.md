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

---

## 2026-09-14 — fixes

### Correction to hypothesis (1) above

**The per-space reads are already concurrent.** `mcp-space-service/src/mcp/space-tools.ts` issues
them as `Effect.all({ spaceTags, properties, memberCount }, { concurrency: 'unbounded' })`, inside an
`Effect.forEach(…, { concurrency: DESCRIBE_CONCURRENCY })` over the spaces. So the ~5.8s of summed
p50 span time across `space.query` / `space.tags` / `space.members` is _overlapped_, not additive,
and "batch them" was never the available win. The hypothesis was written from the Signoz totals
without reading the code; recorded here because it reached this file as a ranked recommendation.

### Fix 1 — `operation.invoke`: 50% of deployed calls were failing

**`Service not found: @dxos/echo/Hypergraph/Service`** (production, 13 of 26 `operation.invoke`
spans in 24h, ~1.8s spent before erroring, HTTP 200 returned).

Root cause: `FunctionContext.createLayer()`
(`packages/core/compute/compute-runtime/src/protocol.ts`) provided `Database.Service`,
credentials, AI, trace, registry and toolkits — but **not** `Hypergraph.Service`. Operations
declaring the cross-space handle rather than the space-scoped database
(`plugin-tasks`'s `RecordSession` / `report-session`, which a harness hook fires with a fixed
payload carrying no space id) therefore died at their first service access.

Fix: the layer now provides `Hypergraph.layer(client.graph)` when the context has ECHO services, and
`Hypergraph.notAvailable` otherwise. Covered by a regression test in `protocol.test.ts`
("provides Hypergraph.Service to a handler that declares it").

Caveat, not fixed here: with no `spaceId` in the context no database is constructed, so the graph is
present but empty — a hook-fired call that omits `spaceId` can resolve the service and still find no
space. That is space discovery on the worker, a separate change.

### Fix 2 — the trace drain off the invocation's critical path

`operation.traceFlush` measured **p50 150ms / p95 2316ms**, all of it inside `Effect.ensuring` on
`invokeOperation` (`mcp-space-service/src/mcp/util.ts`): the drain sleeps `TRACE_FLUSH_ATTEMPTS = 3`
× `TRACE_FLUSH_INTERVAL = 20ms` before it can even finish, so **≥60ms is pure wait every call**, and
the tail is the flush occasionally landing in the request path.

Fix: the drain is forked and handed to the request's `waitUntil`, which keeps the Workers I/O
context alive so the trailing `OperationEnd` still lands while the caller stops paying for it. The
`waitUntil` is read from async-local storage (`mcp/deferral.ts`) rather than captured at handler
build, because the MCP handler is **cached per identity across requests** — a captured `ctx` would
be an earlier request's, which is the cross-request-promise hazard this service is audited against.
Without a deferral (tests, hand-built stacks) the drain is awaited exactly as before.

Expected effect on `operation.invoke`: p50 down by ~the `traceFlush` p50 (150ms), p95 by up to its
p95 (2.3s). To be confirmed against Signoz after the dev deploy — recorded here as a prediction, not
a measurement.

---

## 2026-09-14 — iterating on dev

### Correction: the server-side percentile table above is biased

**93% of Effect child spans record `duration_nano = 0` in every environment**, production
included (7d: 870 `http.server POST` spans, 64 with any duration). The Workers clock only advances
across I/O, so a span whose start and end are not separated by I/O reads as zero-length. The
"production, server-side" table in §3 was therefore computed over the ~7% of calls slow enough to
register — the slow tail, not the population. `fetchHandler POST` (the platform's own span around
the whole request) has real durations everywhere and is the number to trust: **production p50
2840ms, dev p50 2482ms** (7d), so dev is a valid place to iterate.

The "dev is unobservable" obstacle in §Obstacles was the same effect, misread as dev-specific.

### Fix 3 — the eval's identity gets a Hub account

`edgeAuth` admits a chained HALO identity on the WebSocket upgrade route only when a Hub account is
bound to it. The repo already has the sanctioned way for an ephemeral test identity to get one —
`POST /hub/account/login` with a `test+*@dxos.org` address, open on local/test/dev/preview and
closed on staging/production, used by the edge repo's own e2e harness — and the eval simply never
called it. `claude-harness.ts` now binds a fresh `test+mcp-eval-<key>@dxos.org` account before
replicating. The run connects, the grant is minted, Claude Code dispatches real tool calls at dev.

### Finding — every deployed `invokeOperation` hung, and why

First dev run after Fix 3: **43%**, every `invokeOperation` errored after ~6.1s. Signoz:

- operation-service and mcp-space-service both stuck in `EntityManager._loadSpaceRootDocHandle`
  (`Automerge root doc load timeout … 5,000ms`), then `The Workers runtime canceled this request
because it detected that your Worker's code had hung`.
- **db-service's own `DataServiceEntrypoint.getDocuments` was being killed the same way**, so
  every caller up the chain inherited a ~30s hang instead of an error.
- The space _had_ replicated: the eval's subduction sessions were live and its replicator DO had
  sent `collection-state` for 7 documents.

A direct probe against the same space after db-service was redeployed (fresh DO instance, eval
client gone) succeeded, with `getDocumentsBytes` answering in `initMs 0 / blobsMs 0, found 4/4`.
So the hang is state-dependent (a live DO instance with an active client session), not missing
data. It did not recur in the two eval runs since. Not root-caused; what was done about it:

- **`compute-runtime`: `FunctionContext` bounds `db.open()` at 15s** and fails with the space
  named, so a root that never arrives is an error in seconds rather than a runtime kill after ~30s
  with no context, propagated to every caller.
- **db-service logs the document-load path** (`getDocuments` on entry with space and ids; per
  phase in the DO), so the next occurrence says how far it got. The runtime-cancel log carries
  nothing.

### Fix 4 — the fixed ~1.3s per MCP request: the handler cache never hit

`routeMs` (logged inside `mcpHandler.fetch`, around the Effect handler) on dev:

| Request                                    | routeMs (dev) | same handler under Miniflare |
| ------------------------------------------ | ------------- | ---------------------------- |
| `notifications/initialized` (202, no work) | 1298–1619     | 1–54                         |
| `GET /mcp` → 405 (trivial route)           | 771–1620      | 1–54                         |
| `queryOperations`                          | 1169–1554     | —                            |

Disabling the Effect tracer bridge on dev changed nothing (405 p50 1416 → 949, 202 1335 → 1509:
noise), ruling tracing out. The tell was `opened internal MCP session on this isolate` logging on
**every request, consecutive ones on the same isolate included** — that line fires only when a
handler entry has no session, i.e. `getHandler` was building a new handler per request.

Root cause: the cache was a `WeakMap` keyed by the `env` object, and on the deployed worker that
object is not stable across requests, so the key never hit. Every request rebuilt the handler —
`listOperations` + `listSkills` RPCs to operation-service, the Effect layer, a synthetic
`initialize` — and leaked a runtime. Under Miniflare `env` is one object, which is why it never
showed locally. The cache is now keyed by identity alone (the bindings a handler captures are fixed
for an isolate's lifetime); tests that swap a binding between requests empty it explicitly.

**Before → after, dev, client-observed from the sandbox** (same probes, same space):

| Probe                               | before                | after               |
| ----------------------------------- | --------------------- | ------------------- |
| `connect` (initialize + tools/list) | 5650–14229ms          | **197ms**           |
| warm 202 / 405 / 415 (no work)      | 850–2500ms            | **40–63ms**         |
| `queryOperations` p50               | 1536–1563ms           | **75ms**            |
| `loadSkill` p50                     | 1530ms                | (in the eval below) |
| `space.queryObjects` p50 / p95      | 4854–5759 / 6233–7999 | **2109 / 3557ms**   |

The first request on a fresh isolate still pays the build (1.8–2.7s); that is now the only time.

### Where the remaining ~2s per `invokeOperation` goes (operation-service phase log, dev)

`space.queryObjects`, two calls: `registry 0ms · context 373–2246ms · handler 2086–2498ms ·
scope close 0 · drain 10–19ms`. The context build (open an `EchoClient`, construct the database,
load the root document over `DataService`) is cold-vs-warm; the handler is the query itself
(`execQuery` on the indexer, then per-object document loads — the db-service log shows 1, 2, 1, 4
document round trips per call). Both are operation-service / db-service work, next in line.

### Eval runs on dev (real Claude Code subprocess, fresh identity each run)

| Run | Score | invokeOperation errors | Notes                                                      |
| --- | ----- | ---------------------- | ---------------------------------------------------------- |
| 1   | 43%   | 25 / 25                | before Fix 3: identity refused, nothing replicated         |
| 2   | 43%   | 25 / 25                | after Fix 3: connected, then the db-service hang           |
| 3   | 57%   | **0 / 35**             | after the db-service redeploy; `tasks-listed` passes       |
| 4   | 86%   | 0 / 35                 | Fix 4: `tool-latency` and `follow-up-turn-wrote` pass      |
| 5   | 86%   | 0 / 35                 | Fix 5: **every correctness scorer passes**                 |
| 6   | 100%  | 0 / 35                 | same code, warm DOs: **every scorer passes**               |
| 7   | —     | —                      | API-token auth: mint refused, `invalid_nonce` (Fix 6)      |
| 8   | 43%   | 35 / 35                | token accepted by hub, worker refused: `no_agent` (Fix 7)  |
| 9   | 86%   | 0 / 35                 | token flow end to end: **every correctness scorer passes** |
| 10  | —     | —                      | harness raced the post-bind EDGE reconnect (Fix 8)         |
| 11  | 100%  | 0 / 35                 | props cached in the worker: **every scorer passes**        |

Client-observed latency per run (p50 ms; `*` is every invokeOperation sample):

| Run | connect | queryOperations | loadSkill | invokeOperation `*` p50 / p95 |
| --- | ------- | --------------- | --------- | ----------------------------- |
| 3   | 14229   | 1563            | 1530      | 4592 / 7999                   |
| 4   | 1293    | 62              | 46        | 2059 / 2637                   |
| 5   | 4333    | 58              | 42        | 3360 / 4450                   |
| 6   | 3884    | 69              | 49        | 2129 / 2621                   |
| 9   | 6127    | 434             | 423       | 2632 / 3456                   |
| 11  | 11183   | 78              | 57        | 2141 / 2564                   |

Run 5 ran minutes after the db-service redeploy, which resets every Durable Object, so its
invocations paid cold loads; its `tool-latency` miss (budget 3000ms p95) is that, not a regression
in the path — the tool-side numbers (58 / 42ms) are unchanged from run 4. Run 6, the same deployed
code with the Durable Objects warm, confirms it: invokeOperation p50 2129 / p95 2621ms, zero errors,
and `tool-latency` passes — 7/7 scorers, the first fully green dev run.

### Fix 5 — a server-side write reaches a live client at once

Runs 3 and 4 failed `task-completed` while `follow-up-turn-wrote` — which requires the _same_
write to be visible — passed. The agent's `tasks.update` had succeeded server-side each time
(transcripts: `status: "done"` returned at 10:44:33 and 10:56:16); the harness's read-back simply
ran before the write reached its client, though its "in sync with EDGE" check had passed.

Cause: the replicator DO ships the broadcast `addCommit` queues for live sessions only inside an
alarm-driven pass, and `addCommits` — the DataService write path an operation handler goes through
— armed no alarm. A connected client learned of a server-side write only when its own traffic or
the 10s session-lost sweep happened to trigger the next pass. The client's sync state compares its
heads against the last `collection-state` it received, so it read "in sync" until then.
`addCommits` now arms a near-term alarm when sessions are live (36/36 replicator tests pass).

### Where the remaining ~2s per `invokeOperation` goes — measured

Per-phase logs on a warm operation-service isolate, `space.queryObjects` (three probe calls):

| Phase                                          | ms        | where                          |
| ---------------------------------------------- | --------- | ------------------------------ |
| context build (`getSpaceMeta` + clients)       | 219–367   | operation-service → db-service |
| `db.open()` = root-document `getDocuments`     | 199–644   | operation-service → db-service |
| `execQuery`                                    | 46–65     | operation-service → db-service |
| object `getDocuments` (4 documents)            | 44–47     | operation-service → db-service |
| trace drain                                    | 5–408     | operation-service              |
| **db-service's own share of a `getDocuments`** | **15–25** | init hop 8–14 + read hop 6–13  |

So the invocation is four sequential RPCs to db-service, and the first one or two of them cost
200–650ms while the later, identical ones cost ~45ms — the service-binding hop, not db-service
work (which is ~20ms per call, Durable Object included). The cold-isolate case adds the
`operation-service` registry build and the `mcp-space-service` handler build on top.

Not pursued in this pass. Candidates, in order: issue the root-document fetch concurrently with the
context build (its id is known from `getSpaceMeta`); find what makes the first RPCs of an
invocation slow (RPC session setup, or placement); and drop the `stub.init` hop from
`getDocuments` (~10ms each, three per invocation).

### Also corrected in this pass

- **"Dev spans record 0, prod records real durations"** — see the first correction above.
- **"The sandbox egress proxy adds ~1s per request"** — measured with `curl` opening a new TLS
  connection each time; a warm connection through the proxy costs ~40ms.
- **`deploy:dev` in mcp-space-service** now deploys `env.dev`; the empty `--env=` deployed the
  local config onto the dev sandbox.

### Auth rework — API tokens instead of the presentation and dev-form doors

The two headless doors the branch had opened (a HALO presentation verified on `/mcp` through a new
hub RPC, and the `dev_form=1` identity-key form on `/authorize`) were replaced by the identity-bound
API tokens of dxos/edge#1073: the run binds a test account, mints a `dx-api01-…` token with a
presentation, and hands it to Claude Code as the `/mcp` bearer; the worker resolves it through hub.
Three things broke on the first real runs, each a fact about the deployed stack rather than the eval:

- **Fix 6 — the mint's challenge must be hub's own.** A nonce is `HMAC(secret, audience‖prefix)` under
  the verifier's keypair. On dev, edge and hub hold different `DX_HUB_SERVICE_KEYPAIR` secrets, so the
  challenge from edge's `/auth` verifies nowhere but edge (`invalid_nonce` in hub's audit stream).
  The mint now takes the lazy path: request, sign the challenge on the 401, request again.
- **Fix 7 — the identity needs an EDGE agent.** The worker resolves a token's HALO space and spaces
  from the agent registry; the dev form used to take both from the client, which hid that a fresh
  eval identity has no agent (the agent manager gives up on `identity_not_associated_with_account`,
  which it sees once before the account bind). The harness now creates the agent after the bind and
  waits for it to report active.
- **Run 9's `tool-latency` miss is the door's own cost**: `queryOperations` 69 → 434ms and `loadSkill`
  49 → 423ms, i.e. the four service-binding round trips (hub verify, two agent-registry lookups,
  `listAgentSpaces`) paid on every request, where an OAuth grant carried the props. The worker now
  caches the resolved props per token for 60s — the window hub's own validation cache already allows
  a revoked token — which returns the read tools to the run-6 numbers (run 11: 78 / 57ms, 7/7).
- **Fix 8 — the harness sampled EDGE's first status.** That status is the connection attempt made
  before the account bind, which EDGE refuses; run 10 lost the race with the reconnect that follows
  the bind and failed before any work began. `assertEdgeConnected` now waits for `CONNECTED`.
