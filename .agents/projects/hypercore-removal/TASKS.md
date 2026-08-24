# Hypercore removal — credentials over Automerge — Tasks

_Resume: project created 2026-08-24; every open question resolved and both read seams located. NOTHING IMPLEMENTED. Next: start PR A item 1 (space root doc + id derivation) — see "Delivery plan" below._

Branch `claude/remove-hypercore-automerge-creds-uo7lx9`. Rationale in `DESIGN.md`.

## Delivery plan — two PRs to 90%

Both PRs land the dual-path world: nothing is deleted, old spaces keep working, and new spaces are
root-anchored by DEFAULT — legacy key-derived creation is the explicit opt-out. Hypercore deletion
(Phase 4) is explicitly NOT in scope for either.

`CreateSpaceOptions.useSpaceRootDocument` (per-space, default TRUE) selects the anchor at
`DataSpaceManager.createSpace()`; pass `false` for a legacy key-derived space. It is the switch
every test matrix row below keys off, and the rollback lever if the new path misbehaves.

### Seams (found 2026-08-24)

- **Client read seam is `ControlPipeline`** (`packlets/space/control-pipeline.ts`): it wraps a
  feed `Pipeline` and drives `SpaceStateMachine.process(credential)`. Dual support = extract a
  `CredentialSource` behind it — `FeedCredentialSource` (today) and `DocCredentialSource` (new)
  — both feeding the same state machine, plus a matching writer. The state machine, member
  logic, invitations and epochs are untouched.
- **Client write seam is `spaceGenesis()`** + `space.inner.controlPipeline.writer` (the three
  `writeMessages` call sites in `space-invitation-protocol.ts`).
- **EDGE read seam is the `SpaceStateMachine` DO**
  (`db-service/src/worker/space/space-state-machine.ts`): it polls feed-replicator blocks and
  runs `FeedMessageProcessor`s against a store that persists credentials, members and a feed
  cursor. Doc-backed source = subscribe to the space credentials doc (db-service already hosts
  automerge) and run the SAME processors; the cursor becomes automerge heads instead of a feed
  cursor.

### PR A — `dxos/dxos`

1. Space root doc + `createIdFromRootDocumentId()` + `idDerivation` (Phase 1).
2. `echo_spaces` migration: root/directory/credentials columns (Phase 1).
3. `CredentialSource` extraction behind `ControlPipeline`, doc-backed implementation, ordering
   contract (Phase 2).
4. `SpaceMember` assertion carries the space root doc URL beside `genesis_feed_key`; both
   invitation protocols and `cross-device-space-synchronizer.ts` read it (Phase 2).
5. `useSpaceRootDocument` and dual-path readers.
6. Client-side migration of a legacy space, dual-write, per-space flip (Phase 3).

### PR B — `dxos/edge`

1. Doc-backed credential source for the `SpaceStateMachine` DO, behind the same
   per-space selector; feed path retained.
2. Auth negative-cache invalidation on credential apply
   (`automerge-replicator-auth.ts`).
3. A space mid-flip refuses admissions.

PR A can land first and is independently testable — a space that has flipped simply has no
EDGE-side reader until PR B, which is why the flip is per-space and reversible.

### Test matrix

Coverage note: the credential flows do NOT live in `echo-client-e2e` — that suite is the
object/query layer. They live in `sdk/client-services` (`data-space-manager.test.ts`,
`invitations-handler.test.ts`, `control-pipeline.test.ts`) and `core/halo/halo-e2e`
(`spaces.test.ts`). So the split is:

- **`echo-client-e2e`** — space root doc, id derivation + test vectors, directory rotation,
  `echo_spaces` load/persist. The storage-layer half.
- **`client-services` + `halo-e2e`** — everything credential: genesis on both paths, space
  invite, device/HALO invite, cross-device reconstruction, dual-write, and **the migration of a
  real legacy hypercore space to the doc-backed form**, including a mid-migration crash and a
  re-run.
- **`edge`** — `*.workerd.test.ts` for the doc-backed DO source and the auth cache
  invalidation.

Rows to cover, each under both flag states where it applies: create → genesis → read back;
invite a member; admit a second device; reconstruct on a third device from credentials alone;
migrate legacy → doc; migrate with a concurrent credential append; re-run a completed
migration; crash mid-migration and resume.

## Phase 0: audit (before any code)

- [x] **Consumer split done.** Queues use `@dxos/feed` (`packages/core/echo/feed`,
      SQLite-backed, unrelated `FeedStore`) and touch no hypercore. Only four packages
      depend on hypercore / `@dxos/feed-store`: `common/hypercore`, `common/feed-store`,
      `mesh/teleport-extension-replicator`, `sdk/client-services`. The credential chain is
      the last consumer, so full deletion is reachable.
- [x] **Client read seam found**: `ControlPipeline` (`packlets/space/control-pipeline.ts`)
      wraps a feed `Pipeline` and drives `SpaceStateMachine.process()`. See "Seams" above.
