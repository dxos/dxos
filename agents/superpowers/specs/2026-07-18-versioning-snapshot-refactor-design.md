# Versioning: functional snapshot + branch-accessor refactor — design & estimate

Follow-up to PR #12256, capturing @dmaretskyi's review. Two API-shape changes to the ECHO-core
versioning mechanism, plus a terminology fix. No behaviour change the user sees; a large internal
simplification.

## Motivation (from review)

1. **Time travel is a stateful pin on the live object.** `ObjectCore.setTimeTravel(heads)` mutates the
   object's read-mode so _every_ subscriber resolves historical data, which forces the dual
   notification channels (`updates`/`displayUpdates`, `LatestEventId`, `latestOnly`, `withLatestRead`)
   to stop side-effecting subscribers from acting on scrubbed data. Review point (#2/#4): a functional
   `Obj.getVersion(obj, heads) → Snapshot` returning a _detached immutable instance_ eliminates all of
   that — the historical view is scoped to the surface that asks for it, which is also the correct
   product behaviour (viewing an old revision in the editor must not rewind the doc's title in the
   sidebar/tabs/backlinks). The markdown editor already renders a detached snapshot.
2. **Two overlapping branch concepts.** `getCurrentBranch(objectId)` and `BranchBinding.branch` both
   answer "what branch is this on". Review point (#5/#6): collapse into one accessor
   `Obj.getBranch(obj)`.
3. **"per-surface" is UI jargon at the core layer.** Review point (#7): the correct term is
   "independent instance"; document the two branch models (device-global _checkout_ vs _independent
   instance_).

## Change A — functional snapshot; retire the pin

**Add** `Obj.getVersion(obj, heads): Obj.Snapshot` (`@dxos/echo`) — pure, built on the existing
`checkoutVersion` / `A.view`; returns a detached snapshot (no core state).

**Remove** (once no consumer pins):

- `echo-client/core-db/object-core.ts`: `setTimeTravel` / `clearTimeTravel` / `isTimeTraveling` /
  `#timeTravelHeads` / `#timeTravelView` / the `#getReadDoc` pin branch.
- `echo-client/echo-handler/time-travel.ts`: the `setTimeTravel`/`clearTimeTravel` driver exports
  (keep `getEditHistory`, `getEditHistoryWithDiffs`, `checkoutVersion`).
- `echo` dual-channel machinery: `displayUpdates`, `LatestEventId`, `latestOnly` option,
  `withLatestRead`/`latest-read-context.ts`, `Entity.timeTravelAtom` / `Entity.isTimeTraveling`,
  the `TimeTravelingId` accessor. Touch points: `Obj.ts`, `Entity.ts`, `internal/Obj/atoms.ts`,
  `internal/Obj/time-travel.ts`, `internal/common/proxy/{change-context,latest-read-context,symbols,
reactive}.ts`, `echo-handler/{echo-handler,echo-proxy-target,echo-prototypes}.ts`.

**Update consumers:**

- `@dxos/versioning` `internal/model.ts`: `Version.view`/`clearView` → return an `Obj.getVersion`
  snapshot (the caller renders it) instead of pinning; `contentAt` reads the snapshot; `restore`
  reads historical content via `getVersion`. The `createCheckpoint` tip-guard (`Entity.isTimeTraveling`)
  is dropped — with no pin the live object is always at its tip, and the "don't checkpoint while
  viewing a revision" intent is already enforced in the UI (disabled button). Update `model.test.ts`.
- `plugin-markdown` `useVersioning.ts` / `MarkdownArticle.tsx`: drop the `Version.view` pin
  effect; the editor already renders `checkpointContent` (a snapshot). Any label/companion that
  relied on the pin re-renders from the shared `VersioningState` selection atom (unchanged hand-off).
- Tests: `echo-client/echo-handler/time-travel.test.ts` rewrites to assert `Obj.getVersion` returns a
  correct detached snapshot (no pin/reactivity assertions).

## Change B — unify the branch accessor

- **Add** `Obj.getBranch(obj): string` (`@dxos/echo`): the branch an instance is bound to — the
  device-current branch for the canonical object, the bound branch for a `db.branch()` instance.
- **Change** `db.branch(obj, name)` return `BranchBinding = { object, branch, dispose }` →
  `{ object, dispose }` (name read via `Obj.getBranch(object)`).
- **Replace** `Database.getCurrentBranch(objectId: string)` with `Obj.getBranch(obj)`. Update callers:
  `entity-manager.ts`, `branching.ts`, `proxy-db/database.ts`, `plugin-comments/extensions/threads.ts`,
  and the branching/binding tests. (`entity-manager` keeps an internal `objectId → branch` map;
  `Obj.getBranch` resolves through it.)

## Change C — terminology & docs

- Rename "per-surface" → "independent instance" in code JSDoc (`Database.ts` `BranchBinding`,
  `entity-manager.ts` `bindCoreToBranch`). (VERSIONING.md already updated.)

## Migration / compatibility

Internal API only; no persisted-data change and no protocol change. `Obj.getVersion` /
`Obj.getBranch` are additive; the pin + dual-channel removal is pure deletion once consumers move to
snapshots. Product behaviour is unchanged (the editor already snapshots; other surfaces stop rewinding,
which is the intended fix).

## Risks

1. **Reactivity-layer deletion is broad.** `latestOnly`/`withLatestRead`/`LatestEventId` thread through
   `Obj.subscribe`/`Entity.subscribe` and the atom families. Removing them must not change the default
   (non-versioning) subscription path — it shouldn't, since without a pin every read is already
   "latest". Full `@dxos/echo` + `@dxos/echo-client` test runs gate this.
2. **A snapshot is inert.** If any surface genuinely needs _reactive_ historical viewing on the live
   object (scrub while the doc advances remotely), that's lost. None found in the markdown use case;
   confirm before deleting.
3. **`getVersion` on a subtree.** References are independent cores; `getVersion` snapshots one object.
   A subtree snapshot (doc + child Text) needs per-member snapshots — matches how time-travel was
   applied per object today.

## Estimate

| Area                                                                              | Effort                 |
| --------------------------------------------------------------------------------- | ---------------------- |
| `Obj.getVersion` + `Obj.getBranch` (add)                                          | ~0.5d                  |
| Delete pin + dual channels; keep default subscription path green                  | 1.5–2d                 |
| `@dxos/versioning` rewire + tests                                                 | ~1d                    |
| plugin-markdown (`useVersioning`/`MarkdownArticle`) + comments `getCurrentBranch` | ~0.5–1d                |
| Terminology + full test sweep                                                     | ~0.5d                  |
| **Total**                                                                         | **~4–5 engineer-days** |

Sequencing: land #12256 as the minimal core (current pin design) _or_ apply this on #12256 to land the
snapshot design once — a call for the reviewer/author. Either way, do Change A and Change B as
separate commits; A is the risky one.
