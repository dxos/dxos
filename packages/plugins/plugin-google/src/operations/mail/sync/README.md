# Mail sync and progress reporting

Mail sync publishes live progress via trace `status.update` events.
`plugin-progress` contributes a parallel {@link Capabilities.TraceSink} that projects
those events into `AppCapabilities.ProgressRegistry` (alongside the feed trace sink
from `plugin-routine`).

## Architecture

```
runMailSync (shared harness; gmail/jmap providers)
  │  Trace.TraceService
  │  status.update { message, progress: { key, current, total } }
  ▼
Trace sink (operation runtime / test harness)
  │
  ├─ FeedTraceSink (plugin-routine) — durable feed persistence
  └─ createProgressTraceSink (plugin-progress) — live ProgressRegistry
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
| Producer | `plugin-inbox` / `runMailSync` | Emits `status.update` with progress fields |
| Consumer | `MailboxArticle` | Subscribes via `useProgress(createSyncProgressKey(mailbox))` |

## Progress key

The reducer will key registry monitors by mailbox URI:

```ts
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) =>
  Obj.getURI(mailbox).toString() + '#sync';
```

The `#sync` suffix lets other mailbox-scoped monitors coexist (e.g. `#topics`).

## Producer lifecycle (`runMailSync`)

The shared harness (`operations/mail/mail-sync.ts`) drives every provider (gmail,
jmap), so progress reporting lives here once rather than per provider.

1. **Resolve writer** — `yield* Trace.TraceService` (declared on `runMailSync`'s
   requirement channel).

2. **Report status** — a local `reportStatus` helper calls
   `traceWriter.write(Trace.StatusUpdate, …)` so the source's `onEnumerated` /
   `onRetrieved` callbacks can emit without wrapping in `Effect`:

   ```ts
   reportStatus({ current: 0 });
   reportStatus({ total: totalToRetrieve });
   reportStatus({ current: progressCurrent });
   reportStatus({ message: PROGRESS_STATUS_FAILED });
   reportStatus({ message: PROGRESS_STATUS_CANCELLED });
   reportStatus({ message: PROGRESS_STATUS_COMPLETE });
   ```

3. **Set total** — each enumeration page/chunk's id count (before full fetches)
   revises `progress.total`. Enumeration runs ahead of the full fetch, so `total`
   leads `current`.

4. **Advance** — once per retrieved message via `onRetrieved`, incrementing
   `progress.current`.

5. **Abort** — `AbortController` + `Pipeline.abortWith` remain for cooperative
   cancellation; the progress trace sink wires the meter's cancel control to
   `ProcessManager.terminate()`.

## Consumer wiring (`MailboxArticle`)

Reads `ProgressRegistry` via `useProgress(createSyncProgressKey(mailbox))` — fed by
the trace sink while sync runs.

## Testing

`sync.test.ts` captures `status.update` events via `Trace.testTraceService` and a
custom `TraceSink`, asserting `progress.current` advances, `progress.total` is
set, and `progress.key` matches `createSyncProgressKey(mailbox)`. `inboxSyncTestServices`
provides `Trace.writerLayerNoop` by default; pass `{ traceLayer }` to observe events.

## Related

- Trace API: `packages/core/compute/compute/src/Trace.ts` (`StatusUpdate`, `emitStatus`)
- Design spec: `agents/superpowers/specs/2026-07-11-progress-monitor-capability-design.md`
