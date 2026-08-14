# @dxos/compute

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/protocols@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/vendor-kbn-handlebars@0.11.1

## 0.11.0

### Minor Changes

- a19443b: Add a `direct` trigger kind that is invoked on demand rather than scheduled by the dispatcher, along with its spec/event constructors and an `isManuallyInvokable` helper.
- 5e7839e: Mailbox sync progress can now be cancelled from the sync meter: for an edge-executed sync trigger the cancel control stops the current run and its continuation chain, while the trigger's schedule stays enabled and re-syncs on its next tick. `@dxos/compute` now exports the `Cancellation` service the runtimes provide (`Cancellation.Service`) and operations observe (`Cancellation.signal`).

  Breaking:
  - `@dxos/app-toolkit`: `ProgressTraceSinkOptions.terminateProcess` is renamed to `cancelProcess` and takes a `CancelTarget` (pid, space, runtime, trigger) instead of a pid, so a cancel can be routed to the runtime that owns the run.
  - `@dxos/compute-runtime`: `SwarmRemoteTraceMonitorOptions.subscribe` yields `SwarmTraceBroadcast` (`{ payload, tags }`) instead of a bare payload — the envelope tags carry the ref-typed trace meta dropped by the wire codec.

- 6067460: `McpToolAnnotation` opts an operation into MCP projection: a name, model-facing description, safety class (`read`/`write`/`destructive`), and aspect, applied at the definition site with `Operation.mcpTool({ … })` and read back with `Operation.getMcpTool`. The annotation rides through `Operation.serialize` into the persisted record, so a remote projector (edge mcp-space-service) discovers tools from the operation registry instead of a hand-maintained table. Projected operations must be remotely invocable — refs in, JSON snapshots out, serializable schemas, worker-safe handlers.
- f7d7735: Add `Project` (`@dxos/compute`), the successor to `Topic`, holding owned instructions, routine references, and an artifacts collection; the `Routine` schema moves into `@dxos/compute` alongside it. `Instructions` gains a structured `commands` field, surfaced as sentinel-command autocomplete in the assistant chat prompt. The existing `@dxos/types` GH/Linear-style `Project` (name, description, image) is renamed to `ExternalProject` to free the typename for the new concept. `dx-input` now owns its full input chrome (padding, focus shift, a single-band ring/border treatment) so markdown-backed fields match plain inputs.
- 7b270f2: Subscription triggers now report a real mutation type on `SubscriptionEvent.type` — `'created' | 'updated' | 'deleted'` (previously the placeholder `'unknown'`; the field is now a narrowed literal). Subscription semantics (create/update/delete) apply uniformly to both the space database and feed items — build a feed-scoped subscription with `Trigger.specSubscription(Query.select(...).from(Scope.feed(...)))`. Change detection is content-signature based (feed-backed objects are unversioned), and deletes are detected uniformly via queryable tombstones (`deleted: 'include'` + `Obj.isDeleted`) for both sources — a feed removal now leaves a body-preserving tombstone in the index.
- 37c17cc: Project model unification, phase 1 (breaking, no data migration — nothing deployed). Two forms of work: markdown checklists (`Outline`) are the cheap, fluid form; ECHO `Task` objects in a `TaskSet` are the durable, assignable form; promotion links the two. `ExternalProject` becomes `TaskSet` (`org.dxos.type.taskSet@0.2.0`); containment is the ECHO parent edge (`TaskSet → Task → sub-Task`), replacing the `Task.project` ref. `Task` 0.2.0 renames `assigned: Ref<Person>` to `assignee: Actor` (human by Person ref/email/name, agent by DID) and adds `failed`/`cancelled` statuses. `Outline` moves into `@dxos/types` (0.2.0) with checklist markdown helpers and the task-promotion helpers. `Project` 0.3.0 adds `goals`, `outline`, and `taskSet`. The `Plan` type is REMOVED: a conversation's working set is its outline (`Chat.outline`; project chats write the project's outline) plus promoted Tasks; the planning skill edits checklist markdown, and delegation promotes to a durable agent-assigned Task the supervisor reconciles over.
- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
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
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [3761762]
- Updated dependencies [bdf9f68]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/vendor-kbn-handlebars@0.11.0
