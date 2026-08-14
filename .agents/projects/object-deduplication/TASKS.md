# Object deduplication — tasks

Design: [DESIGN.md](./DESIGN.md). Branch `claude/person-deduplication-plugin-inbox-dbe8b2`.

## Phase 1 — engine (`@dxos/extractor`, `@dxos/extractor-lib`) ✅

- [x] 1.1 `IdentitySpec` (+ `IdentityRegistry`) in `@dxos/extractor`.
- [x] 1.2 `findDuplicates` (union-find over shared keys) + `DuplicateGroup`.
- [x] 1.3 `planMerge` (survivor = min EntityId) + detached preview.
- [x] 1.4 `applyMerge` (meta-key transfer, overrides assigned over the result, remove losers).
- [x] 1.5 `personIdentitySpec` + `organizationIdentitySpec` in `@dxos/extractor-lib`.
- [x] 1.6 Unit suite for Person duplicates — 21 tests green.
- [x] 1.7 `IdentityIndex` + `makeIdentityIndex`/`buildIdentityIndex`.

## Phase 2 — operations ✅ (specs contributed by plugin-inbox — see DESIGN §3)

- [x] 2.1 `FindDuplicates` / `MergeDuplicates` — definitions AND handlers in `plugin-space`, not
      `@dxos/extractor`: resolving a typename to its spec needs `Capability.Service`, and importing
      `@dxos/app-framework` into `@dxos/extractor` would break its framework-free property. The
      engine itself is in `@dxos/extractor` as agreed. See DESIGN.md §3.4.
- [x] 2.2 `SpaceCapabilities.IdentitySpec` + handlers in `plugin-space`.
- [x] 2.3 `plugin-inbox` contributes the Person/Organization specs.

## Phase 3 — UI ✅ (live-verified in storybook)

- [x] 3.1 `duplicates` layout value on `TypeArticle` (hidden with no spec).
- [x] 3.2 Duplicates toolbar (Merge / Skip / counter / prev-next / rescan).
- [x] 3.3 Merge-preview companion (Form over the uncommitted draft, Confirm/Cancel).
- [x] 3.4 `TypeArticle.stories.tsx` `Duplicates` story — seeds an email group, a foreign-key group
      and a deliberate non-duplicate pair, registers the operation handlers + identity specs, and
      renders a stand-in Selected companion. Walked end to end with Playwright; two defects found
      and fixed that way (see below). The manual `Test:` block is on the story.
- [ ] 3.5 **Play test for the `Duplicates` story.** The highest-value item left: every review bug
      landed in the callers, not the engine, and codecov's 40% patch coverage is concentrated in
      `TypeArticle` and the containers. Open the tab, confirm a merge, assert the group is gone.

### 3a — `TypeArticle` fixes requested alongside (2026-07-31)

- [x] 3a.1 Table tab: a Delete button appears in the toolbar when rows are checked (undoable via
      `SpaceOperation.RemoveObjects`).
- [x] 3a.2 Card tab: clicking a card selects/deselects it; Open moved to the card menu.
- [x] 3a.3 Masonry scrollbar padding — done by the user directly.

### Review round (CodeRabbit, 2026-07-31) — all fixed

Four were real bugs in the merge engine, and writing a test for one found a fifth:

- a confirmed draft was folded through `spec.merge` (gap-fill), so an edit to a field the survivor
  already had was discarded — the opposite of DESIGN §4. Assigned via `Obj.updateFrom` now.
- `unionLabelled` dropped entries it could not normalize; the merge then deletes the losers, so the
  data was destroyed.
- writing that test surfaced worse: merging a compound value (an address) threw, because ECHO
  refuses to re-parent a nested record. Values are copied first.
- a rejected `buildIdentityIndex` stayed cached for the database's lifetime, permanently disabling
  identity resolution after one transient failure.
