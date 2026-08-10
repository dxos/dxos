# Mailbox pipeline routine — design

Date: 2026-08-10 · Project: `mailbox-research` · Status: draft for review

## Goal

A manually triggerable Routine that drives a **cursored** pipeline over the Mailbox feed, with a
start/stop toolbar button in the plugin-inbox mailbox, a sync-style progress meter, and a log line
per message (its title). This is a **walking skeleton for the cursor machinery** — incremental
processing plus explicit cursor reset are the things under test; the pipeline body is deliberately
trivial (log the title) so no models are needed and stages (facts/tag/summarize) can plug in later.

## Existing infrastructure (reused, not built)

- **Cursor** (`@dxos/link` `Cursor`): persisted feed cursor (`spec.kind === 'feed'`), keyed by
  `message.created` epoch-ms (native feed cursor still stubbed). Consumer collision is solved by
  tagging the cursor with an `Obj.Meta` foreign key — precedent:
  `plugin-crm/src/operations/process-mailbox.ts` (`CURSOR_KEY_SOURCE`/`CURSOR_KEY_ID`).
- **Progress + stop**: `Trace.StatusUpdate` events carrying `progress.key` are projected into the
  `ProgressRegistry` (plugin-progress trace sink); `registry.cancel(key)` terminates the emitting
  process, which observes `Cancellation.signal`. Requires the operation to run as a **scheduled
  process** (`Operation.schedule`), not a plain invoke. Pattern: `plugin-inbox/src/sync/mail-sync.ts`
  (`reportStatus`).
- **Routine**: `makeRoutine` + `RoutineCapabilities.Template` (Automations companion) +
  `RunRoutine` for manual runs. Pattern: `plugin-brain/src/templates/mailbox-facts.ts`.
- **Toolbar**: app-graph action with `disposition: ['toolbar', 'list-item']`, running-state via the
  progress `monitorAtom`. Pattern: the `syncMailbox` extension in
  `plugin-inbox/src/capabilities/app-graph-builder.ts`.

## Components

### 1. `InboxOperation.ProcessMailbox` (plugin-inbox, `operations/process-mailbox.ts`)

- Input `{ mailbox: Ref<Mailbox>, pageSize? }`; output `{ processed }`. Operation key via the
  plugin's `makeKey('processMailbox')` → `dxn:org.dxos.plugin.inbox.operation.processMailbox`
  (DXN-validated; final segment camelCase per the ATProto-style grammar in `@dxos/keys` `dxn.ts` —
  hyphens are legal in middle segments only).
- Finds-or-creates the feed cursor tagged `source: meta.profile.key` (`'org.dxos.plugin.inbox'`, a
  valid DXN name), `id: 'processMailbox'` (`spec: { kind: 'feed', source: feed, target: mailbox }`)
  — the CRM tagging pattern, but with DXN-conformant identifiers (the CRM precedent's
  `org.dxos.plugin-crm` / `process-mailbox` are not), so it coexists with the `AnalyzeMailbox` and
  CRM cursors on the same feed.
- Queries feed messages, drops `Date.parse(created) < cursorKey` (malformed dates skipped), sorts
  ascending, then streams through a `@dxos/pipeline` assembly:
  - `log-title` stage: `log.info('process: message', { title, created })` per message — the
    pipeline-body seam where real stages plug in later.
  - `Stream.grouped(pageSize)` → sink advances the cursor per page (`Cursor.advance`), so an
    interrupted run resumes from the last committed page.
- Progress: `createProcessProgressKey(mailbox)` = `Obj.getURI(mailbox) + '#process'`;
  `Trace.StatusUpdate` per message with `current`/`total` (total = pending count at run start) and
  the message title as the status text, mirroring mail-sync's `reportStatus`.
- Cancellation: reads `Cancellation.signal` and stops between messages; already-committed pages keep
  their cursor advance (that is the semantics under test).

### 2. `InboxOperation.ResetProcessCursor` (same module)

- Input `{ mailbox: Ref<Mailbox> }`. Finds the tagged cursor; clears `max`, `min`, `lastTick`,
  `lastError` via `Obj.update`. No-op (success) when no cursor exists yet.

### 3. Toolbar start/stop + reset (app-graph extension `processMailbox`)

- Sibling of the `syncMailbox` extension, matching mailbox nodes.
- **Start/stop toggle button** (toolbar disposition, like Sync):
  - Idle (`monitorAtom(processKey)` not `running`): play icon → schedules `ProcessMailbox`
    (`Operation.schedule`, so the run is a cancellable process).
  - Running: stop icon → `ProgressRegistry.cancel(processKey)`.
- **Reset cursor** menu action (`list-item` disposition — nav context menu, not the primary
  toolbar): invokes `ResetProcessCursor`. Disabled while a run is active.

### 4. Progress meter in `MailboxArticle`

- Statusbar subscribes to the `#process` key alongside `#sync`, showing whichever monitor is active
  (precedent: the former `#topics` wiring).

### 5. Routine template (plugin-inbox capability)

- `RoutineCapabilities.Template` `{ id: 'org.dxos.routine.processMailbox', label: 'Process
Mailbox', appliesTo: Mailbox }`.
- Scaffold: `makeRoutine({ spec: { kind: 'runnable', runnable:
Ref.fromURI(InboxOperation.ProcessMailbox.meta.key) }, trigger: Trigger.make({ enabled: false,
spec: Trigger.specTimer(cron), input: { mailbox } }) })` — the durable routine definition; manual
  runs also work from the Automations companion (`RunRoutine`). The toolbar button schedules the
  operation directly (decision 2a) and does not require the routine to exist.

## Decisions (locked with user, 2026-08-10)

1. Pipeline body v1 = log-title skeleton (no AI) — **1a**.
2. Toolbar schedules the operation directly; the routine is the separate durable definition — **2a**.
3. Primary toolbar button with play/stop toggle, like Sync — **3a**.
4. **Cursored + resettable** — incremental runs and explicit reset are the point of the test
   (amended from the original no-cursor proposal).

## Error handling

- Malformed `message.created` → skipped (never re-scanned), per the CRM precedent.
- Cancellation mid-run → clean stop; cursor retains the last committed page.
- Run failure → `Cursor.recordError`; the meter clears when the process exits.

## Testing

- **Unit** (`process-mailbox.test.ts`, node): cursor find-or-create + tag isolation from the CRM/
  analyze cursors; skip-below-cursor filtering; per-page advance; reset clears `max`; second run
  processes only new messages; reset then run re-processes all. Stubbed feed messages, no models
  (precedent: `plugin-crm/src/operations/process-mailbox.test.ts`).
- **Storybook** (stories-inbox): a `ProcessMailbox` story seeding a mailbox feed, exercising the
  toolbar button + meter (play test where the headless env allows; manual numbered `Test:` script
  otherwise, per repo convention).
- **Manual script** (numbered): 1. seed/sync a mailbox; 2. Start — meter appears, titles logged; 3. Stop mid-run — meter clears; 4. Start — resumes after the cursor (only unprocessed titles); 5. Reset cursor; 6. Start — all titles logged again.

## Out of scope (v1)

- Real pipeline stages (facts/tag/summarize) behind the `log-title` seam.
- EDGE execution of the routine (`remote` trigger) — local process only.
- Backfill/`min`-range semantics — single-directional `max` cursor only.
