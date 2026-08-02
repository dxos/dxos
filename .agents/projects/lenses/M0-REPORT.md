# M0 Migration Research — Expectations Report

_2026-08-01 · Feeding forward into implementation planning. Verdicts on the five stated
expectations, each proven or disproven by a clean, isolated vitest bench:
`packages/core/echo/echo-client-e2e/src/migration-bench/` (run:
`moon run echo-client-e2e:test -- src/migration-bench`). The bench is self-contained and
authoritative; the exploratory evidence behind it lives in
`echo-client-e2e/src/migration-research*.test.ts` (15 tests, 12 claims) and the analytical
writeups in [DESIGN.md](./DESIGN.md) §10.3 ("M0 Track A/B findings") and §10.5 ("What flows back
to object-merging"). Related: PR #12412 (natural-key merging, not landed)._

## Verdict summary

| #   | Expectation (as stated)                                                            | Verdict                                                     |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Single object is obviously solved already                                          | **Proven** (with constraints)                               |
| 2   | Multi-object works the same way as long as N→N                                     | **Proven** (with constraints)                               |
| 3   | Fan-in fine given a deterministic choice of removed object                         | **Qualified** — necessary, not sufficient                   |
| 4   | Fan-out: meta-key merging, loss only on conflicts, inspect/revert                  | **Proven**                                                  |
| 5   | Multi-object not atomic → vulnerable to corruption until cross-object transactions | **Qualified** — window real, but repairable, not corruption |

Every constraint listed below is demonstrated by a passing bench test, not argued from theory.

## E1 · Single object — PROVEN, with the constraint set implementation must carry

Suite: `migration-bench/single-object.test.ts` (4 tests).

Fold-forward works end to end: a migration records heads and a per-object marker, keeps source
properties, and any late old-shape write — made by a partitioned peer, before or after arbitrary
sync rounds — folds into the new shape without loss; chains (A→B→C) fold through composition;
independent folds on multiple peers converge. Genuine conflicts (late source write vs. direct
target edit) are invisible to Automerge (different keys, no CRDT conflict) but are detected by the
fold and recorded as data, losing neither side.

The constraints ("solved" is true only with all of these — each has a test that fails without it):

1. **Keep source properties.** The fold reads them; deletion forfeits recoverability. (Deletes
   don't destroy concurrent late writes — verified — but the rule stands for the fold's sake.)
2. **Two head-marks per migration event**: pre-migration heads (late-source-write detection) and
   post-migration heads (direct-target-edit / conflict detection, excluding the migration's own
   writes).
3. **Ancestry-check stored heads before diffing.** `A.diff` against heads a doc has never seen
   silently returns a full "everything is new" diff — an epoch re-root would make the fold re-apply
   the world. (Real epoch machinery remains unexercised; this is the observed failure shape.)
4. **Value-compare before every write.** Automerge emits patches for equal-value writes (strings:
   `put ''` + `splice` unconditionally), so a heads-driven fold loop that doesn't compare values
   never settles — values converge, writes ping-pong forever.
5. **Equal values never conflict.** Another peer's identical fold write is indistinguishable from a
   direct edit by heads alone; conflict classification must compare values before recording, or
   racing identical folds mint spurious `{mine: X, theirs: X}` records. (Found live, as a race in
   the bench itself.)
6. **A composed chain fold is one `Obj.update`.** Split across updates there is an observable,
   replicating window where the object is half-folded through the chain.
7. **Per-object migration state, not a space scalar.** A marker via `Annotation.set` on
   `EntityMeta.annotations` works and replicates today; `EntityMeta.version` itself is fixed at
   creation.

## E2 · Multi-object N→N — PROVEN: same machinery, per object, plus one cross-object rule

Suite: `migration-bench/multi-object.test.ts` (2 tests).

Independently migrated objects fold independently under one partition — each object's heads,
marker, folds, and conflicts are its own; one object's conflict does not perturb another's clean
fold. A cross-object **move** (`person.employerName` → `company.industry`) also works: the fold
diffs the source object's heads but writes the _target_ object, guarded and conflict-aware against
the target's own post-migration heads, and independent folds on both peers converge.

The one addition over E1: the fold's read-set and write-set span objects, so every E1 constraint
applies per object _pair_ (heads recorded on both ends), and the pair write is subject to E5's
non-atomicity — an accepted, repairable window, not a correctness loss.

## E3 · Fan-in — QUALIFIED: the stated condition is necessary but not sufficient

Suite: `migration-bench/fan-in.test.ts` (4 tests). The expectation as stated ("fine as long as
there's a deterministic way to choose the object being removed") holds only for the trivial case;
the proven, complete condition is:

> Fan-in is fine with (1) a deterministic removal choice **and** (2) a declared property-collision
> resolution **and** (3) a query-based late-child path.

All three qualifiers are independently load-bearing:

- **(1) alone suffices only for a single child.** Deterministic absorption of one child converges
  on both peers, tombstones idempotently, and re-absorbs as a zero-write no-op.
- **(2) is forced by property collision.** Two children absorbing into one parent property: with a
  declared resolution (min-child-id), both peers converge deterministically, the displaced value is
  recorded `{mine, theirs, loserId}`, and the losing child remains intact under its tombstone.
  Without one, the register still converges — but the winner is actor-id-randomized per run (there
  is not even an accidental "first/last writer wins" to lean on), and the displaced value vanishes
  from the property with no record. Removal choice does not touch this failure mode at all.
- **(3) is forced by late entity creation.** A child created (by an old-schema partitioned peer)
  _after_ the fan-in completed has no migration heads by construction — heads-based detection
  categorically cannot see it. A query-based path (`Filter.type(child) ∧ Filter.props({ownerId})`,
  tombstones excluded by default) detects it; the same declared resolution absorbs it; re-detection
  converges to empty. Verified across two rounds with both peers detecting and absorbing
  independently.

Late writes to an already-absorbed (tombstoned) child also fold forward: the clean path reaches the
parent property; the conflict path (parent directly edited since absorption) preserves the direct
edit and records the late value as displaced — nothing silently lost, child tombstoned throughout.

Note for E5: absorption is two operations (parent update, child tombstone) — its torn intermediate
state is covered by the E5 verdict, not re-tested here.

## E4 · Fan-out — PROVEN: meta-key merging with loss only on genuine conflicts, inspectable and revertible

Suite: `migration-bench/fan-out.test.ts` (3 tests). Builds on PR #12412's shape (natural-key
duplicates, min-id winner, tombstoned losers) and improves its merge semantics.

- **The defect in plain per-field winner-preference, quantified**: for migration-minted duplicates
  the deterministic transform wrote every field on both copies, so "the winner defines it" is
  vacuously true and a loser-side edit loses to the winner's untouched baseline value — exactly one
  unconflicted field lost in the bench scenario, with the genuinely contested field also dropped
  silently.
- **Baseline-aware three-way merge fixes it**: classify each field against the shared baseline
  (for migration duplicates a free, pure recomputation of the transform). Winner-at-baseline +
  loser-edited → take the loser's; equal or loser-at-baseline → keep, no write; both diverged and
  disagree → genuine conflict: keep the winner's value, record
  `conflicts[field] = { mine, theirs, loserId }`. Both disjoint edits survive; loss occurs only
  where two peers actually contradict each other.
- **Inspect and revert**: the conflict record is keyed per property (concurrent identical merges
  converge; multiple conflicting fields compose), and the tombstoned loser remains fully readable
  under `deleted: 'include'`, agreeing with the record — a UI can flip to "theirs" from either
  source, and the flip converges.
- **Convergent and idempotent**: independent merges on both peers produce identical state
  _including_ the conflict record; re-merge on the converged state is zero writes.

Implementation requirements this imposes: the migration transform must be **deterministic and
re-derivable** (the baseline is recomputed, not stored) — for non-migration duplicates a stored
baseline (creation heads or fork snapshot) is the unbuilt extension path; duplicates must be
created with a **derived meta key** (`<lensId>:<sourceId>:<role>` format) — and never with derived
object ids: same-id creation makes peers diverge permanently (each client caches the first
`links[id]` URL it binds and never re-observes; verified, flows back to #12412's never-see-two
reasoning).

## E5 · Multi-object atomicity — QUALIFIED: the window is real, but it is repairable inconsistency, not corruption

Suite: `migration-bench/atomicity.test.ts` (3 tests).

- **The window is real and replicates.** Applying half a two-object write set ("crash" after step
  one) leaves an observable inconsistent state locally, and per-doc replication propagates the half
  to other peers as-is.
- **A resumable, idempotent runner always closes it.** Re-running the _full_ write set — every step
  value-compare guarded — from a _different_ peer than the one that crashed completes exactly the
  missing half; a third run from yet another peer performs zero writes. So the correct statement
  is: multi-object migrations are subject to temporary, observable, replicating inconsistency
  windows until cross-object transactions land — but with effects-as-data write sets and guarded
  idempotent application, any peer can complete an interrupted migration and no state is corrupted.
  ("Effects as data" — DESIGN.md §10.5 — is what makes the re-run possible; a callback-shaped
  migration cannot be resumed.)
- **Relations are the one free mitigation.** A relation whose endpoints haven't arrived is
  strong-deps-gated: excluded from queries, never an error, self-surfacing when resolvable. Plain
  refs and properties get no such protection. Worth exploring: whether other cross-object writes
  can be modeled to get strong-deps-style gating during their window.

Note also that a step whose write primitive isn't naturally idempotent (e.g. `Annotation.set`,
`db.remove`) needs its own guard (`isDeleted()` check, marker check) — idempotence is a property
the runner must enforce per step, not assume.

