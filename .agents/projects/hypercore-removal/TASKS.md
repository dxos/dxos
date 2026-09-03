# Hypercore removal — credentials over Automerge — Tasks

_Resume (2026-08-28): PRs `dxos/dxos#12726` (merged), `#12774` (merged), `#12825` (open, green) and
`dxos/edge#945` (open, green). Phase 1 done. Phase 2 done on the WRITE side and on the EDGE read side,
including the pieces that made the edge path actually work end to end: edge is TOLD its space root over
`POST /db/spaces/:spaceId/root` (write-once, genesis-checked, KV-cached), the client reports it on anchor
with backoff, the space root and credentials documents are named in the replicated document set, credential
documents are read from whichever replicator realm holds them, and HALO documents now replicate between an
identity's own devices. What is still NOT done is the CLIENT read flip: there is no `CredentialSource`
behind `ControlPipeline`, so the client still reads its credentials from the control feed and the document
is written but never authoritative. Phase 3 is PARTLY done — the anchor migration, credential mirroring, EDGE
dual-source read, root reporting and HALO replication items below are checked; what remains is the client
read flip and the still-unchecked Phase 3 items. Phase 4 is out of scope for every PR so far by design._

> **Historical note on `idDerivation`.** Phases 1–3 below were written when a space could be anchored
> either on its key or on its root document, recorded as `idDerivation`. That was BACKTRACKED: a space id
> is now ALWAYS `SHA-256(spaceKey)[0..20]` and `idDerivation` no longer exists in the code. Every mention
> of it below is historical plan text, not a current contract.

## Resolved decision (2026-08-27) — was blocking Phase 3

Shape 2: the client creates the documents and EDGE records them. Shape 1 (EDGE performs the migration) was
dropped because edge cannot identify a space root on its own — a space id is `SHA-256(spaceKey)[0..20]` and
no document id reproduces it, and the subduction replicator never materializes documents to inspect. So the
record is a client report, made safe rather than authoritative: write-once per space, and a space migrating
off the control feed must present a root carrying the genesis credential issued by its known space key.

This also delivers `haloSpaceRootUrl` — the inviting device names its root in the device invitation and the
joining device adopts it.

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
2. ~~Auth negative-cache invalidation on credential apply
   (`automerge-replicator-auth.ts`).~~ MOOT — dxos/edge#990 deleted the classical
   `AutomergeReplicator` and its authenticator outright; subduction has no such cache.
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
- [x] `createIdFromRootDocumentId()` in `echo-protocol/src/space-id.ts` beside
      `createIdFromSpaceKey` — SHA-256 over the document id, truncated to `SpaceId.byteLength` and
      multibase-encoded, so both schemes mint the same shape of id. Which scheme minted it is
      recorded as `idDerivation` on the root rather than inside the id.
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
- [x] Credentials doc physical shape (as implemented in `credentials-document.ts`): a MAP keyed by
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
- [x] **HALO space anchored on a root document.** `IdentityManager` mints a directory (HALO never
      had one — its state lived entirely in the control feed), then a root, and mirrors the chain
      into a credentials document. `openCredentialsDocument` is reused unchanged, since
      `identity.space` is the same `Space` class as `DataSpace.inner`. The host is supplied after
      construction via `IdentityManager.setEchoHost`, because `EchoHostLayer` already depends on
      `IdentityManagerService` for its peer id and a constructor dependency would make the layer
      graph circular — the same late-wiring the file already uses for `setFeedSyncHandlers`.
- [x] **HALO stays `idDerivation: 'spaceKey'` — and this is not a migration compromise.** Recovery
      reconstructs the halo space from `haloSpaceKey` alone (`identity-recovery-manager.ts`, from
      `RecoverIdentityResponse` in `edge.ts`), and device invitations carry `haloSpaceKey`. A
      root-derived halo id would leave a recovering device computing an id no replicated document
      belongs to. Consequence: **the EDGE derivation-based root resolution cannot find a HALO
      root**, so HALO cannot read credentials from the document on EDGE until either the recovery
      response carries the root URL, or EDGE learns the root some way other than by derivation.