- [x] Space keypair survives as credential issuer; loses id-minting and feed admission.
- [x] Keyhive: this is a prerequisite, lands first; credential bytes stay opaque so Keyhive
      needs no second topology migration.
- [x] **EDGE read seam found**: the `SpaceStateMachine` DO polls feed-replicator blocks into
      `FeedMessageProcessor`s over a store holding credentials/members/feed cursor. See
      "Seams" above.
- [ ] Remaining: `edge-feed-replicator` teardown inventory (Phase 4 only, not either PR).

## Phase 1: space root document

- [x] Define the space-root schema in `echo-protocol`, typed `dxn:org.dxos.document.spaceRoot:0.1.0`
      (versioned DXN per `keys/src/DXN.ts`, key spelled `type` not `@type` — see DESIGN).
- [ ] `createIdFromRootDocumentId()` in `echo-protocol/src/space-id.ts` beside
      `createIdFromSpaceKey`; version-tag which scheme minted an id.
- [x] Extend `echo_spaces` (SQL migration `0002_space_root.sql`) with `space_root_doc_url`,
      `credentials_doc_url` and `id_derivation`. `root_doc_url` KEEPS meaning the directory —
      every existing reader treats it that way, so the immutable root got its own column
      instead. That is also why `_saveSpace` upserts: `INSERT OR REPLACE` deleted the row and
      would have wiped these columns on each directory rotation.
- [x] `SpaceStateManager` loads/serves the root, directory and credentials refs
      (`getSpaceRootRefs`/`setSpaceRootRefs`).
- [ ] Make the directory reference indirect so rotation is a root write (today the root doc is
      recorded beside the directory rather than owning it).
- [x] Self-certification check — `verifySpaceRoot` recomputes the id for `rootDoc` roots and
      rejects an unknown derivation rather than treating it as the unverifiable `spaceKey` case.
- [x] Root-doc creation path — `EchoHost.createSpaceWithRootDocument()` creates the root, derives
      the space id from its document id, creates the directory beneath it and records the refs.
      NOTE: the pre-existing `createSpaceRoot()` creates the DIRECTORY; that naming predates this
      model and should be renamed with the diagnostics field below.
- [x] Wired into `DataSpaceManager.createSpace()` as the PER-SPACE option
      `CreateSpaceOptions.useSpaceRootDocument`, defaulting to TRUE — pass `false` to create a
      legacy key-derived space, which the migration tests need. An imported space
      (`rootUrl`/`documents`) keeps the key-derived id.
- [x] `SpaceMetadata.space_id` (field 13) carries the id when it was NOT derived from the key, and
      `SpaceManager._constructSpace` prefers it. This was the blocker: everything downstream of
      construction re-derived the id from the key and would have disagreed with the root.
- [x] `mesh-echo-replicator.authorizeDevice()` now takes a SPACE ID, not a key. It derived the id
      from the key to key its authorization map, so with the default flipped it recorded every
      authorization under an id no document belonged to and p2p replication silently never
      authorized (three cross-peer tests hung for 15s). This is the failure mode to expect from
      every remaining derive site.
- [ ] Remaining `createIdFromSpaceKey` sites, still correct for legacy spaces but suspect for
      root-anchored ones: `automerge-host.ts` (`getSpaceKeyByRootDocumentId`, reached only via the
      `access.spaceKey` fallback) and `space-protocol.ts` (swarm topic — derives the topic from the
      key on both sides, so it is self-consistent, but it means two peers of the same space still
      rendezvous by key).

## Phase 2: credentials document

- [x] **Ordering contract** — `credentials-document.ts` in `@dxos/credentials`. Credentials are a
      map keyed by credential id, so an append is idempotent and concurrent appends converge;
      `orderCredentials()` produces the total order every peer computes identically —
      `parentCredentialIds` win (clock skew can date a parent after its child), ties break on
      `(issuanceDate, id)`. Every ordering input is read from the ENCODED credential, never from
      the entry around it, so a peer cannot reorder processing by editing the document; an entry
      keyed by something other than its credential id, or that does not decode, is dropped. An
      unreplicated parent does not block its child (the state machine rejects an unverifiable
      chain anyway) and a cycle keeps every credential rather than dropping it.
- [ ] Credentials doc physical shape (as implemented in `credentials-document.ts`): a MAP keyed by
      credential id whose values hold only the encoded bytes — not an array. The key is what makes a
      duplicate append idempotent and concurrent appends converge; an array would need a separate
      dedup rule and would race for indices. Order is computed on read by `orderCredentials()`.
- [ ] Write path — `spaceGenesis()` emits into the credentials doc instead of the control feed;
      drop the two `AdmittedFeed` credentials.
- [ ] Read path — feed the credential processor from the doc array; preserve ordering
      semantics the state machine relies on.
- [ ] Notarization (`notarization-plugin.ts`) and invitations over the new write path.
- [x] **Joiner bootstrap resolved** — no discovery needed; the pointer rides the admission
      credential exactly as `genesisFeedKey` does today, and EDGE authorizes replication from
      its own SpaceMember state, not from what the joiner has read. See DESIGN "Bootstrap and
      cutover".
