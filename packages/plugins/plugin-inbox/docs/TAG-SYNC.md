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
| changed         | changed, opposed | conflict → resolved by tag origin, below    |

The first four rows are `ConnectorSync.mergeField` at set granularity
([`ConnectorSync.ts:49`](../../../sdk/app-toolkit/src/types/ConnectorSync.ts:49)), the repo's existing
three-way merge for external sync.

### Conflict resolution: the owner wins

`mergeField` resolves a double-edit remote-wins unconditionally. Tag sync **diverges on that one
row**, because unlike an arbitrary connector field, a tag already has a declared owner:

| Tag origin                                     | Winner     | Why                                                                                                                           |
| ---------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| canonical (`org.dxos.tag`) — starred, inbox, … | **local**  | Applied and removed locally by design; a star or an archive the user just performed is a recent, explicit, user-authored act. |
| provider (`com.google.gmail.label`)            | **remote** | Read-only in the app; sync owns both the tag and its membership, so there is no local act to defend.                          |

This is not a second policy invented for tags — it is
[`Tag.md`](../../../core/echo/echo/src/Tag.md) §"Tag origin" applied to the conflict case. That table
already says who may change what: canonical tags stay locally toggleable (rule 2), foreign provider
tags are sync's to decide (rule 1). Resolving a conflict any other way would contradict the ownership
model the rest of the tag system is built on — remote-wins on a canonical tag means the app reverts a
toggle it told the user was theirs.

The predicate is the existing `Tag.isProviderTag(tag)`, so no new classification is introduced.

