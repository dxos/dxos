# Object deduplication — duplicates from external data sources

- **Status**: phases 1-4 implemented (UI not yet live-verified); phase 5 not started
- **Date**: 2026-07-31
- **Requested by**: Rich
- **Branch**: `claude/person-deduplication-plugin-inbox-dbe8b2`

## 1. Goal

Objects materialised from external sources (mail sync, Google Contacts, calendar attendees,
GitHub, Linear) accumulate duplicates. Give the system

1. **one identity rule per type**, shared by the extractor's create-vs-merge decision and by an
   after-the-fact duplicate scan, and
2. **a review UI** — a Duplicates tab on the Database type article where the user walks group by
   group, merges or skips.

### 1.1 Relationship to `object-merging` (Josiah)

`.agents/projects/object-merging/` solves a different problem with a different mechanism, and the
two must not be conflated:

|             | `object-merging`                                    | this project                                                    |
| ----------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Cause       | Uncoordinated per-peer initialization of app state  | External data sources materialised repeatedly                   |
| Identity    | `EntityMeta` key + version, declared by the creator | Domain identity derived from content (emails, domains, handles) |
| When        | Automatic, convergent, at the ECHO layer            | User-reviewed, at the app layer                                 |
| Correctness | Must converge across peers without coordination     | A human confirms each merge                                     |

They converge later: once ECHO exposes a merge primitive with reference rewriting, this project's
`applyMerge` becomes a caller of it. Until then this project owns its own (simpler, human-gated)
merge. **Do not couple the two designs; do coordinate on the survivor rule** (both use lowest
`EntityId`).

## 2. Diagnosis — why duplicates exist today

Four independent Person-creation paths, each with its own identity rule and its own cache.

| #   | Site                                                                                                                                                                                              | Rule                                         | Failure                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | [`buildContactFromActor`](../../../packages/core/compute/extractor-lib/src/contact.ts) via [`EmailStage.extractContacts`](../../../packages/core/compute/pipeline-email/src/stages/EmailStage.ts) | lowercased email, run-scoped `ContactLookup` | The `Set` is seeded per pipeline run. Two mailboxes syncing concurrently hold two sets; both miss, both create.                                                                                             |
| F2  | [`upsertPerson`](../../../packages/plugins/plugin-inbox/src/operations/contacts/google/sync/handler.ts)                                                                                           | **Google `resourceName` foreign key only**   | Never consults email. The Person mail-sync already created for `alice@x.com` is invisible → guaranteed second object. It then overwrites `person.emails` wholesale, destroying addresses learned from mail. |
| F3  | [`getOrCreate`](../../../packages/core/compute/extractor/src/getOrCreate.ts) + [`Resolver.Live`](../../../packages/core/compute/extractor-lib/src/resolver.ts)                                    | email match                                  | The Person query is snapshotted once at **layer construction**; objects created later in the same run are unresolvable.                                                                                     |
| F4  | [`extract-contact` op](../../../packages/plugins/plugin-inbox/src/operations/extractor/extract-contact.ts), `plugin-github/sync`, `assistant-toolkit/linear/sync-issues`                          | ad-hoc / semaphore / none                    | Divergent normalization: `buildContactFromActor` trims+lowercases, `mapGooglePerson` stores verbatim, `Resolver.Mock` compares raw.                                                                         |

Compounding: `Database.flush({ indexes: true })` runs only at the **end** of a sync run
([`mail-sync.ts`](../../../packages/plugins/plugin-inbox/src/operations/mail/mail-sync.ts)), so
nothing written mid-run is queryable by a sibling run.

**Root cause**: "are these the same person?" is answered in five places with five different
predicates and five different caches. The fix is to have exactly one.

## 3. Architecture

Three layers. Only the first is type-aware.

```
@dxos/extractor            IdentitySpec, IdentityIndex, findDuplicates, planMerge   (generic)
  └─ @dxos/extractor-lib   personIdentitySpec, organizationIdentitySpec            (type-specific)
       └─ plugin-crm       contributes the specs as a capability
            └─ plugin-space  FindDuplicates/ApplyMerge handlers + Duplicates tab   (UI)
```

