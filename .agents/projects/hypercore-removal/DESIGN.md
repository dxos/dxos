# Hypercore removal — credentials over Automerge — DESIGN

_Resume: see TASKS.md. Branch: `claude/remove-hypercore-automerge-creds-uo7lx9`._

## Goal

Delete hypercore from the stack. The only thing it still carries that matters is the
space **credential chain** (the control feed); replicate that as an ordinary Automerge
document instead, so spaces have exactly one replication mechanism (Automerge/subduction)
and one identity anchor.

## Today

```
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

```
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
  "directory": "automerge:<url>",
  "credentials": "dxn:<automerge url>"
}
```

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
  processor / state machine (`@dxos/credentials`) is fed from that array unchanged, so
  membership, invitations and epochs are untouched by this change.

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
