# Direct Publishing to the Plugin Registry

Status: **proposal**. Companion to [REGISTRY.md](./REGISTRY.md), which specifies the AT Protocol
catalog this extends.

## Summary

Let a DXOS identity publish a Composer plugin straight to the registry with one `dx` command — no
AT Protocol account, no PDS records, no verifier. The registry service (edge repo,
`packages/services/registry-service`) gains a D1 database that records **who owns each plugin key**
and **which versions exist**, reuses its existing R2 bucket for bundles, and serves direct-published
plugins in the same `GET /registry/plugins` catalog Composer already reads. Publishing authenticates
with either a HALO verifiable presentation or a hub API token, so the CLI works in the cloud sandbox.

## What exists today

The premise that the registry "scans GitHub releases" is out of date: that v1 path is gone (only stale
comments remain, e.g. `vite-plugin/manifest.ts:11`). The live registry is AT Protocol-native:

| Piece                     | Where                                                                    | What it does                                                                                             |
| ------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Build                     | `app-framework/src/vite-plugin/composer`                                 | Emits `index.mjs` + `manifest.json` (profile, `version`, `assets`, resolved `dependencies`).             |
| `dx registry publish`     | `plugin-registry/src/commands/registry/publish.ts`                       | Builds, uploads the bundle, then writes `plugin.profile` / `plugin.release` records to the author's PDS. |
| `POST /registry/upload`   | edge `registry-service/src/api.ts`                                       | Stores files in R2 at `modules/<slug>/<version>/…`; 409 on an existing version (outside dev).            |
| `GET /registry/modules/…` | same                                                                     | Public, CORS `*` bundle hosting; this is every release's `moduleUrl`.                                    |
| `RegistryIndexer` DO      | edge `registry-service/src/registry/atproto/`                            | Indexes Jetstream + backfill, gated by `publisher.verification` records from `REGISTRY_CURATOR_DID`.     |
| `GET /registry/plugins`   | same                                                                     | Catalog (`GetPluginsResponseBody`, `PluginView[]`) consumed by `EdgeRegistryPluginProvider` in Composer. |
| API tokens                | edge `hub-service` (`ApiToken` table), `hub-protocol` `edgeAuth`         | `dx-api01-…` bearer tokens, VP-minted, verified over `HUB_SERVICE.verifyApiToken`. No scopes yet.        |
| Function deploy           | dxos `dx function deploy` → edge `compute-service` `PUT /functions/:id?` | The ownership precedent: D1 `Function.ownerUri`, `FunctionVersion` states, caller DID must equal owner.  |

### Gaps this design closes

1. **Publishing needs an AT Protocol account and a verifier.** A DXOS user with only a HALO identity
   cannot get a plugin into the catalog; a verified publisher must also own a PDS.
2. **Plugin keys have no owner.** `/registry/upload` accepts any `slug` from any authenticated
   identity (or the admin key). Two identities can upload different versions under the same key, and
   nothing records the uploader, so hosted bundles under `modules/<key>/` can come from mixed authors.
3. **No API-token auth on upload.** The route allows `adminKey` + `verifiablePresentation` only
   (TODO at `api.ts:142`), so headless publishing uses the shared admin key. registry-service has no
   `HUB_SERVICE` binding, so it cannot verify API tokens or look up accounts.
4. **Hash is publisher-asserted.** `manifestHash` is computed by the CLI and written to the PDS record;
   the server never computes it.

## Goals and non-goals

Goals:

- `dx registry publish` publishes a built plugin with nothing but a DXOS identity or API token.
- Every plugin key has exactly one owning identity, enforced server-side, across **both** publish
  paths.
- Released versions stay immutable; the server computes the integrity hash.
- Composer needs no new loader: direct releases are served through the existing catalog and
  `moduleUrl` scheme.

Non-goals (this cut):

- Sandboxing or permission manifests for plugin code (REGISTRY.md "Sandbox & permissions").
- Multi-owner / organization publishers (the schema leaves room; see Follow-ons).
- Replacing the AT Protocol path. It stays for publishers who want self-owned records.

## Design

### Storage

Add a D1 database to registry-service, `plugin-registry` (`-main` for preview, `-production`),
binding `PLUGIN_REGISTRY_DB`, managed with Prisma + `wrangler d1 migrations` exactly like
compute-service. D1 over the indexer DO because ownership must be durable and queryable
independent of the indexer, which is a re-derivable cache whose pins do not survive eviction.

