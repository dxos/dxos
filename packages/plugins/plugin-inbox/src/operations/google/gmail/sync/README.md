# Gmail sync and progress reporting

Gmail sync publishes live progress via trace `status.update` events. A
trace→registry reducer (not yet wired) will project these into
`AppCapabilities.ProgressRegistry` so `MailboxArticle` and the R0 status
indicator can subscribe reactively.

## Architecture

```
syncGmail (producer)
  │  Trace.TraceService
  │  status.update { message, progress: { key, current, total } }
  ▼
Trace sink (operation runtime / test harness)
  │
  ▼  (future)
trace→registry reducer
  ▼
createProgressRegistry (app-toolkit)
  ▼
Consumers
  ├── MailboxArticle — useProgress(key) → Panel.Statusbar <ProgressMeter/>
  └── ProgressStatusIndicator (plugin-progress) — useProgressMonitors() popover
```

| Layer | Package | Role |
| --- | --- | --- |
| Trace API | `@dxos/compute` / `Trace` | `StatusUpdate` events via `Trace.TraceService` |
| Capability | `@dxos/app-toolkit` | `createProgressRegistry` (future reducer target) |
| Host | `@dxos/plugin-progress` | Contributes `AppCapabilities.ProgressRegistry` |
| Producer | `plugin-inbox` / `syncGmail` | Emits `status.update` with progress fields |
| Consumer | `MailboxArticle` | Subscribes via `useProgress(createSyncProgressKey(mailbox))` |

## Progress key

The reducer will key registry monitors by mailbox URI:

```ts
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) =>
  Obj.getURI(mailbox).toString() + '#sync';
```

The `#sync` suffix lets other mailbox-scoped monitors coexist (e.g. `#topics`).

## Producer lifecycle (`syncGmail`)

1. **Resolve writer** — `yield* Trace.TraceService` (declared on
   `InboxOperation.GoogleMailSync.services`).

2. **Report status** — a local `reportStatus` helper calls
   `traceWriter.write(Trace.StatusUpdate, …)` so sync callbacks in `fetchMessages`
   can emit without wrapping in `Effect`:

   ```ts
   reportStatus({ current: 0 });
   reportStatus({ total: totalToRetrieve });
   reportStatus({ current: progressCurrent });
   reportStatus({ message: 'Sync failed' });
   reportStatus({ message: 'Cancelled' });
   ```

3. **Set total** — each date chunk's enumerated id count (before full fetches)
   revises `progress.total`. Chunks enumerate serially, so `total` leads `current`.

4. **Advance** — once per retrieved message via `onRetrieved`, incrementing
   `progress.current`.

5. **Abort** — `AbortController` + `Pipeline.abortWith` remain for cooperative
   cancellation; the reducer will wire the meter's cancel control later.

## Consumer wiring (`MailboxArticle`)

Unchanged until the reducer lands — still reads `ProgressRegistry`:

```ts
const syncProgress = useProgress(createSyncProgressKey(mailbox));
```

## Testing

`sync.test.ts` captures `status.update` events via `Trace.testTraceService` and a
custom `TraceSink`, asserting `progress.current` advances, `progress.total` is
set, and `progress.key` matches `createSyncProgressKey(mailbox)`. `inboxSyncTestServices`
provides `Trace.writerLayerNoop` by default; pass `{ traceLayer }` to observe events.

## Related

- Trace API: `packages/core/compute/compute/src/Trace.ts` (`StatusUpdate`, `emitStatus`)
- Design spec: `agents/superpowers/specs/2026-07-11-progress-monitor-capability-design.md`