- `normalizePhone` kept a `+` anywhere; addresses keyed by insertion-ordered `JSON.stringify`.

Second round (UI/robustness):

- the masonry height cache was keyed on raw tile id, and ids default to the array index — one grid
  could serve another's height and reveal an unmeasured tile. Scoped by a required `cacheKey`
  (`TypeArticle` passes the type URI); a grid without one keeps heights per-instance.
- Skip on the last group produced an out-of-range counter ("3 / 2"); `next` clamps and Skip is
  disabled at the end.
- Confirm could be double-clicked into a second merge over already-removed ids, and a failure was an
  unhandled rejection. In-flight guard + the preview stays up on failure.
- `FindDuplicates` responses could land out of order (rescan is a button); newest request wins, and
  Rescan is disabled while scanning.
- `MergeDuplicates` accepted any resolvable id set; it now requires every distinct id to resolve and
  every object to match the spec's type.

### Defects found by the live walkthrough (fixed)

- `Toolbar.Button` rendered outside a `Toolbar.Root` — `Panel.Toolbar` on this article is a plain
  flex container, so the roving-focus context was missing and the tab threw on open.
- Confirming a merge left the review on the merged group (`1 / 2` with one member). Committing now
  bumps `lastMergeAt` on the space plugin's ephemeral state, which the scan depends on.

## Phase 4 — fix the sources (F1–F4)

- [x] 4.1 `Resolver.Live` reimplemented on `IdentityIndex`; per-`Database` `WeakMap` cache +
      `registerResolved`. Fixes **F3** and **F4** (one normalization; `Resolver.Mock` now shares it).
- [x] 4.3 Google `upsertPerson`: two-stage resolution (foreign key → identity index), stamps the
      resource name onto the person it finds, and merges via `personIdentitySpec.merge` instead of
      clobbering `emails`/`phoneNumbers`/`addresses`/`urls`. Fixes **F2**.
- [x] 4.2 `ContactLookup` deleted. One `IdentityIndex` per database (`getIdentityIndex`), re-seeded
      at the start of each run, with a run-scoped `overlayIdentityIndex` for objects built but not
      yet committed. **F1 closed** for committed contacts: two mailboxes syncing at once now read
      one index instead of one snapshot each. The overlay is what keeps an aborted run from leaving
      the shared index claiming a contact the space never received — the recovery test caught that.
- [ ] 4.4 Audit `plugin-github/sync`, `assistant-toolkit/linear/sync-issues`.
- [x] 4.5 **Selective extraction** — `shouldExtractContact` (extractor-lib/selection.ts) is an
      allow-list: a sender is materialised only when we sent/replied to it or its domain matches a
      known Organization, and never when the address or message is automated (no-reply, bounce,
      role mailbox, `List-Unsubscribe`, bulk). Deny beats allow. Wired into the email pipeline via
      `senderSignals`, which reads the `noReply`/`listUnsubscribe` flags the provider mappers
      already record. 8 unit tests.
- [~] 4.5a **Outbound signal not wired** — MOVED to the `mailbox-research` project
  (`packages/stories/stories-brain/docs/TASKS.md`, "Contact extraction — recipients of sent mail").
  `SenderSignals.outbound` exists and is honoured, but nothing sets it: "we replied to this
  address" is a fact about the _recipients_ of sent mail, and recipients are not extracted at
  all today. Until that lands the allow-list is effectively "domain matches a known
  Organization", which is stricter than intended. It sits there because the open question is
  which correspondents matter, not how the dedup engine works.

## Phase 5 — compound table cells

- [ ] 5.1 Chips + overflow popover for scalar arrays.
- [ ] 5.2 Primary + popover for compound arrays (`emails`).
- [ ] 5.3 Schema-driven summary + popover for compound values (`address`).

## Out of scope

Persisted "not a duplicate" assertions; cross-peer convergent merge (see
`.agents/projects/object-merging/`); automatic non-reviewed merging.
