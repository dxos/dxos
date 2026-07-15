# @dxos/progress

Shared progress primitives: an in-memory progress registry, snapshots, and a
derived-ETA helper. Consumed by `@dxos/pipeline` (its `Progress` Effect service)
and `@dxos/app-toolkit` (the `ProgressRegistry` capability).

## Reference consumer: Gmail sync

`plugin-inbox`'s `syncGmail` operation emits `Trace.StatusUpdate` events
(`progress.key`, `progress.current`, `progress.total`, `message`) during a run. A trace→registry
reducer will project these into `AppCapabilities.ProgressRegistry` for UI
consumers (`MailboxArticle`, R0 popover).

- **Producer** — `packages/plugins/plugin-inbox/src/operations/google/gmail/sync/sync.ts`
- **Trace API** — `packages/core/compute/compute/src/Trace.ts` (`emitStatus`, `StatusUpdate`)
- **Capability wrapper** — `packages/sdk/app-toolkit/src/app-framework/progress-registry.ts`
- **Host** — `plugin-progress` contributes `AppCapabilities.ProgressRegistry`.

Full walkthrough:
`packages/plugins/plugin-inbox/src/operations/google/gmail/sync/README.md`.
