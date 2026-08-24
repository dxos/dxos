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
  "credentials": "dxn:<automerge url>"
}
```

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

## Open questions (2)

1. **Joiner bootstrap.** A fresh joiner must discover, be authorized for, and replicate the
   credentials doc _before_ it is admitted to anything — the chicken-and-egg the control
   feed solved with `SpaceMember.genesis_feed_key`
   (`packages/core/protocols/src/proto/dxos/halo/credentials.proto`). Options: carry the
   credentials-doc URL in the invitation payload; make the credentials doc world-readable
   within the space root; or keep a genesis-equivalent field pointing at it. Needs deciding
   before Phase 2 — it is the one place where "just replicate it like any other doc" is
   circular.
2. **Ordering/watermark for the migration copy.** Per-space atomic cutover (below) still
   needs a defined cutoff: what happens to a credential appended to the control feed while
   the copy is in flight. Simplest is to re-scan the feed after the copy and only publish
   the root once the feed head is stable; dual-write is the alternative.

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
