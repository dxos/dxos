# HALO → Keyhive Migration

Plan for rewriting HALO — replacing the protocol-buffer credential definitions and the hypercore-backed keyring/feed machinery — on top of [Keyhive](https://www.inkandswitch.com/keyhive/notebook/), the capability/encryption layer being developed as part of the Automerge ecosystem.

Status: draft. Backwards compatibility is explicitly out of scope at this stage.

## 1. Current HALO implementation

### 1.1 Architecture

HALO is a credential system layered over append-only, signed hypercore feeds. Every identity owns a **HALO space** (a special space whose control feed carries the identity's credentials). Regular (ECHO) spaces carry their own credential stream in their **control feed**, separate from the **data feed** (database mutations).

| Package                                       | Role                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@dxos/protocols` (`proto/dxos/halo/*.proto`) | Protobuf definitions: `Credential`, `Claim`, `Proof`, assertions, invitations, keys        |
| `@dxos/credentials`                           | Credential factory/verifier, presentations, state machines, credential DAG                 |
| `@dxos/keyring`                               | ECDSA-P256 key storage (RAM/file or SQLite), signing; private keys never leave the keyring |
| `@dxos/client-services`                       | `IdentityManager`, invitation host/guest state machines, contacts service                  |
| `@dxos/echo-host`                             | Pipelines that feed credentials from feeds into the state machines                         |

### 1.2 Key types

**Credential** (the universal envelope):

```protobuf
message Credential {
  PublicKey id;                       // SHA-256 of signed payload.
  PublicKey issuer;                   // Space, identity, or device key.
  Timestamp issuance_date;
  Claim subject;                      // { id: PublicKey, assertion: Any }
  Proof proof;                        // { type, signer, nonce, value, chain? }
  repeated PublicKey parent_credential_ids;  // DAG for concurrent updates.
}
```

A `Proof.chain` carries a nested credential (`AuthorizedDevice`) proving a device may sign on behalf of an identity. `Presentation` bundles credentials + proofs (with nonces) for challenge/response.

**Assertions** (payload of `Claim.assertion`):

| Assertion                                               | Purpose                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `SpaceGenesis`                                          | First message in a space's genesis feed; sets tags + membership policy            |
| `SpaceMember`                                           | Admit/remove identity; role: `OWNER`, `ADMIN`, `EDITOR`, `READER`, `REMOVED`      |
| `MemberProfile`                                         | Per-space member profile update                                                   |
| `AdmittedFeed`                                          | Permit a feed to replicate in a space (`CONTROL` \| `DATA`)                       |
| `AuthorizedDevice`                                      | Authorize device key to sign for identity (device chain)                          |
| `DeviceProfile`                                         | Device metadata (`label`, `platform`, `os`, `type`: BROWSER/NATIVE/AGENT/MOBILE…) |
| `IdentityProfile`                                       | Identity profile (`display_name`, `avatar_cid`, custom `data`)                    |
| `HaloSpace`                                             | Links identity key → its HALO space key                                           |
| `IdentityRecovery`                                      | Recovery key (passkey/seedphrase) for identity                                    |
| `DelegateSpaceInvitation` / `CancelDelegatedInvitation` | Offline-redeemable invitations                                                    |
| `Epoch`                                                 | Snapshot/GC markers                                                               |

**Keyring**: `KeyRecord { public_key, secret_key }`; keys typed IDENTITY / DEVICE / SPACE / FEED. ECDSA-P256 via SubtleCrypto; storage is file-per-key or SQLite.

**Contacts**: not stored — `ContactsService` derives `Contact { identityKey, profile, commonSpaces }` on the fly from space memberships.

### 1.3 Key flows

**Identity creation** (`IdentityManager.createIdentity`):

1. Generate identity, device, control-feed, data-feed, and HALO-space keys.
2. Write to the HALO control feed: `SpaceGenesis`, `SpaceMember(identity, ADMIN)`, `AdmittedFeed(data)`, `AuthorizedDevice(identity → device)`, `DeviceProfile`, optional `IdentityProfile`.
3. Identity is ready when the device chain (`AuthorizedDevice`) has been processed.

**Device join (HALO invitation)**: host and guest run an interactive state machine (INIT → CONNECTING → … → SUCCESS) over a swarm keyed by the invitation. Guest introduces itself, authenticates (shared secret or known-key challenge), sends its device + feed keys; host writes `AuthorizedDevice` + `AdmittedFeed` credentials and returns them with genesis hints.

**Space invitation**: same interactive machinery, but host writes `SpaceMember` (+ `AdmittedFeed`) for the guest identity. **Delegated** invitations write a `DelegateSpaceInvitation` credential replicated to all members, so any admin device — or, for `KNOWN_PUBLIC_KEY` auth, the guest itself — can complete admission offline; redemption is linked via `parent_credential_ids`.

**Access control / credential processing**: each space runs a `SpaceStateMachine` that verifies signatures (and delegation chains), then dispatches to `MemberStateMachine`, `FeedStateMachine`, `InvitationStateMachine`, plus identity-level `DeviceStateMachine` / `ProfileStateMachine`. Concurrent conflicting updates (e.g. two admins removing each other) are resolved via a **credential DAG** (`parent_credential_ids`): merge points wait for all paths, `tryPickWinningUpdate` breaks ties (OWNER wins), losing paths are replayed with overrides.

**Replication auth**: on connection, peers exchange signed auth messages; `TrustedKeySetAuthVerifier` checks the peer device is in the authorized set; feeds then replicate. Credentials gate replication (membership) but **content is not end-to-end encrypted** — possession of feeds implies readability.

## 2. Keyhive

Keyhive is a local-first authorization and encryption layer from Ink & Switch (Rust core, WASM/TS bindings; pre-alpha). It provides group membership as a CRDT, continuous group key agreement (BeeKEM), and end-to-end encryption designed to compose with Automerge sync (Beelay → **Subduction**).

### 2.1 Core concepts

- **Everything is a public key.** All principals — users, devices, groups, documents — are identified by Ed25519 keys. `Agent` = `Active` (local user) | `Individual` | `Group` | `Document`. A `Document` is a `Group` that also owns content; `Membered` = Group | Document.
- **Convergent capabilities**: a certificate-capability model compatible with CRDTs. Authority flows through signed **delegations** between keys; no consensus, no central authority, verification is offline.
- **`Access` levels** (ordered; each implies the previous): `Pull` (replicate ciphertext only — what sync servers get) < `Read` (decrypt) < `Edit` (append ops) < `Admin` (manage membership; revoke anyone).
- **Membership ops** (`Delegation` / `Revocation`) form a hash-linked DAG requiring only causal order — the same consistency model as Automerge. Non-admins may only revoke members they have _causal seniority_ over; admins may revoke anyone. Members may sub-delegate (attenuated) capabilities.
- **No global identity.** An `Individual` is one immutable Ed25519 key. A _person_ is modeled as a `Group` over their device keys; device add/remove is ordinary delegation/revocation. There is no built-in recovery — recovery keys are modeled as group members.
- **`ContactCard`**: a shareable signed credential (individual id + fresh prekey + signature) used to introduce identities and add them to groups/documents — including **while they are offline**, via published X25519 **prekeys**.

### 2.2 Cryptography

- **BeeKEM** — a concurrent TreeKEM/CGKA variant. Binary tree: leaves are member keys, inner nodes carry DH public keys + encrypted path secrets; the root secret keys the document. Removal blanks the member's path (removal wins over concurrent updates); concurrent updates keep _conflict keys_ and encrypt to both forks' resolutions. Needs only causal ordering (no MLS-style sequencing server).
- **Primitives**: Ed25519 (signing/identity), X25519 (ECDH "share keys", rotating), BLAKE3 (KDF), XChaCha20-Poly1305 (AEAD).
- **PCS**: leaf rotations + blanking give post-compromise security (`force_pcs_update`); `PcsKey` derives from the tree root.
- **Causal encryption**: content is encrypted per change/chunk; each chunk embeds the keys of its causal ancestors, so one head key grants access back through history (deliberately trades forward secrecy at the content layer for late-joiner history access). `ApplicationSecret` = KDF(PcsKey, content ref).
- **Sedimentree**: hierarchical chunking of the encrypted commit graph so servers sync ciphertext efficiently (~2 round trips) without plaintext.

### 2.3 Data flows

- **Membership propagation**: delegations/revocations/CGKA ops are signed events replicated as grow-only sets; per-peer visibility computed (`events_for_agent`); ingestion buffers events until causal dependencies arrive; set reconciliation via rateless IBLT (RIBLT).
- **Auth handshake**: every sync message is signed by a non-extractable local key and audience-bound (recipient key or hostname hash) + timestamped — no session handshake state.
- **Automerge integration**: Keyhive plugs into Automerge Repo as an _auth provider_; **Subduction** is the successor sync protocol with explicit Keyhive + Automerge integration (sedimentree chunking, E2EE-friendly). DXOS already vendors subduction-flavored automerge packages.
- **Persistence**: `Keyhive` state serializes via `Archive`; signer is pluggable (fits WebCrypto non-extractable keys — replacing our keyring's role).

## 3. Concept mapping: HALO → Keyhive

| HALO (current)                                                   | Keyhive analogue                                                                                          | Notes                                                                                                                                     |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Identity (identity key + HALO space)                             | `Group` over device keys ("identity group")                                                               | Identity DID derives from the group's key. The HALO space's _credential_ role dissolves into the group's membership DAG.                  |
| Device (device key + `AuthorizedDevice` chain)                   | `Individual` (leaf Ed25519 key) member of the identity group                                              | Device admission = delegation into the identity group; no bespoke chain verification.                                                     |
| `AuthorizedDevice` credential                                    | `Delegation` (identity group → device key)                                                                |                                                                                                                                           |
| Device removal (not well supported today)                        | `Revocation` + BeeKEM path blanking                                                                       | Gains PCS: removed devices lose access to future content.                                                                                 |
| Space (space key + control/data feeds)                           | `Document` (group + content) — or a `Group` owning many Automerge docs                                    | Space membership = document/group membership.                                                                                             |
| `SpaceGenesis`                                                   | Document/group creation (self-certifying root)                                                            |                                                                                                                                           |
| `SpaceMember` role: READER / EDITOR / ADMIN / OWNER              | `Access`: `Read` / `Edit` / `Admin` (+ `Pull`)                                                            | OWNER ≈ root delegation holder. `Pull` is new: trust-minimized relays. REMOVED = revocation.                                              |
| `AdmittedFeed`                                                   | — (obsolete)                                                                                              | Feeds disappear; Automerge/Subduction sync replaces hypercore replication.                                                                |
| Credential DAG (`parent_credential_ids`, `tryPickWinningUpdate`) | Membership op DAG (`auth_pred`, causal seniority rules)                                                   | Keyhive natively resolves concurrent membership changes.                                                                                  |
| Keyring (ECDSA-P256, exportable records)                         | Pluggable `AsyncSigner` + `ShareKeyMap` / prekeys                                                         | Ed25519/X25519; supports non-extractable WebCrypto keys.                                                                                  |
| Credential feed (hypercore, append-only)                         | Signed event sets (delegations/revocations/CGKA ops) + RIBLT sync                                         | Causal DAG instead of per-feed total order.                                                                                               |
| Interactive invitation state machines                            | Out of band for Keyhive: `ContactCard` exchange + delegation                                              | Swarm/QR/PIN UX stays ours (MESH); admission becomes "receive contact card → delegate access". Offline invitations come free via prekeys. |
| `DelegateSpaceInvitation`                                        | Delegation to a not-yet-online individual (prekeys), or to an ephemeral invitation key that sub-delegates | Sub-delegation is a first-class Keyhive feature.                                                                                          |
| `IdentityProfile` / `MemberProfile` credentials                  | Application data (ECHO objects) — e.g. `Profile` in an identity-owned document                            | Profiles stop being credentials; they become replicated data governed by capabilities.                                                    |
| `DeviceProfile`                                                  | Application data (`Device` object)                                                                        | Same.                                                                                                                                     |
| Contacts (derived by `ContactsService`)                          | `AddressBook` of `Profile` objects + stored `ContactCard`s                                                | Becomes explicit, persistent application data.                                                                                            |
| `IdentityRecovery`                                               | Recovery key as member of the identity group                                                              | Delegation with high access; no special-case credential.                                                                                  |
| Replication auth (`TrustedKeySetAuthVerifier`)                   | Signed, audience-bound sync messages + `Pull` capability                                                  | Also gains E2EE — servers only ever see ciphertext.                                                                                       |
| `Presentation` / nonce challenge                                 | Signed messages / capability `Invocation`                                                                 |                                                                                                                                           |
| `Epoch`                                                          | Sedimentree strata / compaction                                                                           | Different mechanism, same GC intent.                                                                                                      |

## 4. Migration path (high level)

Phased; no backwards compatibility. Each phase lands behind the new `@dxos/halo` package so the legacy stack keeps working until cut-over.

1. **Schema layer (this package).** Define Effect schemas for the durable, application-visible types — `Profile`, `Device`, `Group`, `AddressBook` — as ECHO object types addressable by EID, with identities/devices addressed by DID (`@dxos/keys`). These replace `ProfileDocument`, `DeviceProfileDocument`, and derived contacts, and are independent of the credential machinery.
2. **Keyhive service.** Wrap `keyhive_wasm` in an Effect service (`Keyhive.Service`): identity-group creation, delegation/revocation, contact cards, prekeys, archive persistence. Adapt `@dxos/keyring` usage to the pluggable signer (Ed25519, ideally non-extractable WebCrypto).
3. **Identity rewrite.** `createIdentity` → create identity `Group` + first device `Individual`; DID derived from the group key. Profile becomes a `Profile` object in an identity-owned document (HALO "space" becomes a plain Keyhive document group).
4. **Device join.** Keep the MESH invitation UX (swarm, QR, auth code) as pure transport for `ContactCard` exchange; admission = delegation of the new device key into the identity group. Device removal = revocation (new capability we cannot express today without re-keying).
5. **Space membership / access control.** Spaces become Keyhive `Document` groups over their Automerge docs (via Subduction, already vendored). Map roles to `Access` levels; delete `SpaceStateMachine`, `MemberStateMachine`, the credential DAG, and `AdmittedFeed` entirely — Keyhive's membership DAG subsumes them. Introduce `Pull`-level membership for edge/relay services.
6. **Invitations.** Interactive invitations → contact-card exchange + immediate delegation. Delegated/offline invitations → prekey-based delegation or ephemeral invitation keys with attenuated sub-delegation. Delete `DelegateSpaceInvitation` credentials and the invitation state machine's credential plumbing.
7. **Decommission.** Remove hypercore feeds, protobuf credential definitions, `@dxos/credentials` state machines, and the ECDSA keyring. Contacts UI reads `AddressBook`/`Profile` objects instead of `ContactsService`.

**Open questions / risks:**

- Keyhive is pre-alpha and unaudited; API churn is certain. Isolate it behind the `@dxos/halo` service boundary.
- Concurrent admin-vs-admin revocation semantics differ from HALO's OWNER-wins rule; product implications need review.
- Content-layer forward secrecy is deliberately absent in Keyhive (causal encryption); confirm this matches our threat model.
- Agent/server ("AGENT" device type) key custody with non-extractable keys needs a story (e.g. `Pull`-only relays + delegated agent keys).

## 5. Prototype service and HALO shim feasibility

`src/Keyhive.ts` implements a pure-TypeScript, in-memory prototype of the Keyhive membership
model (Keyhive is not published to npm; see the module comment for scope and omissions). The
`Keyhive.Service` interface mirrors the `keyhive_wasm` bindings so a WASM-backed layer can
replace `layerMemory()` unchanged.

**Can the existing HALO implementation be shimmed behind this API?** Mostly yes for the
membership core; no for encryption. A `layerLegacy()` backed by `@dxos/credentials` +
`@dxos/client-services` would map:

| Service operation    | Legacy backing                                          | Fidelity                                                                                                                                       |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `active`             | Device key (DID from device public key)                 | Good — devices are already key-identified principals.                                                                                          |
| `createGroup`        | Space genesis (`SpaceGenesis` + `SpaceMember(OWNER)`)   | Good — both are self-certifying roots.                                                                                                         |
| `delegate`           | `SpaceMember` credential with role mapped from `Access` | Partial — `admin→ADMIN`, `edit→EDITOR`, `read→READER`; **`pull` has no legacy equivalent** (no E2EE, membership implies readability) — reject. |
| `revoke`             | `SpaceMember(REMOVED)`                                  | Partial — legacy resolves conflicts via credential DAG + OWNER-wins, not causal seniority; semantics differ under concurrency.                 |
| `members`            | `MemberStateMachine` output                             | Good — both are materialized views.                                                                                                            |
| `contactCard`        | Identity key + `ProfileDocument` (as a `Presentation`)  | Partial — legacy has no prekeys, so offline admission needs `DelegateSpaceInvitation` instead of prekey delegation.                            |
| `receiveContactCard` | Verify presentation; record identity key                | Good.                                                                                                                                          |
| `ops` / `receiveOps` | Credential feed messages                                | Partial — legacy ops are totally ordered per feed (hypercore), not a causal DAG; export is possible, import must be replayed in feed order.    |

Structural gaps that cannot be shimmed:

1. **Nested groups.** Legacy members are identities only; a `delegate` whose subject is another
   group/space has no credential representation. Shim must reject group subjects.
2. **Attenuated sub-delegation.** Legacy `EDITOR`/`READER` cannot invite at all
   (`_canInviteNewMembers` requires ADMIN/OWNER); Keyhive lets any member delegate up to their
   own access. Shim must restrict delegation to admins, which is _stricter_ than the API implies.
3. **Encryption surface.** Anything CGKA-related (`ApplicationSecret`, PCS rotation) is
   unimplementable over plaintext feeds; the service deliberately excludes it so the membership
   API stays shimmable.
4. **Signer.** Legacy keyring is ECDSA-P256, prototype is Ed25519 — the op envelope carries the
   algorithm implicitly via the author key, so a shim needs an algorithm tag or must reuse the
   keyring's P-256 keys for signing ops.

Conclusion: a legacy shim is feasible as a _transition layer_ — same API, reduced semantics
(no `pull`, no nested groups, admin-only delegation, feed-ordered sync) — which would let
`client-services` code migrate to the `Keyhive.Service` API before the Keyhive/Subduction
backend lands. The prototype's in-memory layer and a future `layerLegacy()` are then two
implementations of one seam, and cut-over is a layer swap.

## A. ISSUES

1. Migration from protobuf?
2. Implement Keyhive service abstraction with Shim against temporary EDGE-based auth?