- [x] **`AddOnlySet` (`@dxos/echo-doc`)** — reads a map from the automerge change history so a
      delete cannot erase an entry, and a rewrite cannot displace one (first write wins).
      Values are bytes because only a scalar is a single op carrying its own value; a JS string
      becomes a text CRDT that would have to be replayed character by character.
- [x] **Credentials document reads from the change history, on both sides.** The entry is flat
      (`{ [id]: bytes }`) because a nested map cannot be recovered from history; `orderCredentials`
      takes the already-read entries rather than the document, which keeps `@dxos/credentials` free
      of any automerge dependency and converges it with the edge copy. The edge reader — the
      security-critical one, since it decides membership — goes through the same scan, covered end
      to end by `space-credentials-source.workerd.test.ts` deleting a credential from the replicated
      document and still being served it.
- [x] `DeviceAdmissionCredentials` carries `halo_space_root_url`, and the joining device adopts it
      (`EchoHost.adoptSpaceRoot`) rather than minting a second root over the same space. The probe is
      local-only (`fetchFromNetwork: false`): blocking on the network cost every device join 5s.
- [ ] **BLOCKER for the halo document path: halo documents have no replication between devices.**
      `identity.ts` wires only `EdgeFeedReplicator`; there is no automerge replicator for the halo
      space, so the root and credentials documents written there are local to each device and reach
      neither the other device nor EDGE. The credential chain therefore still travels only as a feed
      for HALO, and a joining device can never actually adopt the root it is told about — it
      correctly mints nothing instead. Until this is solved the halo conversion is write-side only.
- [x] **NAME COLLISION resolved.** The pipeline diagnostics field meaning the DIRECTORY is now
      `directory_url` (`services.proto` field 22, number unchanged so the wire is unaffected), leaving
      `spaceRootUrl` to mean the space root document everywhere. Call sites updated: `spaces-service.ts`,
      `space-proxy.ts` (×2), `cli-util/space-format.ts`. `FunctionProtocol.spaceRootUrl` also means the
      directory but is a separate hand-written contract consumed by deployed functions, so it is left
      alone rather than widened into this change.
- [x] `createAdmissionCredentials` is now 10 positional parameters — convert to an options bag.
- [x] **EDGE auth negative cache — no longer a thing to fix.** The fix (cache only an allow, so a
      joiner that dialled before its admission landed is not refused for the rest of the 60s TTL)
      and its `automerge-replicator-auth.workerd.test.ts` were both dropped when edge#945 was
      rebased: dxos/edge#990 deleted `AutomergeReplicator` and `AutomergeReplicationAuthenticator`
      with it. Subduction carries no per-identity auth cache, so there is nothing left to
      invalidate. Re-check if one is ever introduced there.
- [ ] Replication: credentials doc joins normal subduction; fresh-joiner test that reads
      credentials before being admitted to anything else.
- [x] Replay test: replaying the document into a fresh `SpaceStateMachine` reaches the same genesis,
      members and membership policy the feed did, including an admitted member and its role, and the
      append is idempotent. Epoch equivalence is NOT covered — these tests produce no epochs, so it
      needs a fixture that does.

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
- [x] **`ProcessOptions.sourceFeed` / `CredentialEntry.sourceFeed` are optional** — absent means the
      credential came from the document. An `AdmittedFeed` assertion with no source feed is then inert
      rather than invalid (a document-sourced space admits no feeds), and the control-pipeline snapshot
      skips entries with no feed, since a snapshot only replays into the feed pipeline.
- [x] **READ side live** — `CredentialsDocumentStore.subscribe()` replays the document into the same
      state machine the feed drives, via `Space.processDocumentCredential`. Processing is idempotent by
      credential id, so both sources run during the migration window without conflict.
