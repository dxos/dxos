# QA — Findings

Rationale behind the items in [TASKS.md](TASKS.md). One section per investigation.

> HTML rendering (the `HtmlViewer`/`Html` dark-mode, dialect, and prior-art analysis) moved to
> [`packages/ui/react-ui-components/src/components/HtmlViewer/DESIGN.md`](../../../packages/ui/react-ui-components/src/components/HtmlViewer/DESIGN.md),
> next to the code it describes.

## 1. Mailbox "Sync" routine with no visible Operation

**Not a failed creation.** `createSyncRoutine`
(`plugin-connector/src/util/sync-routine.ts:84`) deliberately makes a Routine named
`Sync` with `spec: { kind: 'runnable', runnable: Ref.fromURI(operation.meta.key) }`. The
cron is `MAIL_SYNC_CRON = '*/10 * * * *'` (`plugin-inbox/src/capabilities/connector.ts:32`),
declared as `sync.trigger` on both the Gmail and JMAP connectors. Binding by registry key
is intentional: the operation is statically defined and already in the registry, so
nothing is persisted into the space (asserted in `sync-routine.test.ts`).

**Ruled out as the cause of the empty field** (verified by serializing the real
operation):

- URI mismatch — the stored ref uri and the picker option id
  (`Entity.getURI(persisted, { prefer: 'named' })`) are both
  `dxn:org.dxos.plugin.inbox.operation.googleMailSync`. `findRefOption` matches keyed
  entities by direct URI equality, so this resolves.
- The visibility filter in `getOperationOptions` — both `GoogleMailSync` and `JmapSync`
  are `.pipe(Operation.visible)`.
- `Operation.serialize` throwing (registry-sync silently skips unserializable schemas) —
  it serializes cleanly.
- `withHandler` / `opaqueHandler` dropping meta annotations — both preserve `meta`.

**Still open.** Whether `Scope.registry()` returns the operation when the form renders
(`useOperations`, `RoutineForm.tsx:280`). The registry is populated imperatively by
plugin-routine's `registry-sync` capability from `Capabilities.OperationHandler`; settling
that needs the running app, not static reading.

**Adjacent question.** `RefField` renders nothing at all only when readonly/static with no
match (`RefField.tsx:206`); otherwise it shows an empty picker. An editable-but-empty
picker on a system-managed routine invites the user to overwrite the binding — worth
deciding whether that form should be readonly for connector-owned routines.
