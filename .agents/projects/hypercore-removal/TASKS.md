# Hypercore removal — credentials over Automerge — Tasks

_Resume: project created 2026-08-24; all four open questions answered by the user the same day and folded into DESIGN.md "Resolved". NOTHING IMPLEMENTED. Next: Phase 0 audit (now narrowed — the hypercore consumer split is already done)._

Branch `claude/remove-hypercore-automerge-creds-uo7lx9`. Rationale in `DESIGN.md`.

## Phase 0: audit (before any code)

- [x] **Consumer split done.** Queues use `@dxos/feed` (`packages/core/echo/feed`,
      SQLite-backed, unrelated `FeedStore`) and touch no hypercore. Only four packages
      depend on hypercore / `@dxos/feed-store`: `common/hypercore`, `common/feed-store`,
      `mesh/teleport-extension-replicator`, `sdk/client-services`. The credential chain is
      the last consumer, so full deletion is reachable.
- [ ] Map the control-feed read path: `data-space-manager.ts` → `Space` control pipeline →
      `@dxos/credentials` processor/state-machine. Identify the single seam where a
      credential array can be substituted for a feed iterator.
- [x] Space keypair survives as credential issuer; loses id-minting and feed admission.
- [x] Keyhive: this is a prerequisite, lands first; credential bytes stay opaque so Keyhive
      needs no second topology migration.
- [ ] Inventory EDGE-side control-feed storage + `edge-feed-replicator` (DESIGN Q3).

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