- [x] Ordering is recomputed on every document change, not once: a late-arriving parent reorders
      credentials that already arrived, and a partially-replicated document is a chain PREFIX that
      cannot be processed on its own — the state machine rejects it and the next change re-replays.
      This surfaced as a flaky test before it could surface as a support ticket.
- [x] **Genesis orders first, explicitly** — genesis carries no parent link and is issued in the same
      millisecond as the first membership credential, so the `(issuanceDate, id)` tiebreak decided
      their order and half the time the state machine saw a member admitted into a space that did not
      exist yet. The feed's implicit order hid this; a computed order cannot.
- [x] **Every space is anchored, not only ones loaded at startup** — `_anchorSpaceOnRootDocument` runs
      on load, on creation (root-anchored only) and on explicit migration, which now means anchor AND
      mirror. A space created legacy stays unanchored until it is loaded, or there would be no way to
      produce the pre-migration state the migration path is tested from. A space with no directory yet
      (an accepted space still catching up) is skipped rather than failing.
- [ ] The flip itself: stop consulting the feed for a space whose document is complete, and stop
      writing feed credentials for it. Both sources still run today.

- [x] **Reader accepts BOTH sources on EDGE** (dxos/edge#945) — `SpaceStateMachine` pulls from the
      credentials document alongside the control feed. Edge learns the root from the client via
      `POST /db/spaces/:spaceId/root` — an earlier version of this entry claimed derivation instead, see
      the historical note at the top. Cost: the wire contract
      and `orderCredentials` are DUPLICATED in the edge repo, because the catalog pins `@dxos/echo-protocol`
      to a commit predating them. A document write is not gated the way feed admission gates a block, so
      every credential is signature-verified before it reaches a processor.
- [x] **Rebased onto subduction** (2026-08-31) — dxos/edge#990 removed the classical
      `AutomergeReplicator`, which had held both the documents and the `getSpaceCredentials` RPC.
      `SpaceCredentialsSource` now reads through `initSubductionReplicator(spaceId).getDocumentsBytes`
      and holds no durable-object state, so `SpaceStateMachine` constructs one directly instead of
      paying a cross-DO hop; it moved to `worker/space/` beside the state machine to say so. The
      registry is what makes this work: it already held the root record precisely because the reader
      lives in a different durable object from the replicator.
- [x] **Edge is told the space root** — write-once record (`COALESCE`, returns the id in force), genesis
      credential checked against the space's known space key, cached in `GlobalKv` (safe without
      invalidation precisely because the record is write-once).
- [ ] **Follow-up: the root lookup has no negative cache.** Only a hit is cached, so every
      unanchored space re-asks the `SpaceRegistry` singleton once per state-machine poll — N spaces
      into one durable object, forever, for an answer that is "no" until the space is anchored. The
      reasoning for caching only hits is sound (a miss is the pre-anchor state), but the cost is
      real; a short-TTL negative entry would delay a flip by that TTL and nothing else. Decide
      before the flip goes wide, not after.
- [x] **Client reports the root on anchor** (dxos#12774) — `EdgeHttpClient.recordSpaceRoot`, retried with
      backoff on the manager's own context, since the invitation accept flow disposes its ctx as soon as
      `acceptSpace` returns.
- [x] **The three bugs the e2e suite exposed** — the space root and credentials documents hung off the
      space rather than the directory, so they were never in the replicated set; credentials were read
      through the classical replicator while replication landed in the subduction realm; and `acceptSpace`
      accepted a `spaceRootUrl` and then ignored it, minting a competing root.
- [x] **HALO documents replicate between devices** (dxos#12825) — halo sessions registered only the gossip
      extension, so a joining device could never fetch the root the inviter named. It now registers the
      automerge replicator extension too, and adoption retries to a ceiling.
- [ ] Reader accepts both sources on the CLIENT for the whole migration window.
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
