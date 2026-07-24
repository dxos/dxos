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
- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- Updated dependencies [4e64123]
- Updated dependencies [48d168e]
- Updated dependencies [46ec569]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2543b63]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [08a3eea]
  - @dxos/echo@0.11.0
  - @dxos/link@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/operation@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
