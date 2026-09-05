# @dxos/compute-runtime

## 0.12.0

### Minor Changes

- a09e18e: Files can now be stored in an S3-compatible bucket — Cloudflare R2, AWS S3 or MinIO — through a new headless plugin, `@dxos/plugin-s3`. It contributes a `BlobBackend` under the storage name `s3` plus the matching `FileCapabilities.Backend` descriptor, so **S3** appears alongside Inline, Edge and WNFS in the file plugin's storage setting. `plugin-file` itself is unchanged: the backend seam it already exposed for WNFS is the one this uses.

  Credentials go through `plugin-connector`. The connector's credential form takes a bucket endpoint and an access key pair and stores them as an `AccessToken` whose `source` is the bucket host, so one connection addresses exactly one bucket and a blob's `s3://<host>/<key>` URI resolves its own credential with no side table. Requests are signed with SigV4 computed over WebCrypto rather than through an AWS SDK, and the signer is tested against AWS's own published example signatures.

  **The backend is not browser-only.** The protocol code lives in `@dxos/echo-client` under a new `./blob-s3` export — beside the blob manager that owns the backend registry — and its database bindings in `@dxos/compute-runtime`, whose `FunctionContext` registers the backend on the `EchoClient` it builds for operations. So a function — including one invoked by an agent over MCP — writes to the bucket its space is connected to, rather than falling back to inline storage and its 4 MiB cap. Nothing Cloudflare-specific is involved: the backend makes an outbound request to the customer's own endpoint.

  Two operator requirements are worth stating up front. The bucket's CORS policy must allow the app origin for `GET`, `HEAD` and `PUT`, or the browser blocks each request before it is sent and the failure reads as an opaque network error rather than a permissions problem. And because the secret key is stored in the space, every member of that space can read and write the bucket — scope each key pair to one bucket and treat the space as its trust boundary. Reads fall back to an unsigned request when the space holds no credential, which is what lets a public bucket's objects render for a viewer who was never given the keys.

### Patch Changes

- 9477170: Fixed "Process not hydrated" when an agent session was resolved from a persisted process that was not live. `AgentService.getSession` rediscovers such a process as a dormant, read-only handle and now adopts the live handle that `Handle.hydrate` returns instead of the dormant view, so the first prompt is delivered rather than dying.

  `ProcessManager`'s dormant handles also support `terminate()` now: discarding a stale process (for example one whose immutable spawn annotations no longer match the request) deletes its record and those of its dormant descendants without booting it first.

- 7575cb6: Make a crashed process diagnosable from a user-submitted debug bundle.

  A failed process logged `lifecycle: failed` at `debug` with only `Cause.pretty` text, and the deferred `ctx.fail` path logged nothing about the cause at all — so a crashed agent turn left no error-level line to find. Both paths now report at `error` and carry the failing `Error`/defect itself, so the record keeps the message, stack, and nested causes that `Cause.pretty` flattens away.

  `sqlite query` moves from `debug` to `trace` unless the query took at least 20 ms. The persistent log store drops `trace`, and this one line was 80% of a 50 MB feedback upload — enough to cut the retained window to under nine minutes and evict the failure being reported. Slow queries, the ones worth diagnosing after the fact, still log at `debug`. Use `DX_LOG=trace` or a per-file filter to see every query locally; the DevTools `performance.measure` track is unchanged.

- 261c821: Scheduling an unroutable followup operation in the EDGE runtime no longer fails the operation that scheduled it. `Operation.schedule` is typed as non-failing, but the EDGE-backed `Operation.Service` asserted on a missing `deployedId` — so a handler that scheduled a directly-imported definition (rather than one deserialized from the operation registry) took its caller down with it. Such followups are now logged and dropped. `Operation.invoke` is unchanged and still fails loudly.
- 02fe893: Operations invoked through `invokePromise` are now traced on the runtime's tracer instead of Effect's native one, so their spans reach the observability backend and nest under the caller's span rather than each opening its own trace.
- fc8c80c: Fixed two `ProcessManager` spans that reported under the wrong name: process rehydration was exported as `ProcessManager.shutdown` and persisted-record discard as `ProcessManager.startup`. They are now `ProcessManager.rehydrate` and `ProcessManager.discardRecord`.
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [592b00e]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [b2d5bb2]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [4e417e9]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [a3d45c4]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [3e02201]
- Updated dependencies [dde6714]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5ceaf9c]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [b125655]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/link@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/util@0.12.0
  - @dxos/operation@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/blob@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/compute@0.11.1
- @dxos/context@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/link@0.11.1
- @dxos/log@0.11.1
- @dxos/operation@0.11.1
- @dxos/protocols@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 1a9bca1: Collapse `@dxos/functions` and `@dxos/functions-runtime` into `@dxos/compute-runtime` (local runtime + `Remote*` interface tags) and a new private `@dxos/edge-compute` (EDGE deploy/scripts + `Edge*` implementations). Assistant-coupled agent runtime and test helpers move to a new private `@dxos/agent-runtime` (avoiding a `compute-runtime`↔`assistant` build cycle).

  `@dxos/compute-runtime` now exports the former functions SDK/services/protocol/triggers/executor plus new namespace modules: `RemoteOperationInvoker`, `RemoteProcessManager`, `RemoteTriggerManager` (interface tags with `layerNoop`), and the aggregate `ProcessMonitor.layer` / `TriggerMonitor.layer` that merge local and remote views. `FunctionInvocationService` now routes through `RemoteOperationInvoker` (superseding `RemoteFunctionExecutionService`). Breaking: `ProcessManager.layer` no longer provides `Process.ProcessMonitorService` — provide `ProcessMonitor.layer` (plus a `RemoteProcessManager` layer) instead; imports of `@dxos/functions` / `@dxos/functions-runtime` move to `@dxos/compute-runtime`, `@dxos/edge-compute`, or `@dxos/agent-runtime`.

- bf013a1: Remove the deprecated local/remote function-execution machinery:
  `FunctionInvocationService`, `LocalFunctionExecutionService`,
  `FunctionImplementationResolver`, `ServiceContainer`, and `FunctionExecutor`.
  Operation invocation now runs exclusively through `Operation.Service`
  (`ProcessOperationInvoker`); select edge dispatch per invocation with
  `{ on: 'edge' }`, keyed by the operation's `deployedId`.
- bf055c8: Fix running a routine manually. The runnable's input now comes from the routine's first trigger, so a sync routine's `binding` reaches the operation instead of throwing, and a routine whose trigger is `remote` force-runs on the edge dispatcher rather than silently running on the client. Also export `createInvocationPayload` for building a trigger's invocation payload.
- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [48d168e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a83d98a]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [2543b63]
- Updated dependencies [f6a01e3]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [6067460]
- Updated dependencies [12fd785]
- Updated dependencies [f7d7735]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [3761762]
- Updated dependencies [bdf9f68]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [37c17cc]
- Updated dependencies [08a3eea]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/link@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/operation@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