- [x] **`SpaceMember.space_root_url` added beside `genesis_feed_key`** (field 7, optional) and
      threaded through `createAdmissionCredentials` → `admitMember` → `acceptSpace`, including
      `cross-device-space-synchronizer.ts`. Absent for a space still on its control feed.
- [x] Populated at genesis, and `admitMember` resolves the root itself so no invitation call site
      can emit a credential without it.
- [x] `acceptSpace` derives the space id from the admitting credential's root URL — without it the
      joiner built a key-derived id and disagreed with the creator about which space it was in.
- [ ] `device-invitation-protocol.ts` equivalent for the HALO space.
- [ ] **NAME COLLISION to resolve**: `spaces-service.ts` already reports a `spaceRootUrl` in
      pipeline diagnostics meaning the DIRECTORY (`space.databaseRoot?.url`). Two different
      documents under one name will bite; rename the diagnostics field.
- [ ] `createAdmissionCredentials` is now 10 positional parameters — convert to an options bag.
- [ ] **Invalidate the EDGE auth negative cache on credential apply**
      (`automerge-replicator-auth.ts`, `AUTH_CACHE_TTL_MS`) — a joiner that dials before the
      admission lands is denied for up to 60s. Pre-existing, more reachable after this change.
- [ ] Replication: credentials doc joins normal subduction; fresh-joiner test that reads
      credentials before being admitted to anything else.
- [ ] Replay test: old feed vs new document produce identical membership/invitation/epoch
      state.

## Phase 3: migration (dual-path, per-space atomic cutover)

- [x] **Anchor migration for legacy spaces** — `EchoHost.migrateSpaceToRootDocument()` mints a root
      over the existing directory with `idDerivation: 'spaceKey'`, keeping the id (it came from the
      space key and no document can reproduce it), and is idempotent so a re-run cannot fork the
      anchor. `DataSpaceManager` runs it transparently on space load and never lets a failure block
      opening. Covered end to end: a space created with `useSpaceRootDocument: false` migrates,
      keeps its id and directory, keeps its control-feed credentials, and re-migrates to the same
      root.
- [x] **Credential mirroring** — `CredentialsDocumentStore` (client-services, where echo-host and
      credentials meet; echo-host itself does not depend on `@dxos/credentials`) appends credentials
      keyed by id, and `DataSpaceManager` subscribes to `Space.credentialProcessed` on load. Since the
      control pipeline replays the whole feed on open, one subscription both backfills the existing
      chain and dual-writes new credentials. Covered: a migrated space's document replays to exactly
      the feed's chain, and re-appending is a no-op so the backfill is re-runnable.
- [x] **Replay equivalence proven** — a fresh `SpaceStateMachine` fed only from the document reaches
      the same genesis credential, member set and membership policy as the feed-driven one. This is
      the equivalence the source flip depends on, and `process()` both dedupes by credential id and
      verifies signatures, so a tampered or repeated entry cannot change the outcome.
- [ ] READ side: feed the LIVE state machine from the document (the `CredentialSource` split inside
      `ControlPipeline`). Until then the document is written and provably replayable but never read
      in production, so the feed is still the only source and no space has actually flipped.
- [ ] **`ProcessOptions.sourceFeed` is required and feed-shaped** — it must become optional before a
      document can be the source; `CredentialEntry.sourceFeed` has the same problem. Found while
      writing the replay test, which passes the genesis feed key to get around it.

- [ ] Reader accepts BOTH sources (control feed and credentials doc) for the whole
      migration window — client and EDGE alike.
- [ ] **Dual-write during the window** — a migrating space writes every credential to BOTH
      the control feed and the credentials doc, so either reader stays complete and no
      watermark or write-freeze is needed. Migration must be re-runnable without duplication
      (duplicates are signature-idempotent per the ordering contract).
- [ ] A space mid-flip must not accept admissions until EDGE reads its credentials from the
      doc.
- [ ] Client migrates one space at a time, ATOMICALLY: mint a root doc over the current
      directory, copy credentials out of the control feed, rewrite `echo_spaces`, flip the
      space to the doc source. Space id UNCHANGED. No space is ever half-migrated.
- [ ] EDGE reads a given space's credentials from exactly one source — the per-space flip is
      the only thing that switches it.
- [ ] Single-writer/adopt protocol so peers converge on one root doc per legacy space.
- [ ] Migration test over a real profile fixture: mid-migration crash, concurrent credential
      writes, and re-running the migration.
- [ ] Retire the dual path once no space reports the feed source.

## Phase 4: delete hypercore

- [ ] Remove `edge-feed-replicator` + `teleport-extension-replicator` credential paths.
- [ ] EDGE-repo counterpart change + deploy coordination.
- [ ] Delete `packages/common/hypercore`, `packages/common/feed-store` (subject to Phase 0
      findings on non-credential consumers), the `hypercore*` typings and deps.
- [ ] `pnpm knip`, full build + test, changeset.