The residual cost, stated plainly: a star removed on another device is resurrected by an unsynced
local star, because "both changed" cannot distinguish which act was later. Bounded by one sync
interval, and the alternative — reverting a toggle the user just made in front of them — is the worse
of the two surprises. Timestamped last-writer-wins would resolve it properly and is tracked as
follow-up work (see [Open decisions](#open-decisions)).

### Ordering within a run

**Pull first, then capture heads, then push.** The order is load-bearing:

1. Drain the existing pull pipeline (delta → retag → commit → `Database.flush`).
2. Read `local` and capture `nextHeads = Obj.version(tagIndex).automergeHeads` **at the same
   instant**.
3. Diff base/local/remote; push the local-only changes to the provider.
4. Persist `nextHeads` beside the delta token — but only if the push fully drained with nothing
   `pending` (see [What an op's outcome does to the base](#what-an-ops-outcome-does-to-the-base)).

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

One thing this ordering does _not_ resolve on its own: a tag written by **local logic** during the
same window — the known-sender rule, an on-arrival extractor — is also inside `nextHeads`, and would
be stranded if left there unpushed. The per-run base overlay for newly-inserted messages is what
separates those from the pull's own writes; see
[Pipeline-applied tags](#pipeline-applied-tags-push-too--and-spam-has-no-mapping-yet).

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
`updates`, and any extractor that reaches for a canonical tag.

Tags applied _during_ a run need care, because two different things happen there and only one of them
must stay local:

1. **Tags the pull wrote**, mirroring what the provider already has. These must never push — they
   came from there.
2. **Tags local logic wrote at insert time**, which the provider has never seen: the known-sender
   `important` rule in the Gmail provider, and any on-arrival extractor. These _are_ local intent and
   must push, by the same reasoning that makes `ClassifyMailbox`'s output push.

Both land before `nextHeads` is captured, so "written during the run" cannot separate them — and
treating the whole class as non-pushing would strand (2) permanently: it would sit in `base` and
`local` from the next run onward, so no diff would ever emit it.

The separation is available without tracking actors, because the run knows each new message's remote
state exactly — the `labelIds` it just fetched. So **a message inserted this run enters the diff with
its base seeded from that remote state**, not from its post-commit local state:

| Tag on a newly-inserted message | In seeded base? | Result   |
| ------------------------------- | --------------- | -------- |
| From the provider's `labelIds`  | yes             | no push  |
| Added locally at insert time    | no              | **push** |

Mechanically, `base` is the heads snapshot overlaid with `{ newMessageId: remoteTagsAtFetch }` for
this run's inserts. The overlay is per-run and in-memory — nothing extra is persisted — and it exists
only because a brand-new message has no history in the heads snapshot to diff against.

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
   *
   * Never fails the run: a provider reports per-op outcomes and the harness decides what that means
   * for the base. The effect's error channel is reserved for a fault that aborts the whole push
   * (auth revoked, network down), which is reported as `{ settled: [], pending: <all ops> }`.
   */
  readonly pushTags?: (ops: readonly TagPushOp[]) => Effect.Effect<TagPushResult, MailSyncError>;
}

type TagPushResult = {
  /** Ops that reached a terminal state — applied, or permanently rejected. Safe to advance past. */
  readonly settled: readonly TagPushOp[];
  /** Ops that failed transiently and must be retried on a later run. */
  readonly pending: readonly TagPushOp[];
};
```

`TagPushOp` is `{ foreignId, add, remove }` where each entry is a `ProviderTagBinding` (see
[the mapping section](#pipeline-applied-tags-push-too--and-spam-has-no-mapping-yet)) resolved from
the reverse label map by the harness — so the diff itself stays provider-agnostic, and a tag whose
push needs a dedicated endpoint rather than a label write is expressible.

### What an op's outcome does to the base

The split above exists because "the push drained" and "every op succeeded" are different questions,
and only the first may advance `nextHeads`:

| Outcome                                                                     | Classification | Rationale                                                                                                                                                                            |
| --------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Applied                                                                     | `settled`      | Local and remote now agree.                                                                                                                                                          |
| Permanent rejection — message deleted (404), label gone, insufficient scope | `settled`      | No retry can succeed. Advancing past it is the only terminating choice; the local tag stays as the user left it and simply never reaches the provider. Logged at `warn` with the op. |
| Transient — 429, 5xx, timeout                                               | `pending`      | Retrying is expected to succeed.                                                                                                                                                     |

**`nextHeads` is persisted only when `pending` is empty** (and the cap was not hit). A run with any
pending op leaves the base where it was and requests `runAgain`, so the whole diff — including the
ops that did settle — recomputes next run. Re-pushing a settled op is a no-op at both providers, so
the duplication is the acceptable half of the trade; the alternative, advancing past a transient
failure, would silently drop the change.

Retry is therefore **between runs, not inside `pushTags`** — no in-effect retry loop, no backoff
state to own. The operation layer already re-runs, and a bounded per-run push keeps each invocation
short.

The diff is a pure module — `(base, local, remote, eligible) → { push, pull }` over plain
`Map<string, Set<string>>` — with no ECHO, no provider and no Effect in it. `eligible` is
`Map<tagUri, { owner: 'local' | 'remote' }>` rather than a bare set: it carries both which tags
participate and who wins a conflict on each, so the caller resolves `Tag.isProviderTag` once and the
diff itself needs no notion of tag origin. That is what makes it unit-testable without a database,
reusable by any container owning a `TagIndex` (Calendar's starred events), and swappable onto a
shadow base.

### Bounding

Push ops are capped per run (`maxTagOps`) and grouped by identical add/remove sets so Gmail
`batchModify` carries up to 1000 message ids per call. **`nextHeads` is persisted only when the push
fully drained and `pending` is empty**; a truncated or partially-failed push requests `runAgain` and
leaves the base where it was, so the remainder re-diffs next run. The cost of that rule is that such
a run re-pushes what it already settled — idempotent at both providers, so it converges.

### First sync

No `savedHeads` → no base → **push nothing**, capture heads, done. Without this rule a mailbox that
had been tagged locally before ever being connected would push its entire tag state at the provider
on first sync.

This is the one case where discarding the local→remote direction is right: there is no evidence any
of those tags were ever _meant_ for the provider. It is deliberately not the same as losing the base
later — see below.

### Base-less reconcile (when the saved heads cannot be resolved)

If `Obj.getVersion(tagIndex, savedHeads)` cannot reconstruct the historical value — the replica no
longer holds the change those heads name, after a compaction, an epoch, or a fresh load on another
runtime — the run has `local` and `remote` but no base. It must not simply re-baseline and push
nothing: any tag the user applied since the last successful sync would be silently dropped, with
nothing left to recover it from.

It also cannot compute the pending diff, which is the very thing the base provides. So the run falls
back to a **base-less additive reconcile**:

- push every eligible local tag the remote lacks;
- pull every eligible remote tag the local lacks;
- **remove nothing, in either direction.**

Without a base, "local has it and remote does not" is ambiguous — a local add or a remote removal —
so only the additive half is safe. That loses no local change and makes no destructive move; the one
casualty is that a _removal_ made while the base was unresolvable does not propagate until a real
diff exists again. Removals recover on the next normal run, because the freshly-captured heads make
the following diff well-founded.

The run then captures heads as usual, so this is self-healing rather than a state to get stuck in.

## Failure modes

| Condition                                                                        | Behaviour                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `savedHeads` do not resolve (compaction, epoch, fresh replica)                   | `Obj.getVersion` cannot reconstruct the historical value and throws; catch, log, and fall back to the [base-less additive reconcile](#base-less-reconcile-when-the-saved-heads-cannot-be-resolved) — never drop the local side, never fabricate a removal. |
| No usable delta token (first tick, or the 404 `clearToken` fallback)             | Remote state is unknown. Fetch `labelIds` for the locally-changed messages only — a bounded set — rather than skipping the push and stranding the change.                                                                                                  |
| Concurrent host + edge runs on one mailbox                                       | Both diff the same base and push the same ops. Idempotent at the provider; the later heads write wins. `withMailboxLock` is in-process only and does not cover this — the idempotence is the mitigation, not the lock.                                     |
| Push succeeds, run dies before heads are persisted                               | Next run recomputes the same diff and re-pushes. Converges.                                                                                                                                                                                                |
| Provider rejects one op permanently (message deleted, label gone, missing scope) | `settled`; log at `warn` with the op. No retry can succeed, and refusing to advance would block the base forever.                                                                                                                                          |
| Provider rejects one op transiently (429, 5xx, timeout)                          | `pending`; the base does not advance and the run requests `runAgain`. Retry is between runs, never inside `pushTags`.                                                                                                                                      |

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
   local-only add, local-only remove, remote-only add/remove, converged double-add, opposed conflict
   on a canonical tag (local wins), opposed conflict on a provider tag (remote wins), ineligible tag
   ignored, empty base (first sync) pushes nothing.
2. **Mock-provider sync tests** (`sync.test.ts` alongside the existing suite) — seed a mailbox via
   `seedGmailBinding`, sync, toggle a tag locally, sync again, assert the mock recorded the expected
   `batchModify`. Then the reverse: mutate the mock's label state, sync, assert the local `TagIndex`.
   Then the conflict case, a crash-between-push-and-heads case asserting convergence, and the
   insert-time case: a locally-added tag on a newly-synced message pushes, while the provider's own
   labels on that same message do not.
3. **Heads-resolution test** — persist heads, mutate, assert `Obj.getVersion` returns the pre-mutation
   set; and an unresolvable-heads case asserting the base-less reconcile pushes the additive half and
   emits no removal in either direction.
4. **Live Gmail test.** Writes labels to a real mailbox, so it is gated harder than the read-only
   suites and must not run against anyone's primary account:

   - **A dedicated, disposable test account**, recorded in the doc before the test is written — never
     a personal or shared working mailbox.
   - **Two gates, not one.** `GOOGLE_ACCESS_TOKEN` alone must not arm it — that variable already
     exists for the read-only `sync-e2e.test.ts`, so reusing it would silently turn an existing
     read-only setup into one that mutates mail. Require a second, explicit opt-in naming the
     account, and assert `getProfile().emailAddress` equals it before the first write. Mismatch fails
     the test rather than skipping, so a mis-pointed token is loud.
   - **Only messages the test itself created**, identified by a marker it sends, never by a query
     over existing mail.
   - **Cleanup in a `finally`** restoring each touched message's original `labelIds`, so a mid-test
     failure does not leave the account modified.

   With those in place: round trip both directions — change a label through the Gmail API, sync,
   assert local tags; toggle locally, sync, read the label back through the API. This is also where
   `SPAM`'s binding is settled: assert whether `modify` accepts it in `addLabelIds` before the Gmail
   push path is written against the assumption that it does.

## Open decisions

1. ~~**Do pipeline-applied canonical tags push?**~~ **DECIDED 2026-08-15: yes.** A classification the
   user sees in Composer should be the one their mail client shows. Follow-on work is real, though:
   `spam` has no Gmail mapping today and `GMAIL_SYSTEM_TAGS` documents `SPAM` as never synced, so
   adding it is a deliberate bidirectional change — see
   [the mapping section](#pipeline-applied-tags-push-too--and-spam-has-no-mapping-yet).
2. ~~**Conflict policy**~~ **DECIDED 2026-08-15: the owner wins** — local for canonical tags, remote
   for provider tags, split by `Tag.isProviderTag`. See
   [Conflict resolution](#conflict-resolution-the-owner-wins).

   **Follow-up: timestamped last-writer-wins.** The chosen rule cannot tell which of two opposed acts
   happened later, so an unsynced local star resurrects one removed on another device. Real LWW needs
   a per-entry write time, which `TagIndex` (`Record<tagId, objectId[]>`) does not carry — a schema
   change plus clock-skew handling between the device and the provider, since the two clocks are not
   comparable without a server-supplied ordering. Deliberately out of the first cut; revisit if the
   resurrection case is observed in practice rather than pre-emptively.

3. ~~**JMAP in this change or a follow-up?**~~ **DECIDED 2026-08-15: follow-up.** Gmail alone proves
   the seam, and `pushTags` is optional precisely so an unimplemented provider degrades to pull-only
   rather than breaking. Two things must not be forgotten when JMAP lands, both already noted above:
   `jmapReconcile`'s add-only keyword handling exists only because local flags could not be written
   back, so it is revisited then, not before; and `spam` is the case that stresses
   `ProviderTagBinding` across vocabularies — a label in Gmail, a `$junk` keyword in JMAP — so treat
   the descriptor as provisional until a second provider has used it.
4. **Live-test account** — **blocks step 4 of the test plan.** Which disposable Gmail account the
   test writes to, the name of its opt-in variable, and whether that token carries `gmail.modify`.
   The safety gates are specified above; the account itself is a human decision and must be recorded
   here before the test is written.
