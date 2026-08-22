# @dxos/compute-runtime

## 0.12.0

### Patch Changes

- 261c821: Scheduling an unroutable followup operation in the EDGE runtime no longer fails the operation that scheduled it. `Operation.schedule` is typed as non-failing, but the EDGE-backed `Operation.Service` asserted on a missing `deployedId` — so a handler that scheduled a directly-imported definition (rather than one deserialized from the operation registry) took its caller down with it. Such followups are now logged and dropped. `Operation.invoke` is unchanged and still fails loudly.
- Updated dependencies [8363f12]
- Updated dependencies [e2eecf2]
- Updated dependencies [592b00e]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [4e417e9]
- Updated dependencies [ea11703]
- Updated dependencies [a3d45c4]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [a3b6ef0]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [d62a947]
- Updated dependencies [e56276b]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [5ceaf9c]
- Updated dependencies [8ca2ac7]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [256f286]
- Updated dependencies [5b504b4]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [bb94124]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [cc11297]
  - @dxos/ai@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/link@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/operation@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/log@0.12.0
  - @dxos/util@0.12.0

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
