# `org.dxos.experimental.*` lexicons

Experimental AT Protocol lexicons for the DXOS plugin registry. The `experimental` segment is intentional — these schemas are unstable and will be renamed to a final namespace before promotion.

## Records

| NSID                                           | rkey               | Purpose                                               |
| ---------------------------------------------- | ------------------ | ----------------------------------------------------- |
| `org.dxos.experimental.package.profile`        | `<key>`            | Mutable package metadata (one per key per DID).       |
| `org.dxos.experimental.package.release`        | `<key>:<version>`  | Versioned artifact record (conceptually single-write).|
| `org.dxos.experimental.publisher.profile`      | `self`             | Identity-level publisher metadata.                    |
| `org.dxos.experimental.publisher.verification` | `<verified DID>`   | Trust attestation about a publisher.                  |

## Trust model

`publisher.verification` records are public and unrestricted — anyone may author one. Trust is an indexing policy, not a write gate. Today the indexer honors verification records **only** from a single configured verifier DID (`REGISTRY_CURATOR_DID`) and indexes a publisher's records only if that verifier has vouched for the author DID. Revocation is achieved by deleting the verification record — the indexer unindexes that publisher on the next backfill sweep. This single-verifier gate is intended to generalize to multiple verifiers / moderation labels (à la Bluesky labelers) once that surface exists.

See `packages/sdk/app-framework/docs/registry-spec.md` for the full design, including the integrity / tamper-detection model.

## Prior art

These lexicons are modeled on the emdash RFC:

- RFC: [emdash-cms/emdash#694](https://github.com/emdash-cms/emdash/pull/694) — design rationale, trust model trade-offs, rkey conventions, and the `experimental` namespace strategy.
- Implementation: [emdash-cms/emdash#923](https://github.com/emdash-cms/emdash/pull/923) — client, CLI, and lexicon bindings.

Differences from emdash's `com.emdashcms.experimental.*`:

- `releaseExtension` / `declaredAccess` records (sandbox manifest, granular permissions) are **not** included in v0; they will be added in a follow-on once the runtime sandbox surface is defined.
