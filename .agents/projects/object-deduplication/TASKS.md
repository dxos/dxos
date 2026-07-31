# Object deduplication — tasks

Design: [DESIGN.md](./DESIGN.md). Branch `claude/person-deduplication-plugin-inbox-dbe8b2`.

## Phase 1 — engine (`@dxos/extractor`, `@dxos/extractor-lib`) ✅

- [x] 1.1 `IdentitySpec` (+ `IdentityRegistry`) in `@dxos/extractor`.
- [x] 1.2 `findDuplicates` (union-find over shared keys) + `DuplicateGroup`.
- [x] 1.3 `planMerge` (survivor = min EntityId) + detached preview.
- [x] 1.4 `applyMerge` (meta-key transfer, overrides fold, remove losers).
- [x] 1.5 `personIdentitySpec` + `organizationIdentitySpec` in `@dxos/extractor-lib`.
- [x] 1.6 Unit suite for Person duplicates — 21 tests green.
- [ ] 1.7 `IdentityIndex` (moved to phase 4, where `Resolver` consumes it).

## Phase 2 — operations

- [ ] 2.1 `FindDuplicates` / `ApplyMerge` definitions in `@dxos/extractor`.
- [ ] 2.2 `SpaceCapabilities.IdentitySpec` + handlers in `plugin-space`.
- [ ] 2.3 `plugin-crm` contributes the Person/Organization specs.

## Phase 3 — UI

- [ ] 3.1 `duplicates` layout value on `TypeArticle` (hidden with no spec).
- [ ] 3.2 Duplicates toolbar (Merge / Skip / counter / prev-next).
- [ ] 3.3 Merge-preview companion (Form over the uncommitted draft, Confirm/Cancel).
- [ ] 3.4 Storybook + play test.

### 3a — `TypeArticle` fixes requested alongside (2026-07-31)

- [ ] 3a.1 Table tab: a Delete button appears in the toolbar when rows are checked.
- [ ] 3a.2 Card tab: clicking a card selects/deselects it instead of navigating.
- [ ] 3a.3 Masonry scrollbar thumb flush with the edge — drop the padding outside the masonry.

## Phase 4 — fix the sources (F1–F4)

- [ ] 4.1 `Resolver.Live` reimplemented on `IdentityIndex`; per-`Database` `WeakMap` cache.
- [ ] 4.2 Delete `ContactLookup`; `buildContactFromActor` takes the index.
- [ ] 4.3 Google `upsertPerson`: fall back to the identity index, union emails instead of clobbering.
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
