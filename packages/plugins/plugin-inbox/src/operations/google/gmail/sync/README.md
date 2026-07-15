# Gmail sync and the progress registry

Gmail sync is the reference consumer of `AppCapabilities.ProgressRegistry`: a
long-running operation publishes live progress keyed by mailbox, and the mailbox
article (plus the global R0 status indicator) subscribe reactively.

## Architecture

```
syncGmail (producer)
  │  Capability.get(ProgressRegistry)
  │  register(<mailbox-uri>#sync, { label, onCancel })
  │  total / advance / done|fail|note / remove
  ▼
createProgressRegistry (app-toolkit)
  │  @dxos/progress core + snapshotAtom (Atom.keepAlive)
  ▼
Consumers
  ├── MailboxArticle — useProgress(key) → Panel.Statusbar <ProgressMeter/>
  └── ProgressStatusIndicator (plugin-progress) — useProgressMonitors() popover
```

| Layer | Package | Role |
| --- | --- | --- |
| Core | `@dxos/progress` | In-memory `ProgressApi`: `task`, `advance`, `total`, `done`, `fail`, `remove` |
| Capability | `@dxos/app-toolkit` | `createProgressRegistry`: mirrors core into reactive atoms |
| Host | `@dxos/plugin-progress` | Always-on contributor of `AppCapabilities.ProgressRegistry` |
| Producer | `plugin-inbox` / `syncGmail` | Registers a per-mailbox monitor for each run |
| Consumer | `MailboxArticle` | Inline statusbar meter for the open mailbox |
| Consumer | `ProgressStatusIndicator` | R0 rail popover listing all active monitors |

## Progress key

Each mailbox gets a stable monitor name so producer and consumer agree without
passing handles across the operation boundary:

```ts
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) =>
  Obj.getURI(mailbox).toString() + '#sync';
```

The `#sync` suffix lets other mailbox-scoped monitors coexist on the same URI
(e.g. `#topics` for topic analysis). `MailboxArticle` subscribes to both and
prefers the topics monitor when it is `running` or `error`.

## Producer lifecycle (`syncGmail`)

1. **Resolve registry** — `Capability.get(AppCapabilities.ProgressRegistry)`.
   The always-loaded `plugin-progress` host contributes a singleton; tests
   inject one via `inboxSyncTestServices`. Absence is treated as a wiring bug
   (`Effect.orDie`), not a typed operation failure.

2. **Register** — at the start of a run, before the fetch pipeline:

   ```ts
   const progressMonitor = progressRegistry.register(createSyncProgressKey(mailbox), {
     label: mailbox.name ?? 'Mailbox',
     onCancel: () => controller.abort(),
   });
   ```

   `register` drops any prior entry for the same name so a retry after failure
   starts fresh (no stale `current` / `error`).

3. **Set total** — as each date chunk's message ids are enumerated (before full
   fetches), `addToTotal` accumulates the count and calls
   `progressMonitor.total(totalToRetrieve)`. Chunks enumerate serially and
   always before their ids reach the fetch stage, so `total` leads `current` and
   the meter renders a determinate bar.

4. **Advance** — once per retrieved message (full Gmail API fetch), via
   `fetchMessages({ onRetrieved: () => progressMonitor.advance(1) })`.
   Counting at retrieval (not at commit or after dedup) keeps `current` aligned
   with `total` even when downstream stages drop messages.

5. **Abort** — `onCancel` aborts an `AbortController` wired into the pipeline
   via `Pipeline.abortWith`. On abort the run drains without error; the monitor
   gets `note('Cancelled')`.

6. **Complete** — on success: `done()` then `remove()`. On failure:
   `fail('Sync failed')` (short UI message; full error stays in logs). Monitors
   are transient per-run entries, not resumable task lists.

## Consumer wiring (`MailboxArticle`)

```ts
const syncProgress = useProgress(createSyncProgressKey(mailbox));
const progressRegistry = useOptionalCapability(AppCapabilities.ProgressRegistry);

// Statusbar — shown while running or in error
<ProgressMeter
  state={progress}
  onCancel={progressRegistry ? () => progressRegistry.cancel(progress.name) : undefined}
/>
```

`useProgress` reads `registry.monitorAtom(name)`, a derived selector memoized per
name. When `plugin-progress` is absent (storybook, minimal app), hooks degrade
to `undefined` rather than throwing.

The R0 `ProgressStatusIndicator` reads the aggregate `snapshotAtom` via
`useProgressMonitors()` and calls `registry.cancel(monitor.name)` from each row.

## Cancellation flow

```
User clicks cancel on ProgressMeter
  → progressRegistry.cancel(name)
  → core invokes registered onCancel
  → controller.abort()
  → Pipeline.abortWith drops further messages; stream drains
  → progressMonitor.note('Cancelled'); progressMonitor.remove()
```

## Testing

`sync.test.ts` asserts the monitor advances during a run and is removed on
success. The harness (`inboxSyncTestServices`) contributes a
`ProgressRegistry` via `CapabilityManager`, matching production's singleton
`Capability.get` resolution. Override with `createProgressRegistry(registry)` to
subscribe to `snapshotAtom` and observe `current` as the run progresses.

## Related

- Design spec: `agents/superpowers/specs/2026-07-11-progress-monitor-capability-design.md`
- Core primitives: `packages/core/compute/progress/README.md`
- Capability factory: `packages/sdk/app-toolkit/src/app-framework/progress-registry.ts`
