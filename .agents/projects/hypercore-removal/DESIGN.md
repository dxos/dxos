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

```text
space id  =  hash(space root doc id)
space root doc (immutable, tiny)
   ├─ directory  -> automerge url   (rotatable)
   └─ credentials -> automerge url  (rotatable)
                       └─ array of credential bytes (today's feed payloads)
   directory -> leaf docs
```

Space root layout:

```json
{
  "type": "dxn:org.dxos.document.spaceRoot:0.1.0",
  "spaceId": "<space id>",
  "idDerivation": "rootDoc",
  "directory": "automerge:<url>",
  "credentials": "automerge:<documentId>"
}
```

Both references are plain automerge URLs. The original sketch wrote `credentials` as
`dxn:<automerge url>`; a DXN wrapping an automerge URL is a second encoding of the same pointer
and nothing dereferences it, so both fields use the `automerge:` form the directory already had.

`idDerivation` is `"rootDoc"` for new spaces and `"spaceKey"` for migrated ones. It is load-bearing, not decoration: a space migrated from the legacy world has a
root doc whose id does NOT derive its space id, so a reader cannot tell the two cases apart
from the id alone. `"rootDoc"` means the reader MUST recompute and reject a mismatch;
`"spaceKey"` means the id is only checkable against the space key, exactly as today.

**Derivation contract (`rootDoc`)** — mirrors `createIdFromSpaceKey` so both schemes produce
the same shape: `SpaceId.encode(SHA-256(utf8(documentId))[0..20])`, i.e. SHA-256 over the
document id string as it appears in the `automerge:` URL, truncated to `SpaceId.byteLength`
(20) and multibase RFC4648 base-32 encoded with the `B` prefix
(`packages/common/keys/src/space-id.ts`). Test vectors land with the implementation.

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
