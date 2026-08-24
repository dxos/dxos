# Hypercore removal — credentials over Automerge — Tasks

_Resume: project created 2026-08-24, DESIGN.md drafted from a source survey. NOTHING IMPLEMENTED. Next: Phase 0 audit + the four open questions in DESIGN.md._

Branch `claude/remove-hypercore-automerge-creds-uo7lx9`. Rationale in `DESIGN.md`.

## Phase 0: audit (before any code)

- [ ] Enumerate every `feed-store` / `@dxos/hypercore` consumer and split it into
      credential-chain vs. other-data (queues, epochs, presence). ~100 files reference
      hypercore today; only the credential path is in scope for Phase 1.
- [ ] Map the control-feed read path: `data-space-manager.ts` → `Space` control pipeline →
      `@dxos/credentials` processor/state-machine. Identify the single seam where a
      credential array can be substituted for a feed iterator.
- [ ] Establish whether the space keypair survives as credential issuer (DESIGN Q1).
- [ ] Confirm the Keyhive/`@dxos/halo` direction does not supersede this (DESIGN Q2).
- [ ] Inventory EDGE-side control-feed storage + `edge-feed-replicator` (DESIGN Q3).

## Phase 1: space root document

- [ ] Define the space-root schema + `dxn:org.dxos.document.spaceRoot` type in `echo-protocol`.
- [ ] `spaceIdFromRootDocumentId()` in `echo-protocol/src/space-id.ts` beside
      `createIdFromSpaceKey`; version-tag which scheme minted an id.
- [ ] Extend `echo_spaces` (SQL migration under `db-host/../migrations/space-state`) with
      `directory_doc_url` + `credentials_doc_url`; keep `root_doc_url` meaning the ROOT now,
      not the directory.
- [ ] `SpaceStateManager` loads/serves the root, directory and credentials refs; the
      directory reference becomes indirect so rotation is a root write.
- [ ] Root-doc creation path + self-certification check (recompute the id from the URL).

## Phase 2: credentials document

- [ ] Credentials doc: append-only array of the existing encoded credential bytes.
- [ ] Write path — `spaceGenesis()` emits into the credentials doc instead of the control feed;
      drop the two `AdmittedFeed` credentials.
- [ ] Read path — feed the credential processor from the doc array; preserve ordering
      semantics the state machine relies on.
- [ ] Notarization (`notarization-plugin.ts`) and invitations over the new write path.
- [ ] Replication: credentials doc joins normal subduction; verify a joiner can read
      credentials before it is admitted to anything else (bootstrap ordering).

## Phase 3: migration

- [ ] Migration for existing spaces: mint a root doc over the current directory, copy
      credentials out of the control feed, rewrite `echo_spaces`; space id UNCHANGED.
- [ ] Single-writer/adopt protocol so peers converge on one root doc per legacy space.
- [ ] Migration test over a real profile fixture.

## Phase 4: delete hypercore

- [ ] Remove `edge-feed-replicator` + `teleport-extension-replicator` credential paths.
- [ ] EDGE-repo counterpart change + deploy coordination.
- [ ] Delete `packages/common/hypercore`, `packages/common/feed-store` (subject to Phase 0
      findings on non-credential consumers), the `hypercore*` typings and deps.
- [ ] `pnpm knip`, full build + test, changeset.
