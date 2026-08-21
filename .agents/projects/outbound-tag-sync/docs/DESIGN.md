# Outbound Tag Sync — Design

Bidirectional email tag/label sync: applying or removing a provider label on an email in
Composer is pushed back to the provider (Gmail label / JMAP mailbox·keyword) on the next edge
sync run. Both providers (plugin-google, plugin-jmap).

Designed against main @ `1c995c468d`; all file citations below re-verified at that commit
(2026-08-14) — no drift.

## Goal & scope

- **Core acceptance:** add a Gmail label to a message in Composer → next sync run → label
  visible in Gmail.
- Offline durability is NOT a design constraint — sync is edge-driven; retry across sync
  ticks is sufficient.

## Current state

- **Inbound label→tag sync is landed.** Gmail labels map to DXOS Tag objects
  (`packages/plugins/plugin-google/src/operations/mail/tags.ts` — `GMAIL_TAG_SOURCE` foreign
  key; system labels map to canonical SystemTags via `GMAIL_SYSTEM_TAGS`). The delta path
  (`history.list`) folds `labelsAdded`/`labelsRemoved` into `retag` reconcile items
  (`packages/plugins/plugin-google/src/operations/mail/sync/sync-provider.ts`,
  `collectLabelChanges`) applied by the shared harness
  (`packages/plugins/plugin-inbox/src/sync/mail-sync.ts`, `reconcileToChanges`).
- **JMAP mirrors this:** folders/keywords → tags
  (`packages/plugins/plugin-jmap/src/operations/mail/tags.ts`, `JMAP_DOMAIN`); its reconcile
  re-fetches `updated` emails and diffs.
- **NO outbound path exists:** nothing calls Gmail `users.messages.modify` for labels. The
  only Gmail write scopes in use: `gmail.send`, and `gmail.modify` solely for trash
  (`packages/plugins/plugin-google/src/capabilities/connector.ts:136`) — so the OAuth scope
  needed for label writes is ALREADY granted.
- **JMAP already has a generic write primitive:** `emailSetUpdate`
  (`packages/plugins/plugin-jmap/src/apis/JmapMail/api.ts:216`, used for trash).
- **Provider tags are read-only by design:** `Tag.isProviderTag`
  (`packages/core/echo/echo/src/Tag.ts:61`) and `partitionMetaTags`
  (`packages/ui/react-ui-form/src/components/Form/meta-tags.ts:87`).
- **No user-facing tag-apply UI on inbox messages yet** — only the classifier/extractor call
  `Mailbox.applyTag` (`packages/plugins/plugin-inbox/src/types/Mailbox.ts:205`).
- **The three-way-merge connector pattern this project reuses already exists:**
  `Cursor.readSnapshot`/`writeSnapshot` on the external binding
  (`packages/core/compute/link/src/Cursor.ts:178-195`) + shared merge primitives in
  `packages/sdk/app-toolkit/src/types/ConnectorSync.ts` (`mergeField`, `mergeDeep`), used by
  plugin-linear/sync.ts (also Trello/GitHub). Mail sync does not use snapshots yet.
- **Testing:** `GoogleMailApi.mock`
  (`packages/plugins/plugin-google/src/services/google-mail-api.ts`) serves an in-memory
  `GmailDataset` incl. historyLog steps; sync.test.ts / sync-e2e.test.ts / sync-bench.test.ts
  drive the real pipeline offline. JMAP has equivalent fixtures.

## Architecture (DECIDED)

> A pending-op journal / intent log was **explicitly rejected** — do not substitute one.
> Everything is computed by diffing against a per-message last-sync snapshot.

Per synced message the binding stores the tag set as of last sync, in **tag-uri space** (the
canonical middle: local side = the Mailbox TagIndex; remote side = provider label ids mapped
through the existing labelMap):

- `Cursor.writeSnapshot(binding, foreignId, { tagUris })` written at three points: insert
  commit, inbound retag apply, outbound push success.
- Each sync run, per message, a **set-wise three-way merge**: base = snapshot; local =
  current tag index; remote = base ⊕ delta (Gmail `labelsAdded`/`labelsRemoved`) or the
  re-fetched current set (JMAP `updated` re-fetch).
  - local△base only → push outbound (provider write)
  - remote△base only → apply inbound (existing retag commit path)
  - both moved same way → no-op
  - true conflict (local add vs remote remove, or inverse) → **LOCAL WINS** (user intent is
    the feature); policy isolated in one function
  - no snapshot (pre-existing messages / first run after upgrade) → **first-sync**: take
    remote, push nothing, write snapshot — upgrade-safe by construction
- Merged result becomes the new snapshot. **Echo-proof:** when the provider's next delta
  reports our own push back, remote == base → merge no-op. No suppression bookkeeping.
- **Local-change discovery = scan:** diff `buildMessageTagsIndex(mailbox)` against snapshots
  over the committed foreign index. Pure in-memory ECHO data, no API calls. Acceptable at
  current scale; dirty-set optimization is a follow-up, not v1.
- **Push failure:** log + leave that message's snapshot unadvanced → self-retries next tick.
  Per-run push budget alongside `maxMessages`.

### Open sub-decision (resolve in Phase 1 with a size measurement)

`cursor.spec.snapshots` is one record on the binding object; thousands of messages × tag
arrays is real growth.

1. Keep on binding + prune to sync window **[default]**
2. Child object beside TagIndex

### Provider specifics

- **Gmail:** new `modifyMessage` API (`users.messages.modify`,
  `addLabelIds`/`removeLabelIds`). Reverse tag map: custom labels via `GMAIL_TAG_SOURCE`
  foreign key; canonical via inverted `GMAIL_SYSTEM_TAGS`. Empirically verify which system
  labels modify accepts (`CATEGORY_*` suspect); unpushable → skip + log + exclude from the
  merge's push side so they don't retry forever. Remote set derived by folding
  `labelsAdded`/`labelsRemoved` onto base per message (no extra fetch). Unmapped user tags
  (no Gmail label): skip; label creation is a follow-up.
- **JMAP:** push via existing `emailSetUpdate`: folder tags patch `mailboxIds/<id>`, flag
  tags patch `keywords/<kw>` via inverted JMAP system-tag map; remote set from existing
  re-fetch. **Folder floor:** an email must keep ≥1 mailbox; removing the last folder tag →
  skip + log.

### Tag applicability split

Provider tags stay non-renamable/non-recolorable but become **membership-toggleable**:
`isProviderTag` (`packages/core/echo/echo/src/Tag.ts`) splits into two predicates; audit all
call sites (meta-tags.ts, SystemTags.ts).

## Sequencing

- **PR 1** = Phases 1+2 (Gmail round-trip demos the core goal)
- **PR 2** = Phase 3 (JMAP)
- **PR 3** = Phase 4 (Composer UI; parallelizable after Phase 1)
- Tests ride each PR.

## Follow-ups (out of scope for v1)

- Dirty-set scan optimization (v1 scans the full committed foreign index).
- Label creation for unmapped user tags.
- Read-state (UNREAD / `$seen`) sync.
- Local (non-edge) sync parity.