```prisma
model Plugin {
  // Reverse-domain key from dx.config.ts (`plugin.key`), e.g. `org.example.kanban`. Global namespace.
  key           String          @id
  created       DateTime        @default(now())
  updated       DateTime        @updatedAt

  // did:halo:… of the owning identity, or `realm:dxos` for first-party plugins published with the admin key.
  ownerUri      String

  // How the key was claimed: `DIRECT` (this API) or `ATPROTO` (claimed by a /upload from the ATProto path).
  source        String

  // Latest PluginProfileSchema JSON (name, description, icon, tags, …).
  profileJSON   String          @default("{}")

  // `ACTIVE` | `HIDDEN` (owner unpublished) | `BLOCKED` (moderation).
  status        String          @default("ACTIVE")

  releases      PluginRelease[]

  @@index([ownerUri])
}

model PluginRelease {
  id              Int      @id @default(autoincrement())
  created         DateTime @default(now())
  updated         DateTime @updatedAt

  plugin          Plugin   @relation(fields: [pluginKey], references: [key])
  pluginKey       String
  version         String

  // `PENDING` (upload in progress / failed, retryable) | `PUBLISHED` | `YANKED`.
  state           String   @default("PENDING")

  // Upload lease: at most one live upload attempt per release; the lease id names that attempt's R2 prefix.
  leaseId         String?
  leaseExpiresAt  DateTime?

  // Attempt whose R2 prefix is served once PUBLISHED; set atomically with the state change.
  attemptId       String?

  // sha256-<base64> of manifest.json as stored, computed by the server.
  manifestHash    String?
  dependenciesJSON String  @default("{}")

  // did:halo:… that performed the upload; equals the owner today, differs once maintainers exist.
  publishedBy     String

  @@unique([pluginKey, version])
  @@index([state, created])
}
```

R2 keeps the `PLUGIN_BUNDLES` bucket. Direct uploads write to an attempt-specific prefix,
`releases/<key>/<version>/<attemptId>/<path>`, and never to a shared one, so an upload whose lease
expired mid-write can only touch its own, never-served prefix. The public URL stays
`https://<edge>/registry/modules/<key>/<version>/manifest.json`, identical in shape to an AT Protocol
release, so Composer's `UrlLoader` sees no difference: `GET /modules/:key/:version/*` resolves the
release's published `attemptId` from D1 and reads that prefix, falling back to the legacy
`modules/<key>/<version>/` prefix for releases uploaded through `/upload`. The lookup is cacheable
indefinitely because a published release never changes. Unpublished attempt prefixes are deleted by
a periodic sweep.

### Ownership

- **First publish claims the key.** Inserting `Plugin` with the caller as `ownerUri` is the claim; a
  later publish by anyone else gets `403 plugin_key_owned`. The owner is taken from
  `ctx.var.userIdentity` set by `edgeAuth`, never from the request body (the compute-service rule).
- **The claim covers the AT Protocol path too.** `POST /upload` inserts or checks the same `Plugin`
  row (`source = ATPROTO`) before writing R2. This closes gap 2 for both paths and is the one
  behavior change to an existing route.
- **Backfill existing prefixes before enforcing.** Keys already in R2 have no owner row, so the
  `/upload` check ships in two steps. First a report-only scan lists every `modules/<key>/` prefix
  with the `plugin.profile` records (verified or not) whose releases point at it. Keys with exactly
  one plausible publisher get that owner; first-party keys get `realm:dxos`; ambiguous or unmatched
  keys are left **unclaimed**, not assigned to `realm:dxos`, so the next upload by the actual
  publisher claims them. Only then is the check turned
  on. `POST /admin/plugins/:key/owner` reassigns a key when a publisher reports a wrong claim.
- **Reserved prefixes.** Keys under `org.dxos.` / `dxos.` can only be claimed with the admin key
  (owner `realm:dxos`), mirroring `/admin/functions`. The loader already rejects ids that collide with
  builtin plugins (`UrlLoader.make`); this stops them at the registry as well.

### Auth

All write routes use:

```ts
edgeAuth(() => ({
  allowedMethods: ['verifiablePresentation', 'apiToken', 'adminKey'],
  skipAuth: isDevLikeEnvironment(WorkerEnv.getOptional()),
  nonceAudience: NonceAudience.getOptional(),
  lookupAccount: accountLookupViaHubService({ failOpen: false }),
  allowLocalDevAccountBypass: false,
}));
```

- **Identity (VP).** The logged-in `dx` client signs a presentation (`EdgeHttpClient` `auth: true`).
- **API token.** `Authorization: Bearer dx-api01-…`, minted in the hub console; this is the sandbox
  path. A token publishes only if it carries the `registry:publish` scope. Tokens are unscoped today
  (`api-tokens/DESIGN.md` §9), and an unscoped token that can publish lets whoever holds it ship code
  into other users' Composer, so this feature adds the nullable `scopes` column the token design
  reserved, mints tokens with an explicit scope list, and makes `verifyApiToken` return it. Publishing
  rejects a token without the scope with `403 insufficient_scope`; VP publishes need no scope.
  Token verification requires adding the `HUB_SERVICE` service binding (entrypoint
  `HubServiceEntrypoint`) to every registry-service env, and setting `NONCE_AUDIENCE` so edge-minted
  challenges verify (`docs/audits/hub-service-keypair.md:121`).
