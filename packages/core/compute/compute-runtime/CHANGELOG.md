# @dxos/compute-runtime

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