### 3.1 `IdentitySpec` — the single identity rule (`@dxos/extractor`)

This is deliberately the same shape the extractor pattern already implies: an extractor decides
_create vs merge_, which is exactly "does this object's identity key already exist?".

```ts
export interface IdentitySpec<S extends Type.AnyObj> {
  readonly type: S;
  /** Identity keys carried by an object — normalized and namespaced, e.g. `email:alice@x.com`. */
  keys(object: Type.InstanceType<S>): readonly string[];
  /** Identity keys for a lookup input (e.g. `{ email }`), so the Resolver shares one rule. */
  inputKeys(input: unknown): readonly string[];
  /** Field-level merge of `source` into `target`, run inside `Obj.update`. */
  merge(target: Obj.Mutable<Type.InstanceType<S>>, source: Type.InstanceType<S>): void;
}
```

Two objects are duplicates iff they share **any** identity key. Grouping is the transitive
closure (union-find), so `A~B` by email and `B~C` by foreign key puts A, B, C in one group.

`Obj.Meta.keys` (foreign keys) are folded in generically by the engine as `fk:<source>:<id>`, so
every type gets Google/Linear/GitHub identity for free and F2 is fixed without type-specific code.

**Person v1**: `email:<trim+lowercase>` per entry in `emails`, plus generic foreign keys. Name
similarity is deliberately excluded — it produces false positives on shared inboxes
(`no-reply@dxos.org` vs `testflight_no_reply@email.apple.com` are correctly _not_ duplicates).

### 3.2 `IdentityIndex` — replaces four caches

A mutable `Map<key, object>` built once from a query and **updated as objects are created**:

```ts
IdentityIndex.build(db, specs); // query once, index every object by every key
index.lookup(type, input); // via spec.inputKeys — what Resolver does today
index.register(object); // mid-run creations are immediately resolvable  → fixes F3
```

`Resolver.Live` is reimplemented on top of it (same public API), and `ContactLookup` is deleted in
favour of it. `buildContactFromActor` takes the index. One normalization rule → F4 gone.

To fix F1 the index is cached **per database instance** in a module-level `WeakMap<Database,
IdentityIndex>` so two concurrent syncs in the same process share it. Cross-_peer_ races remain and
are out of scope (that is `object-merging`); the Duplicates tab is the backstop.

### 3.3 Detection and merge (`@dxos/extractor`)

```ts
findDuplicates(spec, objects): DuplicateGroup[]      // pure; union-find over shared keys
planMerge(spec, group): MergePlan                    // pure; survivor + preview + losers
applyMerge(db, spec, plan): Effect<void>             // the only write
```

- `DuplicateGroup = { key: string; objects: readonly Obj.Any[] }` — the "duplicate tuple".
- **Survivor** = lowest `EntityId` (deterministic, agrees with `object-merging` §4).
- **Merge policy** (default, overridable per spec):
  - scalars: survivor's value wins when non-empty, else first non-empty in `EntityId` order;
  - arrays of compound values: union by the spec's normalization key, survivor's order first;
  - refs: survivor's when set, else the first non-empty;
  - `Obj.Meta.keys`: union (so the survivor answers every foreign-key lookup afterwards).
- `applyMerge` copies losers' meta keys onto the survivor, then `db.remove`s the losers.

**Known limitation (as built)**: references to a loser are not rewritten at all.
`Message.sender.contact` lives in immutable feed items and cannot be rewritten even in principle,
so those refs dangle after a merge; the UI falls back to `sender.email`/`name`, and the next sync
re-resolves the email to the survivor. Rewriting space-db refs is deferred until the
`object-merging` engine offers a primitive for it, rather than hand-rolled here.

### 3.4 Operations

The engine (`IdentitySpec`, `IdentityIndex`, `findDuplicates`, `planMerge`, `applyMerge`) lives in
`@dxos/extractor` as requested. The **operation wrappers** could not: an operation that resolves a
typename to its spec needs `Capability.Service`, and pulling `@dxos/app-framework` into
`@dxos/extractor` would break the framework-free property its `ExtractorRegistry` docstring relies
on. Both definitions and handlers therefore live in `plugin-space`, next to the capability and the
UI, and call the generic engine.

