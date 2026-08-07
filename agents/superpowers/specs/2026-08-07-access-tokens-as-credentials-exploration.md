# Access tokens as credentials — exploration (HALO / Keyhive)

Status: exploration, 2026-08-07. No decisions made; this maps what exists and lays out a
candidate model for review.

Scope: a better story for third-party access tokens (OAuth tokens, API keys) treated as
first-class credentials — encrypted at rest, custodied locally or remotely, shareable, and
with access to them gated per principal (humans, devices, agents). Anchored in the new
`@dxos/halo` API surface and the HALO → Keyhive migration plan.

Related context: the Cloudflare OS Gatekeeper analysis (connector mediation, approval
queues, observer checks) is a sibling investigation; this doc covers the _custody and
authorization substrate_ underneath it, not the approval/audit UX.

## 1. Where things stand

### 1.1 The new HALO API (`@dxos/halo`)

`packages/core/halo/halo` is a **definitions-only** package (Effect service tags, verbs,
schemas); implementations are layers (`@dxos/halo-adapter-client` today, `@dxos/halo-keyhive`
planned). Relevant surface:

- `Space.Access = 'pull' | 'read' | 'edit' | 'admin'` — already Keyhive-aligned
  (`src/Space.ts`), with `updateMemberRole` / `removeMember` documented as Keyhive
  delegation/revocation.
- `Identity` has a `credentials` stream, `grantServiceAccess` (writes a
  `dxos.halo.credentials.ServiceAccess` credential via the adapter,
  `halo-adapter-client/src/identity.ts:132`), and recovery/attest verbs are deferred.
- Credential verbs are explicitly deferred until credentials are remodeled as Keyhive
  membership ops (`API_AUDIT.md` §3.2, §3.6.1).

### 1.2 The Keyhive migration plan exists

`packages/core/halo/halo/MIGRATION.md` is the plan of record (draft, no backward compat):

- Identity → Keyhive `Group` over device keys; space → `Document` group; credentials DAG →
  delegation/revocation ops; invitations → `ContactCard` + delegation (offline via prekeys).
- Roles map `READER/EDITOR/ADMIN/OWNER` → `read/edit/admin` with **`pull` as a new level**:
  replicate ciphertext without decrypting. §5.1 specifies EDGE as a first-class principal
  admitted at `pull`; services needing plaintext (AI, search) become explicit `read` members
  — per-space, visible, revocable.
