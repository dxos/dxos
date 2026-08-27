# Hypercore removal — credentials over Automerge — DESIGN

_Resume: see TASKS.md. Branch: `claude/remove-hypercore-automerge-creds-uo7lx9`._

## Goal

Delete hypercore from the stack. The only thing it still carries that matters is the
space **credential chain** (the control feed); replicate that as an ordinary Automerge
document instead, so spaces have exactly one replication mechanism (Automerge/subduction)
and one identity anchor.

## Today

```text
space id  =  SHA-256(space key)[0..20]        (createIdFromSpaceKey, echo-protocol/src/space-id.ts)
space key ->  credential chain (hypercore control feed)
          ->  root space doc == space directory  (echo_spaces.root_doc_url)
          ->  leaf docs
```

- Genesis writes `SpaceGenesis`, `SpaceMember`, two `AdmittedFeed` and `Epoch` credentials
  into the control feed (`packages/sdk/client-services/src/packlets/spaces/genesis.ts`).
- Feeds are hypercore (`packages/common/feed-store`, `packages/common/hypercore`),
  replicated over `teleport-extension-replicator` and `edge-feed-replicator`.
- `echo_spaces(space_id, root_doc_url)` already indexes one root doc per space
  (`db-host/space-state-manager.ts`), but that root doc **is** the directory.

## Target

Opt-in behind `DX_AUTOMERGE_CREDENTIALS` (`runtime.client.automergeCredentials`, default OFF).
With the flag off a space is created and read exactly as in "Today".

```text
space id  =  SHA-256(space key)[0..20]        (UNCHANGED — both paths)
space key ->  space root doc (immutable, tiny)
                 ├─ directory   -> automerge url   (rotatable)
                 └─ credentials -> automerge url   (rotatable)
                                     └─ credentials keyed by credential id
              directory -> leaf docs
```

Space root layout:

```json
{
  "type": "dxn:org.dxos.document.spaceRoot:0.1.0",
  "spaceId": "<space id>",
  "directory": "automerge:<url>",
  "credentials": "automerge:<documentId>"
}
```

Both references are plain automerge URLs. The original sketch wrote `credentials` as
`dxn:<automerge url>`; a DXN wrapping an automerge URL is a second encoding of the same pointer
and nothing dereferences it, so both fields use the `automerge:` form the directory already had.

**The space id is always derived from the space genesis key**, and the HALO's from the identity
key — the root anchors the credentials document but does not identify the space. An earlier
revision derived the id from the root document id and carried an `idDerivation` discriminator to
tell the two schemes apart; both were removed. Deriving from the key means a peer that has never
seen the root computes the same id, which is what recovery depends on: it reconstructs the HALO
from `haloSpaceKey` alone.

The type is a versioned DXN in ECHO's own form — `dxn:<nsid>:<semver>`, final segment
camelCase (`DXN_SPEC_REGEXP` in `keys/src/DXN.ts`), the same shape `EntitySystem.type`
carries (`dxn:org.dxos.type.schema:0.1.0`). Spelled `type`, not `@type`: `@type` is the
protobuf convention from `dxos.halo.credentials` and appears nowhere in ECHO document
structure. The version lives in the DXN, so the root needs no separate `SpaceDocVersion`.

### Constraints this satisfies

- **The root cannot be rotated** — its id defines the space id — so it must stay small and
  write-cold. Only two reference fields ever change; the directory and the credentials doc
  absorb all growth and can be rotated by rewriting a reference.
- **The root is indexed by ECHO, not by the indexer**: it lands in the existing
  `echo_spaces` table (extended with the two references), so space enumeration stays a
  SQL read with no index pass.
- **Credentials keep their current encoding** — the same signed protobuf bytes the control
  feed stores today, now as an append-only array in an Automerge doc. The credential
  processor / state machine (`@dxos/credentials`) is fed from that array, so membership,
  invitations and epochs keep their semantics. Two things do change and must not be papered
  over: the two `AdmittedFeed` credentials stop being issued (nothing admits feeds any more),
  and an Automerge array is not a feed — it has no single-writer total order. The **ordering
  contract is therefore part of this design, not inherited**: concurrent appends from
  different devices must converge to an order the processor accepts, duplicates must be
  idempotent (credentials are content-addressable by signature), and migration replay must
  produce the same state machine result as the feed it replaces.

## Key decisions

1. **No chicken-and-egg on `space id = hash(doc id)`.** `Repo.create()` assigns the
   document id before any content is written, so the sequence is: create root doc → derive
   space id from its id → write `{ spaceId, directory, credentials }` into it. The `spaceId`
   field inside the root is therefore redundant-but-self-certifying: any peer can recompute
   it from the URL it fetched and reject a mismatch.
2. **Two id derivations coexist.** Existing spaces keep `hash(space key)`; new spaces use
   `hash(root doc id)`. Nothing can re-derive a legacy space id from a doc id, so the
   derivation is not a validity check but a _version-tagged_ one: the root doc records which
   scheme minted the id.
3. **Migration is reference-only for existing spaces.** A legacy space gets a new root doc
   created above its current directory doc, credentials copied out of the control feed into
   the credentials doc, and `echo_spaces` rewritten — its space id does **not** change.
   Every peer must agree on that root, so the migration is driven by one writer and the
   others adopt the root they receive.
4. **Feed machinery dies with hypercore, not before it.** Data feeds (queues) and the
   control feed have separate fates — the audit below has to establish which `feed-store`
   consumers are credential-chain-only.

## Bootstrap and cutover (resolved 2026-08-24)

