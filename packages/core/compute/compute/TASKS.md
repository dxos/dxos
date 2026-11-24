# Agents, sessions and delegation — tasks

Work items for the API changes in [SPEC.mdl](./SPEC.mdl) (`org.dxos.agent-delegation`). The API surface lands
first with stub implementations; behaviour follows. Each item names the spec requirement it serves.

## Phase 1 — API surface (stubs allowed)

- [ ] `Process.current` and `NoCurrentProcessError`; `current` on `Process.Manager` (F-9).
- [ ] `Process.SessionAnnotation`, `Process.AgentAnnotation`, `Process.ThreadAnnotation` (F-12.1, F-12.4, F-12.5).
- [ ] `AgentService.currentSession`, `currentAgent`, `currentThread` (F-13.2, F-13.3, F-13.6).
- [ ] `AgentService.enqueueMessage`, `setAlarm` — replacements for `HarnessService` Tier B (F-13.5).
- [ ] `AgentService.listSessions`, `listAgents` — discovery from process annotations (F-13.4).
- [ ] `AgentService.spawn` — the spawn verb operations use instead of `Process.spawn` (F-10.3).
- [ ] `AgentService.delegate` with `DelegationTarget` thread / session / agent and message or task ref (F-2.3,
      F-3.2, F-3.3, F-3.4).
- [ ] Remove `HarnessService`; its 52 consumers read the session through `AgentService` (D-31, F-13.5).
- [ ] Rename `AgentProcess` to `SessionProcess` (D-10).
- [ ] Rename the ECHO type `Chat` to `Session`; keep the DXN `org.dxos.type.assistant.chat` with a TODO to rename
      it (F-11.1, F-11.2). About 220 files; its own PR.
- [ ] Rename `AgentService.Conversation` and the `Session` handle type to match the `Session` object (F-11).
- [ ] Move the `AgentService` key from `@dxos/functions-runtime/AgentService` to `@dxos/compute` (D-33).
- [ ] Mark `Process.HarnessHostAnnotation` deprecated once the session annotation replaces host discovery (F-13.5).
- [ ] `thread_delegate` / `thread_wait` as operations going through `AgentService.delegate` (F-10.4).

## Phase 2 — behaviour

- [ ] `Process.spawn` copies the parent's session, agent and thread annotations to the child unless the spawn names
      its own (F-12.2).
- [ ] `SessionProcess` stamps the session and agent annotations on itself, and the thread annotation on the
      tool-call and code-execution processes it spawns for a thread (F-12.5).
- [ ] Implement `currentAgent`, `currentThread`, `enqueueMessage`, `setAlarm`, `spawn`, `delegate` in the
      `@dxos/agent-runtime` layer (F-13).
- [ ] Provide `AgentService` and `Process.ManagerService` wherever `HarnessService` used to be provided: tool
      execution in `AiSession` and `ChatModel`, the cloudflare plugin host's request context, and the test layers.
- [ ] New `AgentProcess` that runs an `Agent` object in its `Agent` durable object: no inference, delegates to
      sessions (F-1.1, F-11.4).
- [ ] `DelegationStrategy.Delegation.spawn` goes through `AgentService.spawn` (F-10.2).
- [ ] The thread scheduler starts lanes through `AgentService` (F-10.2).
- [ ] `DelegateTaskToChat` uses the session verbs of `AgentService` instead of `getSession` and a hand-run first
      turn (F-10.1).
- [ ] Cross-agent delegation: a durable message to the other agent's `Agent` object, and the task-ref case (F-3.3,
      F-3.4).

## Known issues

- [ ] With light threads on, the `runLanes` branch of `onAlarm` returns before the delegation-strategy reconcile,
      so `delegateTask` tasks stay `todo` until another delegation exits.