## Proposed API shape: `Migration.declare` + a guarded `Write` vocabulary

The proposed surface that satisfies every verdict above by construction. Nothing here is
implemented — it is the shape the bench evidence points at, sketched so implementation planning
starts from it rather than re-deriving it. The example is the compound case:
`Person v1 { fullName, address: string }` → `Person v2 { name }` + an extracted `Address` object +
a `LivesAt` relation.

```ts
// The value transform is an ordinary lens — pure, per-property, checkable, bidirectional. A coded
// lens carries the parse; `checkLaws` verifies it against generated Persons before real data is
// touched, and its `put` is the rollback/fan-in for free (DESIGN.md §10.4, §10.5 fan-in-derived).
const AddressLens = Lens.coded('org.example.lens.postal-address', ..., {
  get: (raw: string) => parseAddress(raw),          // '10 Main St, Springfield' → { street, city }
  put: (addr) => formatAddress(addr),
});

const SplitAddress = Migration.declare('org.example.migration.split-address', 2, {
  match: Query.type(Person, { version: '1.x' }),

  // PURE and synchronous: given the matched objects' current state, return the COMPLETE intended
  // write set as data. No db access, no awaits, no effects — this determinism is what every
  // idempotence property downstream falls out of.
  migrate: ({ person }) => {
    const parsed = AddressLens.get(person.address);
    return [
      // 1→1 rewrite on the person itself.
      Write.assign(person, 'name', person.fullName),

      // Fan-out: never a raw create. `ensure` addresses the new entity by a derived meta key;
      // the object id stays random (E4: derived object ids diverge peers permanently).
      Write.ensure(addressRef, {
        key: `${SplitAddress.id}:${person.id}:address`,
        type: Address,
        props: parsed,
      }),

      // Cross-object wiring, addressed by reference — including to an entity that may not exist
      // yet in this run (E5c: strong-deps gate the incomplete window).
      Write.relate(livesAtRef, { type: LivesAt, source: person, target: addressRef }),

      // Per-object completion marker + the two head-marks, so "what's left" is a query and
      // fold-forward has its detection baseline (E1 constraints 2 and 7).
      Write.stamp(person, SplitAddress),
    ];
  },
});
```

