# Agent feed messages — TASKS

Branch: `dm/agent-feed-messages`. Design: [DESIGN.md](./DESIGN.md).

## Phase 1 — SessionStore + feed types (@dxos/assistant) — DONE

- [x] `Alarm` feed record type (`org.dxos.type.alarm@0.1.0`) beside SessionLink.
- [x] `QueuedAnnotation` (`org.dxos.annotation.queued`) + `AckAnnotation`
      (`org.dxos.annotation.ack`, value = Ref to the original per user
      correction; `getAck` projects the entity id).
- [x] Rename `SessionLoader` → `SessionStore` (all call sites: AiSession,
      Harness, index, tests — no compat re-export).
- [x] SessionStore reads: one-linear-scan `loadPending`/`loadState`;
      `reifyHistory` kept (filters queued originals).
- [x] SessionStore writes: `enqueueMessage`, `ackMessage` (echo, no removal),
      `setAlarm`, `cancelAlarm`, `ackAlarm`.
- [x] Unit tests — 13 in SessionStore.test.ts (queue projection, alarm
      projection, cancel, history exclusion).

## Phase 2 — agent-process on the feed — DONE

- [x] Queued prompts come from the feed; `AgentEventsCell` KV queue survives
      only for tool_result + pre-migration entries (drained first).
- [x] `AlarmManager` + `AgentAlarmCell` deleted; wake = earliest pending feed
      alarm; one-time KV-alarm → feed migration on process start.
- [x] `onAlarm` dequeues by threading `ack` (a Ref) through
      TurnRequest → AiSession.RunProps → AiRequest.begin, which stamps it on
      the turn's user message — one append is prompt + echo + ack. Post-turn
      fallback ack covers producers that do not persist prompts (agent-claude).
- [x] `isAgentWorkPending` takes pendingMessages/pendingAlarms.
- [x] `enqueueMessage` RPC + `onInput` append queued Messages to the feed.
- [x] agent-process/redelivery/tool-backgrounding/AgentService tests green.

## Phase 3 — producers + surfaces — DONE

- [x] set-alarm operation description updated (multiple pending alarms).
- [x] `Alarm` + `SessionLink` registered in plugin-assistant schema-defs.
- [x] `projectThread` returns `{ messages, queued }` — queued originals never
      join the thread.
- [x] Changeset (.changeset/agent-feed-messages.md).

## Phase 4 — simplification + chat UI — DONE

- [x] Dropped every pre-migration path: `AgentEvent` union → single
      `ToolResultEvent`, `AgentEventsCell` → `ToolResultsCell`, legacy
      KV-alarm migration and `AgentAlarmCell` deleted; `wakeUpPrompt` /
      `toolResultPrompt` exported and pinned by redelivery.test.ts.
- [x] `Chat.Queue` (`components/ChatQueue`) — right-aligned Listbox stack of
      queued prompts above the composer, per-row cancel via
      `db.removeFeedItemsByIds`; mounted in `ChatArticle`.
- [x] `ChatStatus` shows the next pending alarm (icon + wake clock, reminder as
      tooltip) beside elapsed/tokens; `projectAlarms` in thread.ts.
- [x] Stories (`ChatQueue.stories.tsx`: Default/Empty/Long/ReadOnly +
      TestCancel play) and 8 new projection tests in thread.test.ts.

## Phase 4 — analysis only (done in DESIGN.md §3)

- [x] Chat + Agent move to @dxos/assistant; Chat as primary session anchor —
      written up, not implemented.

## Phase 5 — queue UI — DONE

- [x] `ChatQueue` component + stories: right-aligned stack of pending prompts above the composer,
      each cancellable (`Feed.remove`).
- [x] Alarm surfaced in the status pill beside elapsed/tokens.
- [x] Submitting while a turn runs enqueues instead of being dropped (`processor.enqueue`, which
      does NOT cancel the running turn the way `request` does).
- [x] Send/stop mode: running+empty → Stop, running+text → Send. Keyed to `active`, not
      `streaming` — pinned by browser play tests that fail on the old wiring (verified by reverting).
- [x] `Chat.Queue` mounted in ChatArticle, ChatDialog and the ChatPrompt story.

## Follow-ups (tracked, not scheduled)

- [ ] Fold `tool_result` events into the feed.
- [ ] Chat/Agent move implementation (DESIGN.md §3 sequencing).
- [ ] No `Escape`-to-cancel keybinding: while a turn runs with text in the box the Stop affordance is
      not reachable from the button (clear the box to get it back). Add `Escape` → `cancel` in
      `useChatKeymap` if that proves annoying.
