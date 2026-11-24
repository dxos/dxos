# Handoff: connector sync never runs (PR #12549)

## What you're picking up

On branch `claude/routine-form-create-dialogue-l0h5pw` (PR dxos/dxos#12549), the account-level
connector sync does not run. Two reproductions, both from a Gmail-backed Mailbox:

1. **No automatic first sync.** Connect a Google account. A Mailbox is materialized and bound, the
   seeded create-routine dialog opens, you Save it — no sync runs.
2. **No manual sync.** Press the Mailbox's Sync toolbar button. If the account has no sync Routine
   the dialog is offered; saving it runs nothing. Pressing Sync again on a mailbox that now _has_ a
   routine also runs nothing.

CI is green. The failure is entirely at runtime, and the previous session could not exercise the app
(cloud sandbox, no browser against a real Google account). Everything below was established by
reading code plus one console screenshot from the user.

## Confirmed from the console

```
GET  https://main.dxos.network/triggers/B2F4QXDRNSQNNH7ZB4YIH8VKYTZBWKH7X   401 (Unauthorized)
POST https://main.dxos.network/functions/B2F4…/triggers/crons/01M0AAK78AKR30DDTG2FQJFDXM/run
                                                                            404 (Not Found)
edge force-run failed; retrying { triggerId: '01M0AAK78AKR30DDTG2FQJFDXM',
                                  error: EdgeCallFailedError: Trigger not found }
```

So the trigger **is** being fired — the client reaches EDGE and EDGE rejects it. The sync operation
never starts, which is why nothing appears anywhere: no progress meter, no run in the routine's Runs
companion, no error toast.

The `401` on `GET /triggers/{spaceId}` is probably the more informative line. That's
`EdgeTriggerManager`'s 15s status poll, and it says this client is not authorized to read that
space's triggers on EDGE at all. A space EDGE cannot read is a space whose triggers it cannot
register, which would explain the `404` on the force-run.

## Why it goes to EDGE at all

`packages/plugins/plugin-inbox/src/sync/policy.ts`:

```ts
export const MAIL_SYNC_CRON = '*/10 * * * *';
export const MAIL_AUTO_SYNC = true;
export const MAIL_REMOTE_SYNC = true; // ← mailbox sync routines are remote
```

`MAIL_REMOTE_SYNC` makes the scaffolded trigger `remote: true`, so
`TriggerMonitor.invokeTrigger` (`packages/core/compute/compute-runtime/src/TriggerMonitor.ts:112`)
routes to the remote manager instead of the local dispatcher:

```ts
invokeTrigger: (options) =>
  options.trigger.remote === true
    ? remote.invokeTrigger(options)
    : dispatcher.invokeTrigger({ trigger: options.trigger, event: options.event }).pipe(Effect.asVoid),
```

`EdgeTriggerManager.invokeTrigger` (`packages/core/compute/edge-compute/src/EdgeTriggerManager.ts:98`)
maps that onto `forceRunCronTrigger(ctx, spaceId, trigger.id)`, retries every failure on
`REPLICATION_BACKOFF` (exponential from 1s, 5 times, ~31s total), then `Effect.orDie`s.

All three of these predate the PR — `MAIL_REMOTE_SYNC`, the routing, and the backoff are on `main`.
`main`'s `runSync` also created-then-fired a trigger (`ensureTrigger` + `fireTrigger`), so pressing
Sync on `main` should hit the same EDGE path. **Worth confirming early**: if Sync works on `main`
with the same account and space, my read is wrong somewhere and the difference is in the branch.

## The call chain (branch code)

Manual sync, from the toolbar action:

- `packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:489` — `Binding.sync(mailbox)`
- `Binding.sync` — `packages/plugins/plugin-connector/src/Binding.ts:657` — resolves the binding +
  connector, calls `syncOrOfferRoutine` with `priority: cursor.id`
- `Binding.syncOrOfferRoutine` — `Binding.ts:571` — calls `runSync`; on `SyncRoutineMissingError`
  opens the seeded create-routine dialog with an `onCreateObject` that calls `syncCreatedRoutine`
- `Binding.runSync` — `Binding.ts:511` — `findTrigger(connection)`, then
  `fireTrigger(trigger, priority ? { priority } : undefined)`
- `Binding.fireTrigger` — `Binding.ts:297` — `monitor.invokeTrigger({ trigger, event })`
- `Binding.syncCreatedRoutine` — `Binding.ts:625` — reads the trigger off the just-saved Routine via
  `triggerOfRoutine` (not a query — the reverse-ref index lags the write) and fires it

Connect flow:

- `connector-coordinator.ts:272` — `bound?.needsSyncRoutine` → `openCreateSyncRoutineDialog`
  (`:176`), whose `onCreateObject` also calls `syncCreatedRoutine`
- `connector-coordinator.ts:277` — else branch → `autoSyncConnection`, which is gated on
  `connector.sync?.auto` and calls `runSync`

Note the two branches are exclusive: on the dialog path `sync.auto` is deliberately not consulted,
because the user's Save _is_ the ask. So "auto sync didn't fire" on a fresh connection is expected
to be served by the dialog's `onCreateObject`, not by `autoSyncConnection`.

Once a run does start, everything funnels into `Binding.syncAll` (`Binding.ts:395`), which loads the
connection from `input.connection`, queries its `Cursor` bindings, and fans out at concurrency 2 with
the pressed binding sorted first.

## Ruled out (don't re-litigate)

- **`Query.referenceAt` / nested-ref hop.** Removed from core echo; the local hop lives in
  `plugin-routine/src/util/routines-for-object.ts`. Unrelated.
- **The `draft` → `AddObject` change in `plugin-routine/src/capabilities/create-object.ts`.**
  `AddObject` returns `{ id, subject, object }`, the same shape `CreateRoutine` returned, and
  `CreateRoutine` itself ended in `AddObject` on `main` too. `CreateObjectDialog.handleCreateObject`
  reads `result.subject` / `result.object` and then calls the caller's `onCreateObject` — verified
  intact at `plugin-space/src/containers/CreateObjectDialog/CreateObjectDialog.tsx:208`.
- **`trigger.input` being wiped by the form.** `wireTriggers`
  (`plugin-routine/src/util/wire.ts`) preserves `input` for the runnable case, and
  `applyTriggerValues` (`TriggerEditor.tsx:184`) only writes `spec` / `enabled` / `remote`. The
  `{ connection, priority }` template survives a form round-trip.
- **The `Invalid DXN [objectId]` console errors.** Fixed in `00ca0bc9`. Real bug (the draft's
  `Ref.fromURI(operation.meta.key)` runnable ref is not an entity id, and `lookupRef`'s off-database
  branch asserted it was), but it's a read-path crash in the form, not the sync. It is _not_ the
  cause — the user confirmed sync still fails with it fixed.
- **Deployed EDGE expecting the old `{ binding }` input.** I floated this and it's wrong: the run
  404s before any handler is reached. Keep it in your back pocket for _after_ the 404 is solved,
  since the operation keys are unchanged while the input contract changed from
  `{ binding: Ref<Cursor> }` to `ConnectorSpec.SyncInput` = `{ connection, priority? }`.

## Where I'd start

1. **Settle whether this is environmental.** Does `GET /triggers/{spaceId}` 401 for _any_ space in
   this profile, or just this one? Does any other remote trigger in the space run? If EDGE can't see
   the space, no amount of branch code fixes it — check identity/account association and whether the
   space is replicated to EDGE.
2. **Test the local path in isolation.** Set `MAIL_REMOTE_SYNC = false` in
   `plugin-inbox/src/sync/policy.ts`, delete the existing sync routine, redo the flow. If the sync
   runs locally, the branch logic is sound and the whole problem is EDGE reachability. If it _still_
   doesn't run, the bug is in the branch and the trail continues into `syncAll` — put a breakpoint at
   `Binding.ts:397` and check whether `connectionRef.isAvailable` is true and whether `cursors` is
   non-empty (a silent `{ synced: 0, outputs: [] }` return with a `sync skipped: connection is not
resolvable` warning is the failure mode to watch for).
3. **Check `triggersDisabled`.** `space.properties.triggersDisabled` is the space-wide kill switch
   (UI: space settings → Routines → "Enable triggers",
   `plugin-routine/src/containers/RoutineSettings/RoutineSettings.tsx`). Default is enabled, but rule
   it out.
4. **Check whether the fire even happens on the second press.** On a mailbox that already has a
   routine, `runSync` goes `findTrigger(connection)` → `fireTrigger`. `findTrigger` (`Binding.ts:237`)
   is a reverse-ref query from the connection filtered to `!!trigger.spec`. If the routine's trigger
   lost its `spec`, or references something other than the connection, `findTrigger` returns
   undefined and you'd get the dialog again rather than a fire. The user reports no dialog on the
   second press, which implies the trigger _is_ found and fired — consistent with the 404.

## Known gaps in the branch (real, but not this bug)

1. **A remote trigger's fire event is dropped.** `forceRunCronTrigger(ctx, spaceId, triggerId)` takes
   no payload, so the `DirectEvent` carrying `priority` never reaches EDGE and
   `priority: '{{event.data.priority}}'` resolves to `undefined` on every remote run. Pressed-first
   ordering is therefore inert for every mailbox. Documented with a TODO on `fireTrigger`; fixing it
   means changing the EDGE endpoint.
2. **A failed force-run is invisible to the user.** It now logs (`7a3c5dfd` added `catchDefect` at
   all three `onCreateObject` fork sites, since `Effect.orDie` means `Effect.catch` alone misses it),
   but nothing surfaces in the UI. An open proposal, undecided by the user: toast on force-run
   exhaustion, and optionally fall back to a local run for a _manual_ sync while leaving the schedule
   remote.

## Ground rules on this repo

Read `CLAUDE.md`. The ones that bite: never create/rename/switch branches or worktrees; no casts
(`as any`, `as unknown as T`, non-null `!`) to satisfy the type-checker; never suppress unhandled
errors to go green; run `pnpm format` before every commit (CI fails on one unformatted file);
account for every modified file before committing. Build/test via `pnpm exec moon run <pkg>:<task>`
(`moon` and `gh` are not on `PATH` in the cloud sandbox; on a local machine plain `moon` works).
Lint reports unused imports as _warnings_ that still fail the task — check the exit code, don't grep
for "error".
