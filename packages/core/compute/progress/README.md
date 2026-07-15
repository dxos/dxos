# @dxos/progress

Shared progress primitives: an in-memory progress registry, snapshots, and a
derived-ETA helper. Consumed by `@dxos/pipeline` (its `Progress` Effect service)
and `@dxos/app-toolkit` (the `ProgressRegistry` capability).

## Reference consumer: Gmail sync

`plugin-inbox`'s `syncGmail` operation is the canonical end-to-end example of
driving a live monitor from a long-running Effect program and surfacing it in
Composer UI:

- **Producer** — `packages/plugins/plugin-inbox/src/operations/google/gmail/sync/sync.ts`
  registers a monitor keyed by `<mailbox-uri>#sync`, sets `total` from enumerated
  message ids, `advance`s per retrieved message, and `remove`s on completion.
- **Capability wrapper** — `packages/sdk/app-toolkit/src/app-framework/progress-registry.ts`
  mirrors the core into reactive atoms (`snapshotAtom`, `monitorAtom`).
- **Host** — `plugin-progress` contributes `AppCapabilities.ProgressRegistry`.
- **Consumers** — `MailboxArticle` (`useProgress` + statusbar `ProgressMeter`);
  `ProgressStatusIndicator` (R0 popover via `useProgressMonitors`).

Full walkthrough (key naming, cancellation, testing):
`packages/plugins/plugin-inbox/src/operations/google/gmail/sync/README.md`.
