# Plugin Registry Spec

## Overview

The DXOS plugin registry is **AT Protocol-native**: there is no central registry database that
authors submit to. Instead, each publisher writes a small set of records to **their own** AT
Protocol repository (PDS), and a DXOS-operated **app-view** (in AT Protocol terms — the edge service
that indexes the firehose and serves a derived view) ingests those records, gates them by trust
attestations, and serves the resulting catalog to Composer.

This document specifies the four lexicons that make up the registry, the rkey conventions, the
trust/curation model, the integrity model, and the data flow from authoring to discovery. It is the
design reference for the machine-readable lexicons and the implementations that produce and consume
them.

Goals:

- **Publisher-owned data.** Records live in the publisher's repo; updating or removing a plugin is a
  record write or delete on their side, not a request to DXOS.
- **Curated discovery.** Only publishers a trusted verifier has vouched for are surfaced, keeping
  the catalog trustworthy without DXOS owning the data.
- **Standard tooling.** Records are plain AT Protocol records, readable by any ATProto client and
  written via standard XRPC (`com.atproto.repo.*`).

## Status

Experimental. The `experimental` segment in every NSID is intentional — these schemas are unstable
and will be renamed to a final namespace before promotion (see [Versioning](#versioning)).

## Source of truth

The machine-readable lexicons are the canonical definition:

- **Lexicon JSON** — `packages/sdk/edge-protocol/lexicons/org.dxos.experimental/*.json` (edge repo).
  These are the source of truth.
- **Effect-Schema validators** — `packages/services/registry-service/src/registry/atproto/schema.ts`
  (edge repo). Decoders used at the indexing/validation seam to reject malformed records before they
  enter the store. These mirror the JSON lexicons.
- **`PluginView`** — `packages/core/protocols/src/edge/registry.ts` (dxos repo). The catalog shape
  the indexer serves to Composer.
- **CLI writers** — `packages/plugins/plugin-registry/src/commands/registry/` (dxos repo). The `dx`
  CLI assembles record bodies and writes them via XRPC.
- **App-view / indexer** — `packages/services/registry-service/src/registry/atproto/{indexer,curator,backfill}.ts`
  (edge repo). The `RegistryIndexer` Durable Object is the registry app-view: it ingests records,
  enforces what the registry serves, and returns the catalog.

## Architecture

```
┌──────────────────┐   putRecord/    ┌─────────────┐   Jetstream    ┌──────────────────┐   GET /registry  ┌──────────┐
│  dx CLI          │   deleteRecord  │ Publisher   │   firehose +   │ RegistryIndexer  │   /plugins       │ Composer │
│ (plugin-registry)│──────XRPC──────▶│ PDS (repo)  │───backfill────▶│ DO (edge)        │─────────────────▶│          │
└──────────────────┘                 └─────────────┘                └──────────────────┘                  └──────────┘
                                          ▲                               │
                                  verifier│verification           verified-DID gate
                                          │                               │
                                   ┌─────────────┐                        │
                                   │ Verifier PDS│────────────────────────┘
                                   └─────────────┘
```

1. A publisher writes `package.profile` / `package.release` records (and a one-time
   `publisher.profile`) to their own PDS using the `dx` CLI.
2. A verifier writes `publisher.verification` records, one per trusted DID, to their own PDS.
3. The indexer learns the verified-DID set, then ingests matching records from verified publishers —
   live via the Jetstream firehose and via periodic backfill sweeps.
4. Composer queries the indexer for the catalog and loads each plugin's bundle on demand from its
   `moduleUrl`.

## Records

| NSID                                           | rkey               | Author    | Purpose                                 |
| ---------------------------------------------- | ------------------ | --------- | --------------------------------------- |
| `org.dxos.experimental.publisher.profile`      | `self`             | publisher | Identity-level publisher metadata.      |
| `org.dxos.experimental.publisher.verification` | `<verified DID>`   | verifier  | A trust attestation about a publisher.  |
| `org.dxos.experimental.package.profile`        | `<slug>`           | publisher | Plugin metadata (one per slug per DID). |
| `org.dxos.experimental.package.release`        | `<slug>:<version>` | publisher | A versioned artifact of a package.      |

All record bodies carry a `$type` field set to the NSID (standard ATProto convention; stamped by
the CLI on write). All records live in the author's own repo and are therefore mutable by that
author at the AT Protocol level; the **app-view** enforces immutability for what it serves (see
[Integrity & tamper detection](#integrity--tamper-detection)).

### `publisher.profile`

Identity-level metadata about a publisher. One record per DID, `rkey = self`.

| Field         | Required | Type         | Constraints | Notes                                     |
| ------------- | -------- | ------------ | ----------- | ----------------------------------------- |
| `displayName` | yes      | string       | 1–128 chars | Shown alongside the publisher's packages. |
| `bio`         | no       | string       | ≤512 chars  | Short description.                        |
| `homepageUrl` | no       | string (uri) |             | Canonical homepage.                       |
| `contact`     | no       | string       | ≤256 chars  | Contact channel (email, handle, etc.).    |

Written by `dx registry publish-publisher`.

### `publisher.verification`

A trust attestation that one identity (the verifier) vouches for a publisher. `rkey = <verified DID>`
by convention; `subject` is the authoritative field.

**Anyone can author verification records** — they are ordinary public AT Protocol records. Trust is a
policy applied at indexing time, not a write-time restriction (see [Trust model](#trust-model)).

| Field         | Required | Type              | Constraints | Notes                                                                                     |
| ------------- | -------- | ----------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `subject`     | yes      | string (did)      |             | DID of the verified publisher. Should match the rkey.                                     |
| `handle`      | yes      | string (handle)   |             | Publisher's handle at verification time; re-issued on change. Display-only, may be stale. |
| `displayName` | yes      | string            | 1–128 chars | Display name bound by this verification.                                                  |
| `createdAt`   | yes      | string (datetime) |             |                                                                                           |

Written by `dx registry verify`.

### `package.profile`

Mutable metadata for a discoverable plugin. `rkey = <slug>` (kebab-case `[a-z0-9-]`, ≤63 chars). The
slug is the plugin's globally-unique id and matches the plugin id in `dx.yml`.

| Field         | Required | Type                              | Constraints               | Notes                                                                                                  |
| ------------- | -------- | --------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `slug`        | yes      | string                            | 1–63 chars                | Stable id; equals the rkey.                                                                            |
| `name`        | yes      | string                            | 1–128 chars               | Display name.                                                                                          |
| `description` | yes      | string                            | ≤512 chars                | Shown in listings.                                                                                     |
| `homepage`    | no       | string (uri)                      |                           | Canonical homepage.                                                                                    |
| `source`      | no       | string (uri)                      |                           | Public source repository.                                                                              |
| `tags`        | no       | string[]                          | ≤16 items, item ≤32 chars | Discovery tags.                                                                                        |
| `screenshots` | no       | `(string \| { light?, dark? })[]` | item urls                 | Each entry is a URL, or a record of theme-specific URLs. See [Reconciliation](#schema-reconciliation). |
| `icon`        | no       | string                            | ≤64 chars                 | [Phosphor](https://phosphoricons.com) icon name, e.g. `ph--compass-tool--regular`.                     |
| `iconHue`     | no       | string                            | ≤32 chars                 | Theme hue hint for the icon backdrop (e.g. `indigo`).                                                  |
| `createdAt`   | yes      | string (datetime)                 |                           |                                                                                                        |

Written by `dx registry publish` (from the build manifest, which is emitted from `dx.yml`) or
`dx registry publish-package`.

### `package.release`

A record for one version of a package. `rkey = <slug>:<version>`. Conceptually append-only: a new
version is a new record, and the registry treats the first release seen per `(did, slug, version)`
as canonical — but the author technically retains write access to it (see
[Integrity & tamper detection](#integrity--tamper-detection)).

| Field          | Required | Type              | Constraints | Notes                                                                                                             |
| -------------- | -------- | ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `package`      | yes      | string            | ≤63 chars   | Slug of the parent `package.profile` authored by the same DID.                                                    |
| `version`      | yes      | string            | ≤32 chars   | Semver subset without build metadata; pre-release suffixes allowed (`1.2.3-rc.1`). Taken from `package.json`.     |
| `moduleUrl`    | yes      | string (uri)      | non-empty   | HTTPS URL of the module entrypoint / `manifest.json`. v0 trusts the publisher; content addressing is a follow-on. |
| `manifestHash` | no       | string            | ≤256 chars  | Integrity hash of the module manifest, e.g. `sha256-<base64>`.                                                    |
| `createdAt`    | yes      | string (datetime) |             |                                                                                                                   |

Written by `dx registry publish`.

> The release rkey uses `<slug>:<version>` (colon), matching the emdash prior art. `:` is a legal
> record-key character per the AT Protocol record-key grammar, and neither the slug `[a-z0-9-]` nor
> the version charset contains it, so it is unambiguous.

## Trust model

Verification records are public and unrestricted — anyone may author a `publisher.verification`. What
makes the catalog trustworthy is the **indexing policy**, not a write gate:

- **Today (single verifier).** The indexer is configured with one trusted verifier DID
  (`REGISTRY_CURATOR_DID`) and honors `publisher.verification` records **only** from that DID. The
  verified-DID set is the set of `subject`s across that verifier's records. A `package.*` or
  `publisher.profile` record is indexed only if its author DID is in the verified set. This is a
  deliberate moderation simplification while the registry is young — not a protocol restriction.
- **Revocation.** Deleting the verification record removes the publisher from the verified set on the
  next backfill sweep; the indexer unindexes their records.
- **Later (multiple verifiers / moderation).** The single-verifier gate is intended to generalize to
  multiple independent verifiers and moderation labels, similar to Bluesky's labeler model: clients
  (or the indexer) subscribe to a set of verifiers/labelers they trust, and a publisher is shown if
  any trusted verifier vouches for them. Until that moderation surface exists, DXOS only indexes
  records from publishers DXOS itself has verified.

A publisher may write their records before being verified — they simply won't appear in Composer
until a trusted verifier vouches for them.

## Integrity & tamper detection

Immutability is an **app-view guarantee, not an AT Protocol one.** Like every AT Protocol repo, a
publisher owns their PDS records and can mutate or delete any of them — including `package.release` —
and no protocol mechanism makes a record cryptographically immutable. Enforcement therefore lives at
the **registry app-view** (the edge service that indexes the firehose and serves the catalog to
Composer): the PDS is the mutable source, and the app-view is the canonical, immutable view of what
the registry serves.

What the app-view enforces:

- **Hosted bundles are immutable (enforced today).** Edge's `/registry/upload` rejects re-uploading an
  existing `(slug, version)` with a `409` (outside dev), so the code/assets behind a published version
  cannot be overwritten. A publisher self-hosting via `--asset-base-url` opts out of this guarantee.
- **First-seen release pinning (enforced today).** The app-view pins the first `(did, slug:version)`
  release it observes and ignores subsequent mutations to that record (`RegistryIndexer._writeRecord`),
  so a publisher who repoints or rewrites a published release on their PDS cannot change what the
  registry serves. A delete unindexes (clears the pin); a later recreate at the same rkey re-pins to the
  new value. The pin lives in DO storage — a full DO eviction re-pins from current PDS state on the next
  backfill (durable cross-eviction pinning is a follow-on).

What stays mutable (the AT Protocol layer):

- The PDS `package.release` record is written with `putRecord` (upsert), and the publisher can change
  its `moduleUrl` / `manifestHash` at will. That is fine — the app-view's pin means such a change is not
  re-served (the PDS is the mutable source; the app-view is the canonical view).

Detectability (planned):

- **Client-side verification.** Composer should verify the bundle it loads against the app-view's
  pinned `manifestHash` and refuse to load on mismatch.
- **Content addressing & signatures.** Longer term, address bundles by content hash and/or sign
  release records so any party can verify integrity independently of the app-view.

Until first-seen pinning and client-side verification land, treat a release's `moduleUrl` as
publisher-trusted at the record level (the hosted bundle itself is already immutable).

## Indexing

- **Bootstrap / backfill.** On first run (and periodically), the indexer walks the verifier's repo
  for verification records to compute the verified-DID set, then lists each verified publisher's repo
  for `package.*` records (`runBackfill`). The catalog (`GET /registry/plugins`) collects releases
  per `(authorDid, package-slug)` — grouped by the release's `package` field, **not** by parsing the
  rkey — newest-first, anchored by `at://<authorDid>/org.dxos.experimental.package.profile/<slug>`.
- **Live updates.** The indexer subscribes to the Jetstream firehose; commits for the four NSIDs are
  validated (Effect-Schema) and written/deleted in DO storage, keyed by `record:<nsid>|<did>|<rkey>`.
- **Validation seam.** Malformed records are rejected at ingestion against the Effect-Schema mirrors
  of the JSON lexicons; they never enter the store.

## Authoring

The `dx` CLI writes records to the publisher's PDS over standard XRPC (`com.atproto.repo.putRecord`,
`deleteRecord`, `listRecords`). It supports two auth modes (see
[Publishing a Plugin](/docs/composer/publishing-plugins) for the user-facing flow):

- **Logged-in identity (default).** After `dx account login`, writes are DPoP-signed by DXOS edge
  using the AT Protocol account connected to the user's identity (the "Atmosphere" integration in
  their personal space) — no app password.
- **App password (headless).** `--handle` / `--app-password` (or `$ATPROTO_HANDLE` /
  `$ATPROTO_APP_PASSWORD`) authenticate directly against the PDS.

## Versioning

Every NSID is under `org.dxos.experimental.*`. The namespace is deliberately marked unstable: fields
and record shapes may change without migration guarantees. A final namespace
(`org.dxos.registry.*` or similar) will be minted before promotion, at which point the experimental
lexicons are frozen and the indexer dual-reads during a migration window.

Package and publisher profiles are mutable (last-write-wins per rkey). Releases are conceptually
single-write per version but not enforced (see [Integrity & tamper detection](#integrity--tamper-detection)).
There is no in-band schema-version field on records — the NSID encodes the version.

## SDK compatibility & the upgrade train

Composer plugins **externalize `@dxos/*`** — at runtime they use the host's copy, so a plugin only
works if it was built against an SDK compatible with what Composer ships. DXOS ships all `@dxos/*` as
**one unit at one version** (`DXOS_VERSION`).

**Mechanism — the manifest dependency snapshot.** The build (`composerPlugin`) auto-populates a
`dependencies` map into the plugin's `manifest.json`: every declared dependency resolved to its
concrete installed version (`{ "@dxos/app-framework": "0.8.3", "react": "19.2.0", … }`). This flows
into the `package.release` record and the catalog (`PluginRelease.dependencies`). The host computes
compatibility from the **subset it shares with the plugin** — the externalized `@dxos/*` packages —
comparing each against its own shipped version under a policy (pre-1.0: **same minor**; post-1.0:
caret). The remaining (bundled) deps are recorded for transparency/audit. A release with no
`dependencies` is treated as "unknown" (legacy) and not gated.

**Rollout-decoupling.** Because each release records the SDK it built against, a **stable Composer
ignores plugin versions built for a newer SDK** — they don't surface as available upgrades. This lets
plugin authors publish new versions _ahead_ of the stable Composer release without breaking users on
the current version; those users pick the new versions up only once their Composer catches up.

**The upgrade train** (operationalized in the plugins monorepo's `RELEASING.md`):

1. **Continuous tracking (never released).** A nightly job points the monorepo's SDK catalog at the
   latest DXOS `main` via `pkg.pr.new` and opens/updates an "SDK upgrade" PR; CI builds all plugins.
   These prerelease pins may land on `main` to keep pace, but a **release guard forbids publishing**
   against a non-released SDK.
2. **On a cut SDK npm release.** A separate job bumps the catalog to the npm version, a **Composer
   beta** ships on it, and new plugin versions are published against it (their manifests now declare
   the new SDK).
3. **Migration window (risk-scaled).** Hold before promoting the new SDK/Composer to stable; the
   window scales with risk (longer for breaking changes) so authors can migrate, while the
   compatibility gate keeps old and new users on the right versions. Exact windows are TBD.

## Prior art

These lexicons are modeled on the emdash RFC:

- RFC: [emdash-cms/emdash#694](https://github.com/emdash-cms/emdash/pull/694) — design rationale,
  trust-model trade-offs, rkey conventions, and the `experimental` namespace strategy.
- Implementation: [emdash-cms/emdash#923](https://github.com/emdash-cms/emdash/pull/923).

Difference from emdash's `com.emdashcms.experimental.*`: `releaseExtension` / `declaredAccess`
records (sandbox manifest, granular permissions) are **not** in v0; they are a follow-on once the
runtime sandbox surface is defined. (rkey conventions now match emdash, including `<slug>:<version>`.)

## Schema reconciliation

The JSON lexicons (source of truth), the Effect-Schema validators, `PluginView`, and the CLI had
drifted on `package.profile`. Agreed resolutions:

- **`icon`** — a **string** Phosphor icon name (e.g. `ph--compass-tool--regular`), not an embedded
  blob. The CLI writes a name string and the indexer/Composer render by name. _Reconciled:_ the
  lexicon (`blob → string`) and the validator (`unknown → string`); `PluginView.icon` is already a
  string.
- **`screenshots`** — `(string | { light?: uri; dark?: uri })[]`: each entry is a plain URL or a
  record of theme-specific URLs. _Reconciled on the dxos side; one edge step pending._
  - **Done (dxos):** `@dxos/protocols` `edge/registry.ts` (`ScreenshotSchema`, used by both
    `PluginProfileSchema` and the deprecated `PluginMetaSchema`/manifest); app-framework `Plugin.Meta`,
    `Registry.Plugin`, `PluginMetaEntry`, and the `dx-compile` mirror; the CLI `ManifestSchema`;
    Composer's `PluginDetail` rendering (theme-aware variant selection via `useThemeContext`); the
    publishing-plugins docs + example.
  - **Done (edge):** `package.profile.json` lexicon declares the field (a `string | object` array item
    isn't cleanly expressible in Lexicon, so items are typed `unknown` with a description; the canonical
    shape is enforced by the validator).
  - **Pending (edge), blocked on a `@dxos/protocols` publish + bump:** the validator (`schema.ts`)
    `screenshots` union and the indexer's assignment into `PluginView`. Edge consumes `@dxos/protocols`
    as a published dependency, so the validator can't adopt the union until the new protocols (with the
    `ScreenshotSchema`-typed `PluginView`) is published and the edge repo bumps it — otherwise the
    indexer's `PluginView.screenshots` assignment fails to type-check.
  - **Sequencing caveat / footgun:** the union is backward-compatible (a plain URL string is still
    valid), but until the edge validator accepts the union, a `{ light, dark }` screenshot would be
    _rejected at indexing_ (the whole `package.profile` fails validation), so the plugin wouldn't appear.
    Publishers should use plain URL screenshots until the edge update is deployed.
- **`dependencies`** (SDK-compat snapshot on `package.release`; see
  [SDK compatibility](#sdk-compatibility--the-upgrade-train)). _Done:_ `composerPlugin` emits it; the
  build `Manifest`, `@dxos/protocols` `PluginManifestSchema` + `PluginReleaseSchema`, the CLI release
  write, the edge lexicon (`unknown`-typed map + description), and the edge validator (which preserves
  it in storage). _Pending, blocked on the `@dxos/protocols` publish + edge bump:_ the indexer
  projecting `release.dependencies` into `PluginView.releases`, and Composer's load/UI compatibility
  gate — both consume the new `PluginRelease.dependencies` from published protocols. Backward-compatible
  (absent = unknown), so it lands incrementally.

## Open questions & follow-ons

- **Integrity / tamper detection** — first-seen release pinning is enforced at the app-view; still to
  do (see [Integrity & tamper detection](#integrity--tamper-detection)): client-side `manifestHash`
  verification, durable pinning across full DO eviction, and longer term content addressing + signed
  release records.
- **Multiple verifiers / moderation** — generalize the single-verifier gate to a trusted-verifier set
  / labeler model.
- **Sandbox & permissions** — `releaseExtension` / `declaredAccess` lexicons, deferred until the
  plugin runtime sandbox and permission model are defined.
- **Namespace promotion** — finalize the stable namespace and the dual-read migration plan.
- **Production proxy auth** — the edge `/atproto/proxy` route used by the logged-in DPoP write path
  currently runs `skipAuth` in dev; production must require the caller's verifiable presentation.