**There is no discovery problem — the pointer is handed over, exactly as it is today.**
Both invitation protocols already work this way, so the new world is a field swap, not a new
mechanism:

- **Space invite** (`space-invitation-protocol.ts`): the host admits the guest and returns the
  `SpaceMember` credential in the `AdmissionResponse`; the guest reads `assertion.spaceKey`
  and `assertion.genesisFeedKey` off it and calls `acceptSpace()`. It never discovers
  anything.
- **Device/HALO invite** (`device-invitation-protocol.ts`): identical shape —
  `AdmissionResponse.device` carries `haloSpaceKey` + `genesisFeedKey`. This is why the HALO
  space migrates the same way as any other space.
- The same assertion field is what lets a _second_ device reconstruct a space it was never
  invited to interactively: `cross-device-space-synchronizer.ts` builds `acceptSpace()` args
  straight from `assertion.genesisFeedKey`.

So: **`SpaceMember.genesis_feed_key` becomes the space root doc URL** (or a sibling field
beside it during the dual-path window). It must live in the _credential assertion_, not just
the response envelope, or cross-device reconstruction loses its pointer.

**The joiner does not need pre-admission replication access.** Confirmed in
`dxos/edge`: `AutomergeReplicationAuthenticator.checkReplicationAllowed()`
(`packages/services/db-service/src/worker/automerge/automerge-replicator-auth.ts`) authorizes
purely from EDGE's own space state machine — `getSpaceMember(identityKey)`, allow if the role
is OWNER/ADMIN/EDITOR/READER. The host wrote the admission credential and it replicated to
EDGE, so EDGE already knows the joiner is in and lets it replicate. Nothing about that
depends on what the joiner has read. Peer-to-peer, the invitation host is on the wire anyway
and serves the docs directly.

Two real hazards, neither of them a bootstrap circularity:

1. **EDGE must be reading that space's credentials from the doc** before it can see the
   admission — which is precisely what the per-space single-source flip guarantees. A space
   mid-flip must not accept admissions.
2. **The 60s auth cache is a negative cache.** `checkReplicationAllowed` caches a
   `Space member role not set` denial for `AUTH_CACHE_TTL_MS`, so a joiner that dials EDGE
   before the admission credential lands can stay denied for up to a minute. This exists
   today; it gets more reachable when admission and replication travel the same transport.
   Needs an invalidation on credential apply.

**Migration cutover: dual-write.** During the window a migrating space writes credentials to
both the control feed and the credentials doc, so a reader on either source stays complete
and no watermark or write-freeze is needed. The flip is the point at which readers stop
consulting the feed; the feed write stops when the dual path is retired.

## Resolved (user, 2026-08-24)

1. **The space keypair survives as the credential issuer.** It loses only its two other
   roles: minting the space id, and admitting feeds. The admission chain still roots in
   `space.key`, so `@dxos/credentials` issuance is unchanged; the two `AdmittedFeed`
   credentials in `spaceGenesis()` simply stop being written.
2. **This is a prerequisite to Keyhive, not a competitor.** Credentials-over-Automerge lands
   first; the `Access` model in `packages/core/halo/halo/src/Space.ts` builds on top of it.
   Nothing here should assume the credential payload stays protobuf forever — the doc holds
   opaque bytes precisely so Keyhive can change what those bytes are without a second
   migration of the space topology.
3. **Migration: both paths supported, then per-space atomic client cutover.** Reader code
   accepts either source; a client migrates one space at a time, atomically, and from that
   point EDGE reads that space's credentials from exactly one source. No flag day, and no
   space is ever half-migrated.
4. **Queues and other feeds survive and are entirely separate.** Confirmed in source: queues
   use `@dxos/feed` (`packages/core/echo/feed`, SQLite-backed, its own unrelated
   `FeedStore`) and pull in no hypercore. Only four packages depend on hypercore or
   `@dxos/feed-store` — `common/hypercore`, `common/feed-store`,
   `mesh/teleport-extension-replicator`, `sdk/client-services` — so removing the credential
   chain removes the last consumer and `@dxos/hypercore` can be deleted outright.

## Resolved (user, 2026-08-25)

5. **EDGE is the resolver for the minimal join set.** A guest joining a space or an identity
   needs a small, fixed set of facts, and EDGE already holds them: rather than deriving the
   space root, EDGE returns its document id. `RecoverIdentityResponse` gains the halo space
   root, exactly as `SpaceMember` gained `space_root_url` for space invitations. This removes
   the constraint recorded below — with the root arriving from EDGE, the halo space no longer
   has to keep a key-derived id to stay recoverable, and derivation stops being the only way
   EDGE can locate a root.
6. **Migration is client-initiated and EDGE-executed.** The client calls migrate for a space or
   identity; EDGE performs it idempotently and returns the ids of the new documents; the client
   waits for those documents to sync and only then updates local state. This replaces the
   client-side `migrateSpaceToRootDocument` path as the durable mechanism — the client's own
   anchoring stays only as the offline/no-EDGE case — and makes the cutover a single
   acknowledged step rather than something each peer rediscovers.
7. **Credential erasure is prevented by reading history, not current state.** A peer with write
   access can delete another member's credential from the document, and the materialized map
   loses it. Automerge keeps the change that added the entry, so the set is read from the change
   history instead: `AddOnlySet` in `@dxos/echo-doc`. Two constraints fell out of the automerge
   API and are load-bearing:
   - Only a **scalar** value is a single op carrying its own value. A JS string is stored as a
     text CRDT whose value exists only after replaying its character ops, so entries hold bytes.
   - `decodeChange` returns a byte value as a plain array, not the `Uint8Array` that was stored.