| Operation         | Input                                 | Output                             |
| ----------------- | ------------------------------------- | ---------------------------------- |
| `FindDuplicates`  | `{ typename }`                        | `{ groups: { keys, objectIds }[] }` |
| `MergeDuplicates` | `{ typename, objectIds, overrides? }` | `{ survivorId, removedIds }`       |

Specs reach `plugin-space` through `SpaceCapabilities.IdentitySpec`, contributed by `plugin-crm`
for Person/Organization — mirroring `InboxCapabilities.ObjectExtractor`. The Duplicates tab is
hidden for types with no registered spec.

## 4. UI — the Duplicates tab

[`TypeArticle`](../../../packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.tsx)
gains a third layout value alongside `masonry`/`table`.

- **Toolbar** in duplicates mode: the text filter is replaced by `Merge` / `Skip`, a group
  counter (`3 / 17`), and prev/next. The layout toggle stays.
- **Content**: masonry of the current group's cards (the existing `TypeTile`), so the user sees
  every candidate at once.
- **Selection**: clicking a card toggles selection (it no longer navigates — the companion follows
  the selection, so navigating on every click fought the review; Open moved to the card menu). The
  existing **Selected** companion renders the selection.
- **Merge**: builds an _uncommitted_ draft (`planMerge`) and stages it in the space plugin's
  ephemeral state. The Selected companion swaps to a schema-driven `Form` over that draft with
  Confirm/Cancel; Confirm invokes `MergeDuplicates` with the edited draft as `overrides`. Nothing
  is written before Confirm.
- **Skip**: advances without writing. Skips are session state in v1 (not persisted); a persisted
  "not a duplicate" assertion is phase 4.

## 5. Compound values in the table view

Prior art for showing multi-valued and compound fields in a grid, mapped to our three cases.

| Case                                                        | Prior art                                                 | Mechanism                                                                                                                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Array of scalars (`tags`, `identities`)                     | Airtable multi-select, Linear labels, GitHub issue labels | Inline **chips**, truncated to the cell width with a `+N` overflow chip; the overflow chip opens a popover listing all values.                                                               |
| Array of compound values (`emails`, `phoneNumbers`, `urls`) | Apple Contacts, Salesforce compound fields, HubSpot       | **Primary value + label badge** in the cell (first entry, or the one labelled `primary`), with a chevron affordance; the popover lists every entry as `label → value` and marks the primary. |
| Non-array compound value (`address`)                        | Notion rollups, Retool JSON cells, Google Contacts        | **Collapsed single-line summary** rendered by a schema-driven formatter (`street, locality region postalCode`), popover shows the structured sub-form.                                       |

Common rules: the cell itself is never a mini-form; editing happens in the popover, which hosts the
`react-ui-form` sub-form for that field subtree; the summary is derived from the field's `Schema`
(`Format.Email`, `Geo`, …) so no per-type table code is needed; a cell with no values renders the
placeholder, never an empty chip row. Implementation is phase 5.

## 6. Phasing

| Phase | Content                                                                                                                                                    | Test                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1     | `IdentitySpec`, `IdentityIndex`, `findDuplicates`, `planMerge` in `@dxos/extractor`; `personIdentitySpec` in `@dxos/extractor-lib`                         | Unit suite for Person (`duplicates.test.ts`) |
| 2     | `FindDuplicates`/`ApplyMerge` definitions + `plugin-space` handlers + `SpaceCapabilities.IdentitySpec` + `plugin-crm` contribution                         | Handler unit tests                           |
| 3     | Duplicates tab, toolbar, merge-preview companion                                                                                                           | Storybook + play test                        |
| 4     | Fix F1–F4 at source: `Resolver.Live` on `IdentityIndex`, `ContactLookup` deleted, Google `upsertPerson` falls back to the identity index and unions emails | Existing sync tests + new regression tests   |
| 5     | Compound-value table cells (§5)                                                                                                                            | Storybook                                    |

Persisted "not a duplicate" assertions, cross-peer convergence, and automatic (non-reviewed)
merging are explicitly out of scope.