- **Admin key.** Only for `realm:dxos` keys; it may not claim or publish third-party keys.
- `failOpen: false` because publishing ships code into other users' browsers: a hub outage must refuse
  the publish, not skip the suspended-account check.

### API

All under the existing `/registry` mount (edge `api.ts` forwards to `REGISTRY_SERVICE`).

| Method + path                            | Auth  | Purpose                                                                                                       |
| ---------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| `PUT /plugins/:key/releases/:version`    | write | Publish one release: multipart form, `manifest.json` + every asset it lists. Claims the key on first publish. |
| `PATCH /plugins/:key`                    | owner | Update the profile without a release (description, screenshots, …); `status: HIDDEN` unpublishes.             |
| `DELETE /plugins/:key/releases/:version` | owner | Yank: `state = YANKED`. Bundle stays in R2 so installed copies keep loading; the catalog stops offering it.   |
| `GET /plugins/mine`                      | read  | The caller's plugins with every release and state, including hidden and yanked (the catalog omits those).     |
| `GET /plugins`                           | none  | Existing catalog, now merging direct plugins (below).                                                         |
| `POST /admin/plugins/:key/status`        | admin | Moderation: `BLOCKED` removes a plugin from the catalog regardless of source.                                 |
| `POST /admin/plugins/:key/owner`         | admin | Reassign a key's owner, for a backfill claim a publisher disputes.                                            |

`PUT …/releases/:version` handling, in order:

1. Validate `key` (reverse-domain, `[a-z0-9.]`, ≤63) and `version` (semver subset, ≤32) — the same
   limits as the lexicons.
2. Parse `manifest.json` with `PluginManifestSchema`; require `manifest.key === key`,
   `manifest.version === version`, and that the uploaded file set equals `manifest.assets` (no
   unlisted files, no missing ones, no `..` or absolute paths). Enforce a total-size cap.
3. Claim or check ownership in one D1 batch: upsert `Plugin` (insert if absent; else require
   `ownerUri === caller`), insert `PluginRelease` as `PENDING`. An existing `PUBLISHED` or `YANKED`
   release → `409`; an existing `PENDING` one is a retry of a failed upload and proceeds.
4. Acquire the upload lease with one conditional `UPDATE` that sets `leaseId` and
   `leaseExpiresAt = now + 5m` only where `state = 'PENDING'` and the current lease is absent or
   expired. Zero rows changed → `409 upload_in_progress`. The new `leaseId` is this attempt's id.
5. Write every file under `releases/<key>/<version>/<leaseId>/`. R2 keeps the last write to a key,
   so a shared prefix would let two attempts interleave; per-attempt prefixes make that impossible
   even after a lease expires with writes still in flight.
6. Compute `manifestHash` over the stored manifest bytes, then publish in one batch guarded by
   `leaseId = ? AND leaseExpiresAt > now`: set `state = PUBLISHED`, `attemptId = leaseId`, the hash,
   `dependenciesJSON` and the profile from the manifest, and clear the lease. Zero rows changed means
   the lease expired or was taken over, and the request fails without publishing. Selecting
   `attemptId` is the atomic switch; nothing is served from an attempt until it is selected. On
   failure, clear the lease only `WHERE leaseId = ?`, leaving the release `PENDING`.
7. Return `{ key, version, moduleUrl, manifestHash }`.

Multipart rather than the JSON-with-base64 body `/upload` uses: it avoids the 33% inflation and
matches `uploadFunction`. The current `/upload` stays for the AT Protocol path.

The dev and local re-upload exemption of `/upload` applies here too (`state` may go back to
`PENDING`), so iterating in the `dev` sandbox does not need a version bump.

### Catalog and trust

`GET /plugins` returns AT Protocol entries from the indexer plus `Plugin` rows with at least one
`PUBLISHED` release and `status = ACTIVE`. For direct entries the `PluginView` is:

- `uri`: `https://<edge>/registry/plugins/<key>` (not an `at://` URI).
- `did`: the owner's identity URI (`did:halo:…`, or `realm:dxos` for first-party plugins), so the
  `PluginViewSchema.did` doc comment widens from "publisher DID" accordingly.
- `handle`: the owner's account display name, if the hub has one.
- `releases`: `PUBLISHED` releases newest-first, each carrying the server `manifestHash`.
- `labels`: `['direct']`, plus `'verified'` only if an admin has verified the owner.

Trust is the real design decision here. The AT Protocol path surfaces only curator-verified
publishers; direct publishing removes that gate by construction. The proposal keeps both
properties:

- Add `source: 'atproto' | 'direct'` to `PluginViewSchema` in `@dxos/protocols` (additive, optional for
  older clients).
