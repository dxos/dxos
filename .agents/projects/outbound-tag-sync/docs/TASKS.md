# Outbound Tag Sync — Tasks

_Resume: Start Phase 1 — `mergeSet` primitive in app-toolkit ConnectorSync. Uncommitted: none. Last: project scaffolded (docs + registry entry); no implementation yet._

Design + decisions: [DESIGN.md](./DESIGN.md). PR sequencing: PR 1 = Phases 1+2, PR 2 =
Phase 3, PR 3 = Phase 4 (parallelizable after Phase 1); tests ride each PR.

## Phase 1: Merge machinery (app-toolkit, plugin-inbox)

The snapshot three-way merge core, shared by both providers, plus the harness rewiring and
the Tag applicability split.

### Tasks

- [ ] **Add `mergeSet` primitive to ConnectorSync** (`packages/sdk/app-toolkit/src/types/ConnectorSync.ts`)
  - Element-wise three-way membership merge returning `{ merged, pushAdd, pushRemove, applyAdd, applyRemove }`.
  - Local-wins conflict policy isolated in one place.
  - Unit tests covering the full element truth table.
- [ ] **Tag-snapshot helpers in plugin-inbox/sync** over `Cursor.readSnapshot`/`writeSnapshot` (`{ tagUris }`)
  - Three write points: insert commit, inbound retag apply, outbound push success.
  - Resolve storage-location decision (a: on binding + prune to sync window [default] vs b: child object beside TagIndex) with a size measurement.
- [ ] **Rewire the harness** (`packages/plugins/plugin-inbox/src/sync/mail-sync.ts`)
  - Replace apply-remote-blindly retag reconcile with the merge — provider reconcile branch supplies remote per-message tag sets.
  - Route `apply*` to the existing retag commit path; `push*` to a new OPTIONAL `MailSyncProviderService.pushTagChanges(ops)`.
  - Add the local-discovery scan (diff `buildMessageTagsIndex(mailbox)` against snapshots).
  - Per-run push budget alongside `maxMessages`; push failure = log + leave snapshot unadvanced.
- [ ] **Tag applicability split** (`packages/core/echo/echo/src/Tag.ts`)
  - Provider tags stay non-renamable/non-recolorable but become membership-toggleable.
  - Audit all `isProviderTag` call sites (meta-tags.ts, SystemTags.ts) and split into two predicates.

## Phase 2: Gmail (plugin-google)

Outbound push via `users.messages.modify`; with Phase 1 this demos the core acceptance
(PR 1).

### Tasks

- [ ] **`modifyMessage` API** (`users.messages.modify`, `addLabelIds`/`removeLabelIds`) in `apis/GoogleMail/api.ts` + `GoogleMailApiService` + mock
  - Mock mutates the dataset AND appends a historyLog step so tests exercise the echo round-trip.
- [ ] **Reverse tag map**
  - Custom labels via `GMAIL_TAG_SOURCE` foreign key; canonical via inverted `GMAIL_SYSTEM_TAGS`.
  - Empirically verify which system labels modify accepts (`CATEGORY_*` suspect); unpushable → skip + log + exclude from the merge's push side so they don't retry forever.
- [ ] **Remote-set derivation** — fold `labelsAdded`/`labelsRemoved` onto base per message (no extra fetch).
- [ ] **Unmapped user tags** (no Gmail label): skip; label creation is a follow-up.

## Phase 3: JMAP (plugin-jmap)

Outbound push via the existing `emailSetUpdate` primitive (PR 2).

### Tasks

- [ ] **`pushTagChanges` via `emailSetUpdate`** — folder tags patch `mailboxIds/<id>`, flag tags patch `keywords/<kw>` via inverted JMAP system-tag map; remote set from the existing `updated` re-fetch.
- [ ] **Folder floor** — email must keep ≥1 mailbox; removing the last folder tag → skip + log.
- [ ] **Mock parity** — `emailSetUpdate` mutates the mock dataset + changes log.

## Phase 4: Composer UI (plugin-inbox)

Tag add/remove affordance on messages (none exists today); parallelizable after Phase 1
(PR 3).

### Tasks

- [ ] **Tag add/remove affordance in ConversationStack** — picker + chip remove, writing via `Mailbox.applyTag`/`removeTag` (no special API — the scan finds it); provider tags selectable but label/hue-locked.
  - Follow the composer-ui skill; storybook + play fn.

## Phase 5: Tests + landing

### Tasks

- [ ] **Unit tests, both providers** — round-trip echo no-op; conflict truth table; first-sync/no-snapshot upgrade; unpushable skip; failure-retry-via-stale-snapshot; snapshot pruning.
- [ ] **Live e2e** — label round-trip in sync-e2e.test.ts (creds-gated).
- [ ] **Changesets** — plugin-inbox, plugin-google, plugin-jmap, app-toolkit, echo.

## Follow-ups

- [ ] Dirty-set scan optimization (v1 scans full committed foreign index).
- [ ] Label creation for unmapped user tags.
- [ ] Read-state (UNREAD / `$seen`) sync.
- [ ] Local (non-edge) sync parity.

### References

- [DESIGN.md](./DESIGN.md) — architecture, decisions, verified file anchors.
- Existing merge pattern: `packages/sdk/app-toolkit/src/types/ConnectorSync.ts`, `packages/core/compute/link/src/Cursor.ts`, plugin-linear/sync.ts.