- §4 open questions already flag **agent/server key custody** ("`agent-managed` devices
  become distinct principals whose access is explicitly delegated… custody of those keys is
  an EDGE responsibility").
- A legacy shim (`layerLegacy`) is judged feasible for the membership API but _not_ for
  anything encryption-level: no `pull`, no E2EE over plaintext feeds.

Planning state elsewhere: Linear DX-799 "Keyhive integration" is an empty Todo — the
in-repo docs are the only substantive plan. Adjacent live threads: DX-917 (agents
requesting credentials — requirements auto-satisfied from tokens in the space), DX-758/759
(MCP OAuth2 with decentralized identity), DX-874/DX-1107 (kms-service refresh reliability),
DX-979 (BYOK token in space, shipped).

### 1.3 Keyhive upstream (as of Aug 2026)

- Active development through Jul 2026 (`inkandswitch/keyhive`: access-level API rework
  #209, E2EE application-secret chains #208). Still pre-alpha, unaudited, not on npm;
  consumed via `keyhive_wasm`.
- **BeeKEM now has a formal security analysis** (IACR ePrint 2026/1434): κ key-retention
  parameter (partition resilience vs forward secrecy dial), "cross-fork security" threat
  model, and a strengthened BeeKEMFS variant (paper only).
- Sync path is Beelay → **Subduction** (`inkandswitch/subduction`), which DXOS already
  vendors (`@automerge/automerge-repo@*-subduction.*` + the `subduction` skill for policy
  hooks). Content encryption is _causal_: one head key unlocks history, never the future;
  no content-layer forward secrecy by design.
- Model notes relevant here: any member may **sub-delegate attenuated** access up to their
  own level; revocation is causal-seniority-based with admin override; removal triggers
  BeeKEM path blanking → post-compromise security for future content.

### 1.4 Access tokens today

One canonical stored shape plus two overlapping ones:

| Shape                                                       | Where                                                                    | Custody                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| `AccessToken` (`@dxos/link`, `org.dxos.type.accessToken`)   | ECHO object in a space (`packages/core/compute/link/src/AccessToken.ts`) | Two modes, below          |
| `APIKey` (`@dxos/schema`)                                   | Plugin settings struct                                                   | Local settings, plaintext |
| `ServiceCredential` projection (`@dxos/compute/Credential`) | Compute-layer view over the above                                        | n/a (has `TODO: unify`)   |

`AccessToken.token` has two custody modes:

1. **Self-custodied**: the secret string sits in the ECHO object — replicated in plaintext
   Automerge to every member and device of the space. No encryption at rest anywhere in the
   path (the AES-256-GCM `web-crypto-cypher` exists but only for feed blocks; the keyring
   itself persists raw pkcs8).
2. **EDGE-custodied ("managed")**: `token` holds the sentinel `dxos:managed-access-token`
   (`protocols/src/edge/edge.ts:379`); the real token lives in the kms-service
   `SpaceSecretsObject` DO and is fetched per-use via `/oauth/token`
   (`edge-client/src/edge-http-client.ts:247`), gated by an EDGE-side **space membership**
   check (`DATA_SERVICE.isSpaceMember`, edge `kms-service/src/api.ts:158`). Function
   invocations get a space-bound `AccessTokenService` binding that cannot name another
   space (`compute-runtime/src/services/access-token-resolver.ts`).

Verified against the edge repo (2026-08-07): **managed mode is only enabled for Google**
(`kms-service/src/oauth/managed-tokens.ts` — `MANAGED_PROVIDERS = {GOOGLE}`). For every
other provider — GitHub included — the kms DO custodies the _refresh_ token and runs the
20-minute refresh alarm, but each refreshed _access_ token is published back into the ECHO
`AccessToken` object (`SpaceSecretsObject._publishAccessToken` → `setDocumentPath`), i.e.
replicated in plaintext to the space. Today's split is therefore "EDGE holds the renewal
capability, the space holds the live secret" for all non-Google providers.

Sharing/gating today:

- **Audience == space membership.** There is no per-token ACL in either mode. Any member —
  and any agent/function acting in the space — can read (self-custodied) or fetch (managed)
  every token in the space, silently.
- The one client-side gate is a heuristic: default spaces must be `MembershipPolicy.LOCKED`
  because OAuth-registration credentials live there
  (`plugin-space/src/capabilities/SpaceSurfaces.tsx:92`, with a TODO to remove).
- `ServiceAccess` credentials exist in the proto (server, identity, `capabilities[]`) and
  are written by `grantServiceAccess` / plugin-script deploys — but the capability list is
  **parsed, not enforced** on EDGE.
- Subduction policy hooks (`echo-host/src/automerge/automerge-host.ts:715`) gate
  replication per _document_ per peer — real machinery, but tokens currently live inside
  general space documents, so it cannot express "member X may not see token Y".
- "Sharing a credential" across spaces today means copying the object — two divergent
  secrets, two blast radii.

## 2. Gap analysis

1. **Plaintext at rest and in replication** for self-custodied tokens (and for keyring
   private keys).
2. **No grant granularity**: token audience is exactly space membership; no per-token, per-
   principal, or per-agent scoping; no attenuation for sub-delegation to agents.
3. **No use/read distinction**: possession of space membership yields the secret bytes,
   even when the holder only needs the _effect_ of the token (make an API call).
4. **No attribution**: an agent using a token is indistinguishable from the user; nothing
   is signed per use.
5. **Fragmentation**: `AccessToken` vs `APIKey` vs `ServiceCredential` vs settings-stored
   keys (BYOK) — no single taxonomy of custody or capability.
6. **Unenforced grants**: `ServiceAccess.capabilities` is decorative.

## 3. Candidate model: two axes

Treat every third-party credential as a point on **custody × grant** axes, instead of the
current binary (object-in-space vs managed sentinel).

### 3.1 Custody tiers (where the secret bytes live)

| Tier | Description                                                                                                                                                       | Exists?                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| L0   | Plaintext in space object                                                                                                                                         | Today's default — **deprecate**           |
| L1   | Locally held, encrypted at rest (device keyring / non-extractable WebCrypto; under Keyhive, the vault document's BeeKEM-derived key)                              | No                                        |
| C1   | EDGE-custodied, _revealable_: `/oauth/token` returns the secret to authorized principals                                                                          | Today's "managed" mode                    |
| C2   | EDGE-custodied, _mediated_: secret never leaves the DO; EDGE signs/executes calls on behalf of the caller (kms `makeAuthorizedCall` / `proxyAtprotoCall` pattern) | Partially (edge repo), not a modeled tier |

L1 and C1/C2 are the user-visible "stored locally" vs "custodied elsewhere" split. A single
`Credential` entity should carry `custody: 'local' | 'edge'` plus reveal semantics, rather
than a magic sentinel string.

### 3.2 Grant levels (what a principal may do)

Per-credential, per-principal grants, ordered like Keyhive `Access`:

| Grant      | Meaning                                                                  | Keyhive analogue                                   |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| `discover` | See that the connection exists (source, account, scopes — metadata only) | `read` on the metadata doc                         |
| `use`      | Cause the token's effect via mediation (C2) without ever seeing bytes    | none — an _invocation_ concern, not a data concern |
| `read`     | Obtain the secret bytes (L1 decrypt / C1 fetch)                          | `read` on the secret                               |
| `manage`   | Rotate, reauth, delete, change grants                                    | `admin`                                            |

The key structural insight: **Keyhive gates data; it has no "use" level.** `use` is an
invocation authorization and belongs to the HALO credential layer — a signed, scoped,
expiring grant (`ServiceAccess` today; a Keyhive-era invocation/UCAN-style artifact later)
presented to kms-service, which verifies it _before_ touching the token. The two layers
compose: Keyhive membership answers "who can see/hold this secret"; credential presentation
answers "who may spend it, on what, until when" — and every presentation is a signed
artifact, which yields the audit/attribution trail for free.

### 3.3 Tokens as capability subjects — the vault document

Move tokens out of general space documents into a dedicated **vault document** (per space
initially; optionally per credential for high-value tokens):

- **Today** (pre-Keyhive): this immediately makes subduction policy able to gate the vault
  — `filterAuthorizedFetch` / `shouldAdvertise` operate at document granularity, so the
  vault can be advertised only to admin-role peers (or withheld from `agent` device kinds)
  while ordinary space data replicates as before. Coarse (per-doc, per-peer), but it is a
  _structural_ improvement available with existing machinery, and it removes secrets from
  documents that replicate everywhere by default.
- **Under Keyhive**: the vault document is a Keyhive `Document` group with its own
  membership, distinct from the space's. Grants become ordinary delegations:
  - Per-token/per-vault membership independent of space membership (fixes gap 2).
  - **Shared credentials across spaces** become one vault document delegated to multiple
    groups (a space group, a team group, an individual) instead of copied objects —
    revocable in one place.
  - Sub-delegation with attenuation: a user delegates `read` on one vault to an agent,
    which cannot escalate; revocation blanks the BeeKEM path, and pairing revocation with a
    provider-side token rotation gives real post-compromise security for the secret itself.
  - EDGE holds `pull` on vaults it merely replicates, `read`-equivalent standing only where
    it custodies (C1/C2) — matching MIGRATION.md §5.1's explicit-member model.
- The ECHO object keeps its identity: `AccessToken` metadata (source, account, scopes,
  custody tier) stays queryable in the space; only the secret material moves into the
  vault (L1) or stays on EDGE (C1/C2). DX-917's "requirements auto-satisfied from tokens in
  the space" keeps working against metadata, and an unsatisfied requirement becomes a
  _grant request_ on the vault rather than a paste-a-token prompt.

### 3.4 Agents as actors

Prerequisite for any of the gating to mean something: agents present their own identity.

- `Identity.DeviceKind` already includes `'agent' | 'agent-managed'`; MIGRATION.md §5.1
  already assigns agent key custody to EDGE. Under Keyhive an agent is just an
  `Individual` key delegated into exactly the vaults/documents it needs.
- Near-term, the same shape is expressible with existing HALO machinery: issue the agent a
  scoped, expiring `ServiceAccess`-style credential; kms-service verifies the presentation
  (nonce challenge, audience-bound) before releasing (C1) or exercising (C2) a token.
- **First enforcement step, available now**: make kms/edgeAuth actually enforce the
  `ServiceAccess.capabilities` list on `/oauth/token` and function bindings — the
  credential is already written; the check is the missing half.

## 4. Sketch of a path (migration-aligned)

Ordered so each step survives the Keyhive cut-over:

1. **Unify the taxonomy.** One `Credential`/`AccessToken` model carrying custody tier +
   grant metadata; fold `APIKey` and the BYOK settings path into it; finish the
   `plugin-token-manager` → `plugin-connector` rename. (Resolves the `Credential.ts` TODO.)
2. **Default to custodied.** Make C1 (managed) the default for every OAuth connector;
   demote L0 to an explicit "store locally (unencrypted until Keyhive)" opt-in, or kill it
   once L1 exists.
3. **Vault document + subduction gating.** Move secret material (and L0 remnants) into a
   per-space vault doc; gate its replication via subduction policy; keep metadata in the
   space. This is the data layout Keyhive ACLs will attach to verbatim.
4. **Enforce `ServiceAccess`.** Capability list checked at kms/edgeAuth; agents get their
   own scoped credentials instead of borrowing the user's standing (DX-917 flows through
   this).
5. **C2 mediation tier.** Model "use without read" explicitly: EDGE executes provider calls
   for principals holding `use`; the secret becomes non-exfiltratable for that class of
   consumer. (This is also where the Gatekeeper-style approval/audit layer plugs in, at the
   Operation-invocation boundary — separate exploration.)
6. **Keyhive cut-over.** Vault docs become Keyhive Documents; grants become delegations;
   L1 becomes "vault key via BeeKEM"; revocation+rotation becomes the standard credential
   lifecycle. The `@dxos/halo` service surface (`Space.Access`, `updateMemberRole`,
   `removeMember`, `grantServiceAccess`) already names these verbs, so consumers don't
   move again.

## 5. Case study: GitHub App connections (installation-style connectors)

GitHub offers two integration models, and the difference maps directly onto the custody
tiers above. Facts verified against docs.github.com, 2026-08.

### 5.1 The two models

|                       | OAuth App (classic)                                 | GitHub App                                                                                      |
| --------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Actor                 | Always _the user_ (token = user's access ∩ scopes)  | Itself (`app[bot]`, installation tokens) **or** on behalf of a user (user-to-server)            |
| Grant shape           | Coarse classic scopes (`repo` = every private repo) | Installation on an org/user with **per-repo selection** + fine-grained per-category permissions |
| Token lifetimes       | User token **non-expiring** by default              | App JWT ≤10 min; installation token **1 h**; user-to-server 8 h + 6-month rotating refresh      |
| Down-scoping          | None                                                | Installation token can be minted narrowed to specific `repositories` + `permissions` per mint   |
| Durable secrets       | Client secret + every user's non-expiring token     | **App RSA private key** (crown jewel), client secret, refresh tokens                            |
| Rate limits           | 5k/h per user, fixed                                | Scales per installation (up to 12.5k/h each)                                                    |
| Webhooks              | Per-repo, manually managed                          | App-level, auto-managed across installations                                                    |
| Survives user leaving | No (token dies with access)                         | Yes (installation belongs to the org)                                                           |

GitHub's own guidance: "In general, GitHub Apps are preferred over OAuth apps"; OAuth
Apps receive only security lockdowns while Apps keep gaining capabilities (enterprise
ownership/installation APIs 2025–26).

### 5.2 What we do today

The DXOS GitHub connector is **already a GitHub App — but we only use its
user-authorization half**:

- `plugin-github/src/capabilities/connector.ts:65` declares `scopes: []` with the comment
  that permissions come from the App's settings (user-to-server flow ignores scope
  strings). Edge's provider config (`kms-service/src/oauth/provider.ts:50`) notes the 8 h /
  6-month token model, and the refresh pipeline specifically handles GitHub's single-use
  rotating refresh tokens (`space-secrets.ts:331`).
- So the current connection is _user-identity-shaped_: the token acts as the connecting
  user, is bound to their standing, and (per §1.4) the live 8 h access token is published
  into the space document in plaintext.
- No GitHub App _installation_ machinery exists anywhere in edge: no app-id/PEM env, no
  RS256 app-JWT signer (the only JWT signer is atproto's ES256 `AtprotoJwtFacotry`), no
  `POST /app/installations/{id}/access_tokens` call, no installation-token cache, and the
  generic `/webhook/:token` endpoint has no signature verification (grep: no
  `X-Hub-Signature-256` handling), so app webhooks can't be received safely yet.
- Vestige to clean up either way: the CLI preset still requests classic scopes
  `['repo', 'read:user']` (`plugin-connector/src/commands/connector/util.ts:27`), which the
  user-to-server flow ignores.

### 5.3 Why installation connections need — and reward — server custody

The user's instinct is right: installation-style connections are only possible with
server-custodied credentials, and in exchange they give the custody model its cleanest
tier:

1. **The durable secret isn't a token at all.** It's the App's RSA private key — one
   platform-level secret, held once in kms (ideally non-extractable / KMS-signed), never
   per-space, never replicable to a client by construction.
2. **Everything downstream is ephemeral.** JWTs live ≤10 min, installation tokens 1 h.
   There is nothing worth storing in a space document — a "connection" object becomes pure
   metadata: `{installationId, resourceOwner, repoSelection, permissions}`. Zero secret
   bytes at rest client-side; the encryption-at-rest problem vanishes for this tier
   rather than being solved.
3. **`use` is the only meaningful grant.** You cannot hand out "the credential" — only the
   ability to ask kms to mint. The grant model (§3.2) stops being aspirational: every
   access is necessarily a mediated mint/proxy call, which is exactly the enforcement
   point where per-principal `ServiceAccess` checks and audit logging belong.
4. **Attenuation is enforced by the provider.** Minting can narrow to specific repos and
   permissions per request — so "agent Z may only touch repo X read-only" becomes a
   _GitHub-enforced_ property of the token it receives, not a policy we hope our own code
   honors. This is capability attenuation (the Keyhive sub-delegation idea) implemented by
   the upstream service today.
5. **Space-level, not user-level, sharing.** An installation belongs to the org/user who
   installed it and survives the connecting user leaving. A space's GitHub connection
   backed by an installation is naturally a _shared_ credential with a real owner — unlike
   today, where "the space's GitHub access" is secretly one member's personal token and
   dies (or lingers dangerously) when they leave.
6. **Attribution splits cleanly.** App-authored actions land as `app[bot]` on GitHub, and
   our mint-time grant check names the internal principal — user-authored actions stay on
   the user-to-server flow. Today every action by every member and agent is
   indistinguishable from the connecting user.

The atproto path is the precedent: kms already does DPoP-signed _proxied_ calls where the
key never leaves the DO (`proxyAtprotoCall`). Installation-token minting is the same
shape — a per-provider signer plus a short-TTL token cache — generalized.

### 5.4 The generalized connector taxonomy

GitHub is the canonical case of a split that recurs across providers, and the connector
model should name it:

- **User-identity connections** (OAuth/user-to-server): act _as a person_; right for
  reading your inbox, posting as you. Custody tiers L\*/C1; grant `read` is meaningful.
- **Installation connections** (GitHub App installations; Slack bot tokens; Google service
  accounts / domain-wide delegation; Atlassian Forge): act _as the integration_ against a
  resource set granted by a resource owner; platform custodies an app-level key; per-use
  short-lived, down-scoped tokens. Custody tier C2 only; grants are
  `discover`/`use`/`manage` — `read` doesn't exist.

DX-917's requirement flow gets sharper with this split: "requirement: github repo X"
resolves against installation coverage (is repo X in the selection?) rather than "is
there a GitHub token in the space", and an unsatisfiable requirement becomes an
actionable "install/extend the app on repo X" prompt.

### 5.5 What building it would take (edge-side)

1. App registration + secrets: app id, RSA PEM (env/keyring), webhook secret.
2. An RS256 app-JWT signer in kms (sibling of the atproto ES256 factory).
3. Installation storage: `installationId` per connection (captured via the `setup_url` /
   post-install callback), plus repo-selection metadata refresh.
4. Mint endpoint/binding: `getInstallationToken({connectionId, repos?, permissions?})`,
   membership + (once enforced) `ServiceAccess` checked at mint, 1 h cache keyed by the
   narrowed scope — the C2 tier's first concrete API.
5. Webhook receiver with `X-Hub-Signature-256` HMAC verification (the existing
   `/webhook/:token` bearer-URL scheme is insufficient for provider webhooks; the Ghost
   handler in hub-service is the only HMAC precedent in edge).

## 6. Open questions

1. **Vault granularity** — one vault per space, per connector, or per credential? Per-
   credential maximizes gating and revocation precision but multiplies BeeKEM groups;
   Keyhive targets ~thousands of members per group, so count is fine, but group _count_
   per user needs a sanity check against `keyhive_wasm` overhead.
2. **`use`-grant representation pre- and post-Keyhive** — extend `ServiceAccess`
   (capabilities list per service/token) now and swap the envelope later, or define the
   new grant schema in `@dxos/halo` first and back it with `ServiceAccess` via the adapter
   (mirrors the definitions-only pattern)?
3. **Local encryption-at-rest key for L1 before Keyhive** — device keyring (which itself
   stores plaintext pkcs8 today) vs non-extractable WebCrypto keys per device (no export,
   so vault re-encryption on device add/remove — essentially hand-rolling a small CGKA;
   argues for waiting on Keyhive for L1 and leaning on C1/C2 meanwhile).
4. **Refresh-token custody for L1** — local custody of an OAuth _refresh_ token means the
   client must run refresh; kms already owns cron refresh for C1. Does L1 only make sense
   for non-expiring secrets (PATs, API keys)?
5. **Cross-space sharing semantics** — when a vault is delegated to two spaces' groups,
   which space's policy governs mediation/audit? Probably the vault's own membership, but
   the UX surface (where grants are managed) needs a home in Composer.
6. **Keyhive timing risk** — pre-alpha, unaudited, no npm distribution. Steps 1–5 above
   are deliberately independent of the cut-over; only step 6 takes the dependency. The
   BeeKEM eprint reduces protocol risk but not code-audit risk.

## Appendix: source map

- New HALO API: `packages/core/halo/halo/{SPEC.mdl,src/}`; adapter
  `packages/core/halo/halo-adapter-client`; hooks `packages/core/halo/halo-react`.
- Keyhive plan: `packages/core/halo/halo/MIGRATION.md` (esp. §3 mapping, §5.1 EDGE spec);
  consumer seam: `API_AUDIT.md`, `CONSUMER_MIGRATION.md`, `MIGRATION_PLAN.md`.
- Token schema & resolution: `packages/core/compute/link/src/AccessToken.ts`,
  `packages/core/compute/compute/src/Credential.ts`,
  `packages/core/compute/compute-runtime/src/services/{credentials,access-token-resolver}.ts`,
  `packages/core/protocols/src/edge/edge.ts` (OAuth flow, `MANAGED_ACCESS_TOKEN`).
- Connector plugin: `packages/plugins/plugin-connector` (coordinator, OAuth plumbing,
  per-service connectors in `plugin-{atproto,bluesky,github,linear,slack,trello,…}`).
- Legacy credentials: `packages/core/protocols/src/proto/dxos/halo/credentials.proto`
  (`ServiceAccess` at :227), `packages/core/halo/credentials/src/**` (factory, verifier,
  presentations, state machines), `packages/core/halo/keyring`.
- Replication gating: `packages/core/echo/echo-host/src/automerge/automerge-host.ts:715`
  (subduction policy hooks), `.agents/skills/subduction/SKILL.md`.
- Keyhive upstream: inkandswitch/keyhive (+ `design/` docs), inkandswitch/subduction,
  IACR ePrint 2026/1434 (BeeKEM analysis), lab notebooks 00–06 at
  inkandswitch.com/keyhive/notebook.
- Linear: DX-799, DX-917, DX-979, DX-758/759, DX-874, DX-1107.
- Edge repo (dxos/edge, verified 2026-08-07 @ 2e59d8a): kms-service
  `src/store/space-secrets.ts` (`SpaceSecretsObject` DO, refresh alarm,
  `proxyAtprotoCall`; `makeAuthorizedCall` is an unimplemented stub),
  `src/store/space-secrets-store.ts` (`TokenInfo`), `src/oauth/{provider,handler,managed-tokens}.ts`
  (provider configs; `MANAGED_PROVIDERS = {GOOGLE}`), `src/api.ts` (`/oauth/*` routes;
  `/oauth/initiate` and `/atproto/proxy` lack membership checks — TODOs),
  `src/atproto/{handler,challenge}.ts` (DPoP/ES256 signer), hub-protocol
  `src/middleware.ts:350` (`edgeAuth`; nonce + ServiceAccess verification TODOs;
  `serviceAccessCapabilities` set but never enforced), functions-service
  `src/triggers/webhook.ts` (bearer-URL webhook, no HMAC).
- GitHub integration models: docs.github.com — "Differences between GitHub Apps and OAuth
  apps", "About authentication with a GitHub App", "Generating an installation access
  token", "Deciding when to build a GitHub App"; changelogs: fine-grained PATs GA
  (2025-03), enterprise-owned Apps GA (2025-03), enterprise installation APIs (2025-07),
  PKCE (2025-07), credential revocation API for OAuth/App credentials (2026-03).