- Composer's registry UI lists `verified` plugins by default and shows unverified direct plugins behind
  an explicit "Show unverified" toggle, with the existing trust confirmation `dx plugin add` already
  performs. Nothing unverified is auto-offered as an update.
- Verification for direct publishers is an admin route in this cut (`POST /admin/publishers/:did/verify`,
  stored in a `Publisher(did, verifiedAt, verifiedBy)` table). Unifying it with `publisher.verification`
  records is a follow-on.

**One catalog entry per key.** Composer addresses plugins by key alone
(`EdgeRegistryPluginProvider.getPlugin` / `listVersions` take the first entry whose `profile.key`
matches), so the catalog must not emit two entries for one key. The D1 claim decides which survives:
a key claimed `DIRECT` emits only the direct entry and drops AT Protocol entries for it; a key claimed
`ATPROTO` emits only the AT Protocol entry whose releases point at that key's hosted prefix; an
unclaimed key keeps today's indexer output. The indexer can still hold several `(did, key)` records;
the merge step is where uniqueness is enforced.

### Client and CLI (dxos repo)

- **`EdgeHttpClient`** (`core/mesh/edge-client/src/edge-http-client.ts`): add `publishPluginRelease(ctx,
{ key, version, files: { path, data: Uint8Array }[] })`, `updatePluginProfile`, `yankPluginRelease`,
  `listOwnedPlugins`. Request/response schemas go next to the existing ones in
  `core/protocols/src/edge/registry.ts`. The existing `apiKey` option already sends
  `Authorization: Bearer …`, so an API token works with no new client auth code. `BaseHttpClient` does
  not check the scheme today, so it gains a guard: with `apiKey` set, refuse any base URL that is not
  `https:` (loopback hosts excepted, for `wrangler dev`) rather than send the token in cleartext.
- **`dx registry publish`** (`plugin-registry/src/commands/registry/publish.ts`): add
  `--target direct|atproto`. `direct` runs the existing build + manifest steps, then a single
  `publishPluginRelease`, and skips PDS session resolution entirely. Default to `direct` for
  identities with no connected AT Protocol account, `atproto` otherwise, so current publishers see no
  change.
- **Auth selection**, first match wins: `$DX_API_TOKEN` (or `--api-token`) → bearer token; logged-in
  HALO identity → presentation; `$DX_HUB_API_KEY` → admin key (first-party only). In the sandbox the
  first case applies.
- **New subcommands**: `dx registry yank <key> <version>`, `dx registry list --mine`, and
  `dx registry unpublish --target direct` → `PATCH status: HIDDEN`.

## Open questions

1. **Identity deletion.** compute-service deletes an identity's functions on account deletion. Deleting
   published plugins would break every installed copy; the proposal is to set `status = HIDDEN` and
   transfer ownership to `realm:dxos` instead. Confirm.
2. **Verification default.** Is "unverified behind a toggle" acceptable, or should direct plugins be
   invisible in Composer until verified (the AT Protocol behavior)?

## Implementation plan

Order matters: the dxos schema change must publish before edge can consume it.

1. **dxos — protocols**: request/response schemas and `PluginView.source`; `EdgeHttpClient` methods.
2. **edge — foundations**: D1 database + Prisma schema + migration, `HUB_SERVICE` binding,
   `NONCE_AUDIENCE`, `pnpm check:bindings` green in every env; `ApiToken.scopes` column, scoped minting,
   and `scopes` in the `verifyApiToken` result (hub-service).
3. **edge — ownership on `/upload`**: the report-only prefix scan, then the backfill, then
   claim-or-check before writing R2. Independently valuable; ships first.
4. **edge — direct publish routes** and catalog merge, with `*.workerd.test.ts` coverage alongside
   `registry-upload.workerd.test.ts` (claim, foreign-owner 403, re-publish 409, pending retry, concurrent
   upload 409, expired-lease publish rejected, yank, unscoped-token 403, API-token auth).
5. **dxos — CLI**: `--target direct`, token auth, `yank` / `list --mine`; update
   `docs/composer/publishing-plugins.md` (also fix its stale `package.*` NSIDs and `outdir` field).
6. **dxos — Composer**: `direct` / unverified badges and toggle in `plugin-registry`; client-side
   `manifestHash` verification in `UrlLoader.loadFromManifest`, which now has a server-computed hash to
   check against.

## Follow-ons

- Maintainers: a `PluginMaintainer(pluginKey, identityDid, role)` table; `publishedBy` already records
  who uploaded.
- Ownership transfer (`POST /plugins/:key/transfer`, accepted by the recipient).
- Unifying direct-publisher verification with AT Protocol `publisher.verification` records, e.g. a
  HALO identity linking its AT Protocol DID so one verification covers both.
- Content-addressed bundles (the blob-service digest scheme) so integrity no longer depends on the
  registry.
