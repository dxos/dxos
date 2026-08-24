# Hypercore removal — credentials over Automerge — Tasks

_Resume: project created 2026-08-24; every open question resolved and both read seams located. NOTHING IMPLEMENTED. Next: start PR A item 1 (space root doc + id derivation) — see "Delivery plan" below._

Branch `claude/remove-hypercore-automerge-creds-uo7lx9`. Rationale in `DESIGN.md`.

## Delivery plan — two PRs to 90%

Both PRs land the dual-path world: nothing is deleted, old spaces keep working, new spaces are
opt-in. Hypercore deletion (Phase 4) is explicitly NOT in scope for either.

`DX_SPACE_CREATE_LEGACY` (config flag, default OFF once PR A lands, ON until then) selects the
old control-feed genesis at `DataSpaceManager.createSpace()`. It is the switch every test
matrix row below keys off, and the rollback lever if the new path misbehaves in the field.

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

1. Space root doc + `spaceIdFromRootDocumentId()` + `idDerivation` (Phase 1).
2. `echo_spaces` migration: root/directory/credentials columns (Phase 1).
3. `CredentialSource` extraction behind `ControlPipeline`, doc-backed implementation, ordering
   contract (Phase 2).
4. `SpaceMember` assertion carries the space root doc URL beside `genesis_feed_key`; both
   invitation protocols and `cross-device-space-synchronizer.ts` read it (Phase 2).
5. `DX_SPACE_CREATE_LEGACY` and dual-path readers.
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

- [ ] Define the space-root schema in `echo-protocol`, typed `dxn:org.dxos.document.spaceRoot:0.1.0`
      (versioned DXN per `keys/src/DXN.ts`, key spelled `type` not `@type` — see DESIGN).
- [ ] `spaceIdFromRootDocumentId()` in `echo-protocol/src/space-id.ts` beside
      `createIdFromSpaceKey`; version-tag which scheme minted an id.
- [ ] Extend `echo_spaces` (SQL migration under `db-host/../migrations/space-state`) with
      `directory_doc_url` + `credentials_doc_url`; keep `root_doc_url` meaning the ROOT now,
      not the directory.
- [ ] `SpaceStateManager` loads/serves the root, directory and credentials refs; the
      directory reference becomes indirect so rotation is a root write.
- [ ] Root-doc creation path + self-certification check (recompute the id from the URL).

## Phase 2: credentials document

- [ ] **Ordering contract first** — define convergence for concurrent appends, duplicate
      idempotence (by signature), and replay equivalence with the feed. Everything below
      depends on it; DESIGN "Credentials keep their current encoding".
- [ ] Credentials doc: append-only array of the existing encoded credential bytes.
- [ ] Write path — `spaceGenesis()` emits into the credentials doc instead of the control feed;
      drop the two `AdmittedFeed` credentials.
- [ ] Read path — feed the credential processor from the doc array; preserve ordering
      semantics the state machine relies on.
- [ ] Notarization (`notarization-plugin.ts`) and invitations over the new write path.
- [x] **Joiner bootstrap resolved** — no discovery needed; the pointer rides the admission
      credential exactly as `genesisFeedKey` does today, and EDGE authorizes replication from
      its own SpaceMember state, not from what the joiner has read. See DESIGN "Bootstrap and
      cutover".
- [ ] **Swap `SpaceMember.genesis_feed_key` for the space root doc URL** in the credential
      ASSERTION (not just the AdmissionResponse envelope) — `space-invitation-protocol.ts`,
      `device-invitation-protocol.ts`, and the `acceptSpace()` call in
      `cross-device-space-synchronizer.ts`, which is the path that would silently lose its
      pointer.
- [ ] **Invalidate the EDGE auth negative cache on credential apply**
      (`automerge-replicator-auth.ts`, `AUTH_CACHE_TTL_MS`) — a joiner that dials before the
      admission lands is denied for up to 60s. Pre-existing, more reachable after this change.
- [ ] Replication: credentials doc joins normal subduction; fresh-joiner test that reads
      credentials before being admitted to anything else.
- [ ] Replay test: old feed vs new document produce identical membership/invitation/epoch
      state.

## Phase 3: migration (dual-path, per-space atomic cutover)

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
