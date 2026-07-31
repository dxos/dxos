# Object deduplication — tasks

Design: [DESIGN.md](./DESIGN.md). Branch `claude/person-deduplication-plugin-inbox-dbe8b2`.

## Phase 1 — engine (`@dxos/extractor`, `@dxos/extractor-lib`) ✅

- [x] 1.1 `IdentitySpec` (+ `IdentityRegistry`) in `@dxos/extractor`.
- [x] 1.2 `findDuplicates` (union-find over shared keys) + `DuplicateGroup`.
- [x] 1.3 `planMerge` (survivor = min EntityId) + detached preview.
- [x] 1.4 `applyMerge` (meta-key transfer, overrides fold, remove losers).
- [x] 1.5 `personIdentitySpec` + `organizationIdentitySpec` in `@dxos/extractor-lib`.
- [x] 1.6 Unit suite for Person duplicates — 21 tests green.
- [x] 1.7 `IdentityIndex` + `makeIdentityIndex`/`buildIdentityIndex`.

## Phase 2 — operations ✅

- [x] 2.1 `FindDuplicates` / `MergeDuplicates` — definitions AND handlers in `plugin-space`, not
      `@dxos/extractor`: resolving a typename to its spec needs `Capability.Service`, and importing
      `@dxos/app-framework` into `@dxos/extractor` would break its framework-free property. The
      engine itself is in `@dxos/extractor` as agreed. See DESIGN.md §3.4.
- [x] 2.2 `SpaceCapabilities.IdentitySpec` + handlers in `plugin-space`.
- [x] 2.3 `plugin-crm` contributes the Person/Organization specs.

## Phase 3 — UI ✅ (live-verified in storybook)

- [x] 3.1 `duplicates` layout value on `TypeArticle` (hidden with no spec).
- [x] 3.2 Duplicates toolbar (Merge / Skip / counter / prev-next / rescan).
- [x] 3.3 Merge-preview companion (Form over the uncommitted draft, Confirm/Cancel).
- [x] 3.4 `TypeArticle.stories.tsx` `Duplicates` story — seeds an email group, a foreign-key group
      and a deliberate non-duplicate pair, registers the operation handlers + identity specs, and
      renders a stand-in Selected companion. Walked end to end with Playwright; two defects found
      and fixed that way (see below). Play test not written — the manual `Test:` block is on the story.

### 3a — `TypeArticle` fixes requested alongside (2026-07-31)

- [x] 3a.1 Table tab: a Delete button appears in the toolbar when rows are checked (undoable via
      `SpaceOperation.RemoveObjects`).
- [x] 3a.2 Card tab: clicking a card selects/deselects it; Open moved to the card menu.
- [x] 3a.3 Masonry scrollbar padding — done by the user directly.

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
- [ ] 4.2 Delete `ContactLookup`; `buildContactFromActor` takes the index. **F1 is still open** —
      two concurrently-syncing mailboxes still hold separate caches.
- [ ] 4.4 Audit `plugin-github/sync`, `assistant-toolkit/linear/sync-issues`.
- [ ] 4.5 **Selective extraction** — a type-specific `shouldExtract` on the spec/extractor, so the
      cheapest fix for duplicate volume is not creating the object at all. Person rules:
      extract when we send or reply to the address; extract when the domain matches an existing
      Organization; never extract `no-reply@`/`noreply@`/`donotreply@`, bulk/list mail
      (`List-Unsubscribe`, `Precedence: bulk`), or automated-sender patterns.

## Phase 5 — compound table cells

- [ ] 5.1 Chips + overflow popover for scalar arrays.
- [ ] 5.2 Primary + popover for compound arrays (`emails`).
- [ ] 5.3 Schema-driven summary + popover for compound values (`address`).

## Out of scope

Persisted "not a duplicate" assertions; cross-peer convergent merge (see
`.agents/projects/object-merging/`); automatic non-reviewed merging.