Two authoring rules the API enforces rather than documents (the same trick the lens plays with
write-minimality — the unsafe thing is inexpressible, not discouraged):

- **The vocabulary cannot express an unguarded or destructive write.** No `Write.replace`, no
  create with a caller-chosen id, no source-property delete — sources stay, tombstoning is its own
  declared step, every verb carries its guard implicitly.
- **Partial transforms reject whole.** An unparseable `address` yields `Write.report(person,
reason)` instead of the ensure/relate — never a half-populated Address (E4/claim 9 contract:
  leave the source in place, report, don't half-create).

**The runner — where idempotence actually lives:**

```ts
const run = async (db, migration) => {
  for (const match of await db.query(migration.match.unstamped()).run()) {
    const writes = migration.migrate(match); // recomputed fresh, every run
    for (const [target, group] of groupByTarget(writes)) {
      await applyGuarded(db, target, group); // ONE Obj.update per target object
    }
    await db.flush();
  }
};
```

Per-verb guards, each traceable to a bench result:

| Verb        | Guard on re-run                                                                                                                  | Proven by                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `assign`    | skip when current value equals the derived value                                                                                 | E1 (equal-value writes still emit patches; unguarded loops never settle) |
| `ensure`    | resolve by meta key first — present → no-op; a raced duplicate collapses via the merge engine (identical content, its best case) | E4 / claims 6b, 9                                                        |
| `relate`    | same derived-key rule; a relation landing before its target simply does not surface — no error                                   | E5c / claim 8                                                            |
| `stamp`     | skip when the marker is already set (`Annotation.set` is not naturally idempotent — guarded explicitly)                          | E5b                                                                      |
| (tombstone) | skip when `isDeleted()`                                                                                                          | E3a                                                                      |

Structural rules: writes are grouped per target object into **one `Obj.update`** (atomic per
object — tearing is only possible between objects), and creations are ordered before the relations
pointing at them (a window-shrinking nicety; correctness does not depend on it).

**Why crash-and-reapply works, step by step.** Runner dies between the ensure and the stamp:
(1) the half-state — `name` written, Address created, no stamp — is observable and replicates
(E5a; only the relation is hidden, by strong-deps). (2) _Any_ peer re-runs: the `unstamped()`
query still matches (per-object stamp, not a space scalar); `migrate` recomputes the identical
write set from current state (purity); `assign` compares-equal → skip, `ensure` finds the key →
skip, `stamp` missing → applied. Complete. (3) A third run: the query no longer matches, and even
forced, every guard skips — zero patches (the bench's empty-`writesSince` assertion). There is no
stored resume point anywhere — **recovery is re-execution**, made safe by recomputation plus
guards.

The same declaration is M2's fold-forward standing rule: "re-apply whenever old-shaped data
appears" is `run()` again, with one addition — an `assign` whose target changed since the stamped
heads _and_ whose values disagree downgrades to a conflict instead of overwriting (the E1/E4
classification, including equal-values-never-conflict so racing peers' identical folds don't mint
self-conflicts). _How_ that conflict is represented is settled by the following section — the
app-level `conflicts[field]` record used throughout the bench is **superseded** by the
history-native representation. And the forward-compatibility effects-as-data buys: when Automerge
ships cross-object transactions, `applyGuarded` hands the same grouped write set to one transaction
and the E5 window disappears — no declaration or call-site changes.

## History-native conflicts: the `changeAt` strategy (supersedes app-level conflict records)

_Directive (2026-08-02): no external/shadow history tracking — all history, including migration
conflicts, should be browsable via automerge history, since history browsing is already built on it
(`edit-history.ts`, devtools ObjectsPanel, plugin-review checkpoints). Verified empirically in
`echo-client-e2e/src/migration-research-history.test.ts` (6 tests, 10/10 stable after a
convergence-poll fix; `A.getConflicts` had never been called anywhere in DXOS before this file)._

**The mechanism.** A fold written normally is causally downstream — automerge sees a plain
sequential overwrite and its conflict machinery never engages, which is why the bench originally
reached for app-level records. The fix: **write the fold via `changeAt` at the recorded migration
heads**. For a rename, the fold _re-keys_ the late source write onto the target property and
places it in the concurrent past — so the fold write and any direct edit since the migration are
genuinely concurrent ops on one key, and automerge's own conflict machinery engages. Verified
end-to-end (H1): a real two-value conflict set on `name` (`{opId → 'direct', opId → 'late'}`),
replicating to the other peer with an identical set and winner, with ECHO's reactive/index layers
noticing the `changeAt` write like any other (no bypass — it flows through the same `'change'`
event pipeline).

**What this buys, each verified:**

- **Permanent reviewability from ops alone (H2).** After a resolution write clears the live
  conflict, `A.getConflicts` at the recorded conflict frontier still returns both values — the
  alternative history is derivable forever from the op DAG, no shadow record. One sharp caveat
  found: a view taken from the _live_ doc shares its handle, and a later write silently empties
  `getConflicts` on it (plain value reads stay frozen correctly) — historical conflict inspection
  must go through `A.clone` first, or re-derive from a freshly loaded doc. This belongs in the
  history-browsing helper, not in callers.
- **Discoverable by an unmodified history browser (H2).** Walking `getEditHistoryWithDiffs`'s own
  heads sequence and re-diffing pairwise surfaces the conflict moment as a `put` patch flagged
  `conflict: true` (or a bare `ConflictPatch`) — zero migration-specific knowledge needed to find
  and render "a conflict happened here".
- **Attribution inside automerge history (H3).** `changeAt` (and ordinary `change`) accept
  `{ message, time }`; ECHO plumbs them through and `getEditHistoryWithDiffs` already surfaces
  them — a fold stamped `message: 'fold:<migrationId>'` is identifiable in the existing history
  driver on every peer, with zero new plumbing. (Unused anywhere in ECHO until now.)
- **The winner is a deterministic POLICY CHOICE, not a coin flip (H4).** Two deterministic options,
  both verified:
  - _Fold wins_ — plain `handle.changeAt` on the live doc: the fold's op inherits the doc's
    current op-counter bookkeeping, so it carries a **higher Lamport counter** than the direct
    edit and wins by counter dominance, regardless of actor. Deterministic, but silently
    overrides the user's edit (conflict set still preserved for review).
  - _User wins (recommended default)_ — fork from `A.view(doc, migrationHeads)` (a snapshot the
    runner has by construction), `A.clone` with a **sentinel all-zeros actor**, `changeAt` on the
    clone, merge back via `core.docHandle.update((doc) => A.merge(doc, foldedClone))` (the only
    doc-level merge path a handle exposes — it works today). Forking from the _old_ state makes
    the counters tie, so the lexicographically-lowest actor deterministically **loses**: the
    user's direct edit stays the presented winner, the fold's value sits in the conflict set
    awaiting explicit resolution. "User beats migration by default, conflict browsable."
  - The counter pitfall is load-bearing: clone from the _current_ doc and the sentinel actor is
    irrelevant — counter dominance decides before actor comparison is reached. Verified both ways.
- **Same-key fan-in conflicts are history-native for free (H5).** Two peers concurrently absorbing
  different values into one parent property already produce a real conflict set — `changeAt` is
  only needed to _manufacture_ concurrency for causally-downstream folds and renames. E3's
  declared resolution becomes an ordinary causal write that clears the conflict; the pre-resolution
  frontier remains reviewable (via the clone caveat above).

**Noise to design around (H4a):** two peers independently folding the same value author distinct
ops — the conflict set can transiently differ per peer (same count, different fold op-ids) until
all ops replicate, and the converged set may hold the same value under multiple op-ids. Convergence
checks must compare full op-id sets, and an attribution UI should collapse equal-valued entries.

**What it costs / still needs:**

1. **Retention — RATIFIED (2026-08-02): epochs deliberately erase history, and that is fine.**
   Migration never depends on epochs (every E1-E5 and fold-forward test ran with zero epoch
   machinery); epochs are a last resort, avoided as much as possible. Accepted consequences when one does run
   boundary, owned knowingly: (a) live conflict sets embedded in the erased history are dropped;
   (b) the heads-based fold-forward window **closes** — stored migration heads become foreign, so
   a peer offline since before the epoch loses automatic fold/conflict detection (its late writes
   still merge as raw data; nothing corrupts). The ancestry check (E1 constraint 3) is what makes
   the boundary safe: the fold detects heads-not-in-history and stops, rather than trusting
   `A.diff`'s silent everything-is-new answer. Corollary: **epoch timing IS the fold-forward
   window policy — §10.7 q2 is answered by construction** ("the window is until the next epoch"),
   with no separate retention mechanism needed. Ordinary storage compaction is unaffected
   (`A.save` preserves full ancestry; the fragments format bundles per-change members). Operational
   model: epochs are a last resort rather than routine cadence-driven compaction — platform-owned;
   epoch management is not exposed at the app level for the foreseeable future, apps at most
   consume the missed-epoch signal — so the fold-forward window is long-lived by default. When one
   does run (well-known/announced), a peer offline past it owns whatever it can no longer reconcile
   automatically — bounded loss (late writes still merge
   as raw data; reconciliation becomes manual), not disappearance. The ancestry-check failure
   doubles as the app-level notification signal ("changes from before the epoch need review") with
   zero extra bookkeeping; the epoch tool could additionally scan for conflict-flagged patches and
   report what it is about to drop.
2. **A first-class fold-write API.** The user-wins path (view-fork + sentinel actor + merge-back)
   works through public surface today but is a four-step dance; the runner should own it as one
   primitive (e.g. `Write.foldAt(heads, prop, value)` with a winner-policy option).
3. **Heads ancestry checks still apply** — a stored frontier that predates an epoch re-root
   silently yields garbage diffs/views (E1 constraint 3), unchanged by this strategy.
4. **Unextended (plausible, untested):** projecting a merge loser's field values onto the winner
   at the merge-baseline heads would make E4's duplicate-merge conflicts history-native the same
   way; and text/collaborative fields were not exercised.

## Consolidated obligations for the implementation plan

1. Migrations keep source properties; retirement is a separate compaction concern (with the
   fold-forward window policy still an open question).
2. Per migration event, per object: pre- and post-heads + a marker on `EntityMeta.annotations`;
   heads must be ancestry-checked before use (epoch interaction).
3. Every fold/merge/runner write: value-compare first; equal values never conflict.
   3a. Conflicts are represented history-natively (fold-at-heads + `getConflicts`, see the
   `changeAt` section), not as app-level records; the winner is a declared policy (user-wins via
   view-fork + sentinel actor recommended); epochs must preserve or drain live conflicts.
4. Composed chain folds and per-object write batches: single `Obj.update`.
5. Late-created entities: a query-based detection path ("old-shaped and unmarked"), structurally
   separate from the heads-based property fold.
6. Migration-created objects: random id + derived meta key, mandatory; never derived object ids.
7. Duplicate collapse: baseline-aware three-way merge with per-property conflict records and
   tombstoned (never erased) losers; transforms must be deterministic/re-derivable.
8. Fan-in: declared removal choice AND declared property-collision resolution (no defensible or
   even accidental default exists) AND the query-based late-child path (E3's three qualifiers).
9. Cross-object migrations: effects-as-data write sets, per-step idempotence guards, resumable
   from any peer; document the inconsistency window until cross-object transactions land. The
   `Migration.declare` + guarded `Write` sketch above is the proposed embodiment.
10. 1→N splits: durable per-element key must be stamped into elements (automerge list identity is
    convergent but destroyed by any reorder).

## Follow-on directions (2026-08-02 review)

Resolutions and directions from design review, each turning an "open" item into a scoped plan:

1. **Text fields: schema-declared, splice-routed.** Every ECHO string is already automerge Text at
   the storage layer, so "collaborative text" is a policy declared in the schema (a field/type
   annotation the lens machinery can read), not something detectable from storage. Fields so
   marked route through the `Write` vocabulary's existing `splice` verb — folds diff the derived
   text against current and emit minimal splices (the rich-text lens already demonstrates this),
   so a fold and a concurrent edit to different ranges interleave via native text merging instead
   of clobbering. Remaining spike: duplicate-merge for text (unrelated docs, no shared history —
   needs an app-level three-way text diff against the recomputed baseline).
2. **RATIFIED: non-owning refs are allowed to dangle/break.** The backlink gap list (markdown
   links, id-keyed side maps, feed blocks, bare EIDs) is exactly the non-owning population, so the
   fan-in cardinality pre-flight only needs completeness over owning/strong references — which the
   `reverseRef` index covers. Repointing referrers is two composable patterns: lazy — an
   `absorbedInto` redirect on the tombstoned child (the `mergedInto` mechanism generalized), with
   a read-through lens projecting the absorbed fields back under the old target type so stale refs
   heal at read time; eager — a referrer lens that retypes/repoints the ref property, run as an
   ordinary migration by the same runner, opt-in per referrer type.
3. **1→N key agreement: seed backfill stamps from the convergent `ObjID`.** The split key is
   `<lensId>:<elementStampedId>`; new schemas stamp at creation. For existing unstamped
   collections, the backfill derives each element's stamp from its automerge `ObjID` — verified
   byte-identical across peers — so concurrent backfills agree deterministically with no
   coordination. The ObjID's reorder-fragility is irrelevant once the stamp is copied into data.
   Residual race (element reordered between two peers' backfills) converges via register semantics
   - idempotent re-run. Sequencing: stamp phase, then split phase gated on stamp presence.

## Out of scope / open

- Real epoch/compaction behavior against stored heads (only the foreign-heads failure shape is
  characterized).
- The collapse engine itself (PR #12412) — the bench proves the substrate and the improved merge
  semantics, not the worker-integrated engine.
- Non-`Ref` back-reference gaps — downgraded from risk to accepted (see Follow-on directions:
  non-owning refs are allowed to dangle; the cardinality check needs completeness only over
  owning/indexed refs).
- The fold-forward trigger and its runtime cost (DESIGN.md §10.7 q6).
- Collaborative-text merge policy (a text baseline would extend only-on-conflict discipline to
  text; unexplored).
