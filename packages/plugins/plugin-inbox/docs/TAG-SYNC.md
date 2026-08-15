# Bidirectional tag sync

How a tag applied in Composer reaches the provider, and how a label changed at the provider reaches
the mailbox. Sibling docs: [`PIPELINE.md`](PIPELINE.md) (sync/scan architecture),
[`TASKS.md`](TASKS.md) (ledger), [`TESTING.md`](TESTING.md) (manual test plan).

**Status:** design. Nothing below is built. Supersedes the deliberate deferral recorded in
[`TASKS.md`](TASKS.md) §Phase 1 DECIDED ("Archive is LOCAL-ONLY for now… syncing tags back to Gmail
is P2").

## The gap

Provider → local already works. Gmail's `history.list` yields per-message `labelsAdded` /
`labelsRemoved`, which `collectLabelChanges` folds into one retag per message and
`reconcileToChanges` resolves to an `EmailStage.Retag` keyed by EntityId
(`plugin-google/src/operations/mail/sync/sync-provider.ts`). JMAP re-fetches each `updated` id and
diffs (`jmapReconcile`).

Local → provider does not exist at all. Star a message, archive it (the `inbox` tag coming off), and
the change stays local; a later Gmail sync restores it. The same gap is why `jmapReconcile` treats
keyword tags as **add-only** — it cannot remove a star, because it cannot tell a star the user just
applied from one the provider removed.

The reason is that nothing records local tag mutations. `TagIndex` is a plain
`Record<tagId, objectId[]>` ([`TagIndex.ts`](../../../sdk/schema/src/TagIndex.ts)) with no change
log, and sync writes through the same `Tagging.set` the star button does — so at sync time the two
are indistinguishable.

## Decision: Automerge heads as the reconciliation base

ECHO already keeps a mutation log: the Automerge history under every object. Two public accessors
expose it —

- `Obj.version(obj).automergeHeads` — the object's current frontier ([`Obj.ts:959`](../../../core/echo/echo/src/Obj.ts:959))
- `Obj.getVersion(obj, heads)` — an immutable `Snapshot` of the object at a past frontier ([`Obj.ts:591`](../../../core/echo/echo/src/Obj.ts:591))

so the base state of a three-way merge needs no shadow copy and no second write path. Persist the
heads; read the base back out of history.

### The three states

| State      | Source                                                                            |
| ---------- | --------------------------------------------------------------------------------- |
| **base**   | `Obj.getVersion(tagIndex, savedHeads)` — the index as of the last completed sync  |
| **local**  | the live `tagIndex`                                                               |
| **remote** | base ⊕ the provider delta (Gmail `history.list`; JMAP `Email/changes` + re-fetch) |

### The merge

For every (message, tag) pair over the eligible tag set:

| `local` vs base | `remote` vs base | Result                                      |
| --------------- | ---------------- | ------------------------------------------- |
| unchanged       | unchanged        | nothing                                     |
| unchanged       | changed          | **pull** — the existing retag path          |
| changed         | unchanged        | **push** — `addLabelIds` / `removeLabelIds` |
| changed         | changed, same    | converged; nothing                          |
| changed         | changed, opposed | conflict → **remote wins** (see below)      |

This is `ConnectorSync.mergeField`'s policy at set granularity, deliberately — that function is the
repo's existing three-way merge for external sync
([`ConnectorSync.ts:49`](../../../sdk/app-toolkit/src/types/ConnectorSync.ts:49)) and already
resolves a double-edit remote-wins. Tag sync should not invent a second policy.

### Ordering within a run

**Pull first, then capture heads, then push.** The order is load-bearing:

1. Drain the existing pull pipeline (delta → retag → commit → `Database.flush`).
2. Read `local` and capture `nextHeads = Obj.version(tagIndex).automergeHeads` **at the same
   instant**.
3. Diff base/local/remote; push the local-only changes to the provider.
4. On a fully-drained run, persist `nextHeads` beside the delta token.

Capturing at step 2 rather than at the end of the run is what keeps the two failure modes from
appearing:

- **Capture at end of run** absorbs any tag the user toggled while the run was in flight — it lands
  in the next base without ever being pushed, so it stays local forever and only a double-toggle
  recovers it. A silent lost update.
- **Capture before the pull** makes this run's own pulled tags read as local additions next run,
  which pushes them straight back at the provider they came from.

Capturing immediately after the pull commits and immediately before the push has neither property:
the pull's writes are already in `nextHeads`, and anything the user does after that instant is the
next run's business.

### Worked example

1. Run N: Gmail reports message A as `[INBOX, STARRED]`; local gets `inbox` + `starred`; heads `H1`
   persisted.
2. The user unstars A and archives it in Composer. Local is `{}`; base at `H1` is
   `{inbox, starred}`.
3. Run N+1: the delta reports nothing for A, so remote = base. Base minus local is
   `{inbox, starred}`, so the run pushes `removeLabelIds: [INBOX, STARRED]`. Had Gmail also added
   `IMPORTANT`, remote minus base would be `{important}` and it would pull in the same pass — both
   directions, one traversal.

## Which tags are eligible

**The tags the active provider's label map covers, in reverse.** `syncLabels` already builds
`gmailLabelId → tagUri`; inverting it gives exactly the pushable set, and it needs no new
configuration:

- **Canonical DXOS tags with a provider mapping** — `starred`, `inbox`, `important`, the
  `CATEGORY_*` set — via `GMAIL_SYSTEM_TAGS`. These are `org.dxos.tag`-origin and locally
  toggleable by design ([`Tag.md`](../../../core/echo/echo/src/Tag.md) §Tag origin rule 2), so they
  are the ones that actually change locally.
- **Provider-domain tags** — `com.google.gmail.label` custom labels. Read-only in the UI today
  (rule 1), so they should never diff; included so that a change made through the API still
  converges rather than being silently dropped.

Excluded: user tags (no origin). A user tag has no provider counterpart, and creating a Gmail label
for one is a separate feature with its own naming, deletion and collision questions.

Note the phrasing in the original request — "only sync tags that have the domain of the provider" —
resolves to the _union_ above, not to `com.google.gmail.*` alone: the canonical tags carry
`org.dxos.tag`, and excluding them would leave star and archive unsynced, which is the entire
motivating case.

### Pipeline-applied tags push too — and `spam` has no mapping yet

Eligibility is by tag, not by actor. Anything that applies an eligible canonical tag _between_ syncs
therefore pushes on the next run — notably `ClassifyMailbox` applying `spam` / `promotions` /
`updates`, and any extractor that reaches for a canonical tag. Tags applied _during_ a run (the
known-sender `important` rule in the Gmail provider) do **not** push, because they land before
`nextHeads` is captured and are part of the next base by construction.

**DECIDED: classifier output pushes.** A classification the user can see in Composer should be the
same classification their mail client shows; a local-only verdict is the confusing case, not the
synced one.

That decision creates work, because the mapping it needs does not exist. `GMAIL_SYSTEM_TAGS` covers
`STARRED` / `INBOX` / `IMPORTANT` / `SENT` / `CATEGORY_*` and deliberately omits `SPAM` and `TRASH`
("never synced"). So the canonical `spam` tag — which `ClassifyMailbox` already applies locally — has
no Gmail counterpart to push to. Two consequences:

1. **Adding `SPAM: 'spam'` to the map is bidirectional.** It is read by `syncLabels` for the pull as
   well, so Gmail's own spam verdict starts arriving as the canonical `spam` tag. That is almost
   certainly wanted — the two verdicts should be one tag, which is the whole point of
   `SystemTags` — but it reverses a documented exclusion, so it is a deliberate change and not a
   one-line addition. `TRASH` stays out: deletion is not a tag.
2. **Not every canonical tag pushes through the same call.** `users.messages.modify` refuses to add
   `TRASH` (that is `messages.trash`), and whether it accepts `SPAM` needs verifying against the live
   API — the Gmail connector surfaces "mark spam" as its own operation, which hints it may not be a
   plain label write. So the reverse map cannot be a bare `tagUri → labelId`; it needs a small
   descriptor:

   ```ts
   type ProviderTagBinding =
     | { readonly kind: 'label'; readonly labelId: string }
     | { readonly kind: 'operation'; readonly apply: 'spam' | 'trash' };
   ```

   A `label` binding batches into `batchModify` as described above; an `operation` binding calls the
   dedicated endpoint per message. Verify which bucket `SPAM` falls into in the live test before
   writing the Gmail side (see [Test plan](#test-plan) step 4) — if `modify` accepts it, the
   descriptor collapses to the `label` case for everything except trash, which is out of scope
   anyway.

The same shape covers JMAP when it lands: `$junk` / `$notjunk` are keywords there, so `spam` binds as
a keyword write rather than a folder move.

## Why not the alternatives

- **Shadow `TagIndex` object.** A second write that must land with every tag commit; a crash between
  the two makes the base lie, and the next run pushes a change the user never made. Heads are read
  back off the document after the fact, so they cannot disagree with the data — the worst case is
  staleness, which degrades to re-pushing an already-applied label. Kept as the fallback if heads
  turn out not to resolve reliably (see [Failure modes](#failure-modes)); the diff module takes the
  base as an argument precisely so this is a one-line swap.
- **Outbox / pending-op queue on the binding.** Records exact intent, but sync writes tags through
  the same `Tagging.set` as the user, so every pulled tag enqueues an outbound op unless suppressed
  by actor tagging or a flag. That self-echo is the classic way two-way tag sync ping-pongs. A state
  diff has no such failure mode.
- **A first-class `MutationLog` type.** Genuinely more general — it would carry outbound intent for
  drafts, read state and deletes later. But it is operation-based: it needs exactly-once delivery,
  per-consumer watermarks, compaction, and self-echo suppression, and it does not self-heal — one
  dropped or mis-acked entry diverges permanently, where a state diff re-derives truth every run.
  Not until a second outbound consumer exists.
- **`Cursor.spec.snapshots`.** The established base storage for external sync
  ([`Cursor.ts:178`](../../../core/compute/link/src/Cursor.ts:178)), keyed by foreign id. For tags it
  would mean one snapshot entry per tagged message on the cursor object — unbounded growth of a
  document read on every run — against a single heads array for the whole index.

## Where it runs

Inside `runMailSync` ([`sync/mail-sync.ts`](../src/sync/mail-sync.ts)), as a phase after the merged
pull stream drains and `Database.flush` completes. One operation, one cursor, one lock, and the
existing `runAgain` machinery already bounds the run.

The provider seam gains one optional hook alongside `prepare`:

```ts
interface MailSyncProviderService {
  /**
   * Applies local tag changes at the provider. Absent for a provider with no write path, which
   * degrades the run to pull-only rather than failing it.
   */
  readonly pushTags?: (ops: readonly TagPushOp[]) => Effect.Effect<void, MailSyncError>;
}
```

`TagPushOp` is `{ foreignId, add, remove }` where each entry is a `ProviderTagBinding` (see
[the mapping section](#pipeline-applied-tags-push-too--and-spam-has-no-mapping-yet)) resolved from
the reverse label map by the harness — so the diff itself stays provider-agnostic, and a tag whose
push needs a dedicated endpoint rather than a label write is expressible.

The diff is a pure module — `(base, local, remote, eligible) → { push, pull }` over plain
`Map<string, Set<string>>` — with no ECHO, no provider and no Effect in it. That is what makes it
unit-testable without a database, reusable by any container owning a `TagIndex` (Calendar's starred
events), and swappable onto a shadow base.

### Bounding

Push ops are capped per run (`maxTagOps`) and grouped by identical add/remove sets so Gmail
`batchModify` carries up to 1000 message ids per call. **`nextHeads` is persisted only when the
push fully drained**; a truncated push requests `runAgain` and leaves the base where it was, so the
remainder re-diffs next run. The cost of that rule is that a truncated run re-pushes what it already
pushed — idempotent at both providers, so it converges.

### First sync

No `savedHeads` → no base → **push nothing**, capture heads, done. Without this rule a mailbox that
had been tagged locally before ever being connected would push its entire tag state at the provider
on first sync.

## Failure modes

| Condition                                                            | Behaviour                                                                                                                                                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `savedHeads` do not resolve (compaction, epoch, fresh replica)       | `A.view` throws; catch, log, **re-baseline** — capture current heads and push nothing this run. Costs one local change; never pushes a fabricated diff.                                                                |
| No usable delta token (first tick, or the 404 `clearToken` fallback) | Remote state is unknown. Fetch `labelIds` for the locally-changed messages only — a bounded set — rather than skipping the push and stranding the change.                                                              |
| Concurrent host + edge runs on one mailbox                           | Both diff the same base and push the same ops. Idempotent at the provider; the later heads write wins. `withMailboxLock` is in-process only and does not cover this — the idempotence is the mitigation, not the lock. |
| Push succeeds, run dies before heads are persisted                   | Next run recomputes the same diff and re-pushes. Converges.                                                                                                                                                            |
| Provider rejects one op (message deleted, 404)                       | Log and drop that op; do not fail the run. A deleted message has no tags to reconcile.                                                                                                                                 |

## Provider work

**Gmail.** `GoogleMailApi` has no write path for labels — `listLabels`, `listMessages`, `getMessage`,
`getProfile`, `listHistory`, `getAttachment`, `sendMessage`, `trashMessage`, and nothing else. Add
`modifyMessage` and `batchModify` (`users.messages.modify`, `users.messages.batchModify`) to the
service, the `Live` layer, and `GoogleMailApi.mock` — the mock must hold mutable per-message label
state so a test can assert what was pushed and so a subsequent `listHistory` reflects it.

Add `SPAM: 'spam'` to `GMAIL_SYSTEM_TAGS` and update its doc comment, which currently states that
`TRASH`/`SPAM` are never synced. Verify whether `modify` accepts `SPAM` in `addLabelIds`; if it does
not, `spam` binds as an `operation` rather than a `label` and needs the dedicated endpoint.

Scope note: `gmail.modify` is required on the OAuth token. Confirm the connector already requests it
before the live test.

**JMAP.** Out of scope for the first cut. The seam is optional, so JMAP simply does not implement
`pushTags` and keeps its add-only keyword behaviour; the comment in `jmapReconcile` that defers this
("until we write local flags back to the provider") stays accurate until it does.

Trash stays out of scope entirely — deletion is not a tag, `trashMessage` already exists as its own
operation, and `TRASH` stays absent from the label map.

## Test plan

TDD, in this order. Each layer is a gate for the next.

1. **Pure diff unit tests** — no database, no provider. Table-driven over the merge matrix above:
   local-only add, local-only remove, remote-only add/remove, converged double-add, opposed
   conflict, ineligible tag ignored, empty base (first sync) pushes nothing.
2. **Mock-provider sync tests** (`sync.test.ts` alongside the existing suite) — seed a mailbox via
   `seedGmailBinding`, sync, toggle a tag locally, sync again, assert the mock recorded the expected
   `batchModify`. Then the reverse: mutate the mock's label state, sync, assert the local `TagIndex`.
   Then the conflict case, and a crash-between-push-and-heads case asserting convergence.
3. **Heads-resolution test** — persist heads, mutate, assert `Obj.getVersion` returns the pre-mutation
   set; and an unresolvable-heads case asserting the re-baseline path pushes nothing.
4. **Live Gmail test**, env-gated on `GOOGLE_ACCESS_TOKEN` (the gate `sync-e2e.test.ts` already
   uses). Round trip both directions against a real account: change a label through the Gmail API,
   sync, assert local tags; toggle locally, sync, read the label back through the API. This is also
   where `SPAM`'s binding is settled — assert whether `modify` accepts it in `addLabelIds` before the
   Gmail push path is written against the assumption that it does.

## Open decisions

1. ~~**Do pipeline-applied canonical tags push?**~~ **DECIDED 2026-08-15: yes.** A classification the
   user sees in Composer should be the one their mail client shows. Follow-on work is real, though:
   `spam` has no Gmail mapping today and `GMAIL_SYSTEM_TAGS` documents `SPAM` as never synced, so
   adding it is a deliberate bidirectional change — see
   [the mapping section](#pipeline-applied-tags-push-too--and-spam-has-no-mapping-yet).
2. **Conflict policy** — remote-wins is assumed above for consistency with `ConnectorSync.mergeField`.
   The alternative worth considering is local-wins for canonical toggles specifically, on the grounds
   that a star the user just applied is a more recent and more explicit act than a delta.
3. **JMAP in this change or a follow-up** — assumed follow-up.
4. **Live-test account** — which Gmail account the gated test runs against, and whether the token
   carries `gmail.modify`.
