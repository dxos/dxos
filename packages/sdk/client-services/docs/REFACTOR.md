# `@dxos/client-services` — restructure proposal

Companion to [`DEPENDENCY-GRAPH.md`](./DEPENDENCY-GRAPH.md), which measures the
current shape. This file proposes the target and the order to get there.

## Goal

1. **Acyclic.** `scripts/dependency-graph.mjs --check` exits 0.
2. **Namespace modules.** Every module is `src/<Name>.ts`, marked
   `@import-as-namespace`, re-exported as `export * as <Name>` from `index.ts`,
   per the `code-style` skill (`@dxos/echo` is the reference).
3. **Each module owns its wiring.** A module exports its own `Layer` _and_ its
   own `LayerSpec`. `ServiceStack` assembles a list of specs; it does not
   construct layers.
4. **Minimal cross-deps.** A module imports a peer's _tag_, never its
   implementation module.

## Target layout

```
src/
  index.ts                 -- export * as Foo from './Foo.ts'
  errors.ts
  Tags.ts                  -- every Context tag + its interface type   (tier 0)
  Events.ts                -- lifecycle Hooks                          (tier 0)
  Readiness.ts             -- StackReadiness                           (tier 0)
  SqliteStorage.ts                                                     (tier 0)
  PlatformInfo.ts                                                      (tier 0)
  migrations/              -- SQL assets, so a directory                (tier 0)

  Metadata.ts  Pipeline.ts  SpaceExport.ts  Storage.ts                 (tier 1)
  Replication.ts           -- EdgeFeedReplicator, credentials document (tier 1)
  Auth.ts                  -- createAuthProvider, TrustedKeySet…       (tier 1)
  Identity.ts              -- the Identity aggregate only              (tier 1)

  IdentityManager.ts  Space.ts  Spaces.ts  Invitations.ts              (tier 2)
  Devices.ts  Devtools.ts  Diagnostics.ts  Agents.ts
  Logging.ts  Network.ts  System.ts

  ServiceStack.ts          -- spec list + layerClientServices          (tier 3)
  Worker.ts                                                            (tier 3)
  testing/
  internal/                -- not exported
```

Tier rule: a module may import strictly lower tiers only. `Tags.ts` imports
nothing from the package.

## Why `Tags.ts` rather than a tag per module

The measurement in §2.2 of the graph doc is the argument: 3 of the 4 residual
domain cycles exist because declaring a dependency on a peer requires importing
that peer's implementation. Effect's own guidance is that a tag is an _interface_
— putting the 18 tags plus their interface types in one leaf makes "module A
depends on service B" expressible without an implementation edge, and is what
takes the graph from a 2-cycle to acyclic.

`Tags.ts` stays cheap because it holds interfaces and `Context.Service` classes
only; every class body stays in its own module.

## Stages

Each stage is independently landable and leaves the build green.

### Stage 1 — extract the kernel (tier 0) — **done**

Move out of `packlets/services/`, unchanged:

| from                          | to                     |
| ----------------------------- | ---------------------- |
| `services/events.ts`          | `src/Events.ts`        |
| `services/stack-readiness.ts` | `src/Readiness.ts`     |
| `services/sqlite-storage.ts`  | `src/SqliteStorage.ts` |
| `services/platform.ts`        | `src/PlatformInfo.ts`  |
| `packlets/migrations/`        | `src/migrations/`      |

Effect: largest SCC 11 → 4. No behaviour change; imports only.

### Stage 2 — tier-1 leaves (§2.3 of the graph doc) — **done**

- `identity/authenticator.ts` → `src/Auth.ts`.
- `spaces/edge-feed-replicator.ts` → `src/Replication.ts`,
  `spaces/credentials-document-store.ts` → `src/CredentialsDocument.ts`.
- `space/auth.ts`'s `AuthProvider` / `AuthVerifier` types join `src/Auth.ts`;
  `AuthExtension` stays in `space` with its teleport dependency.
- `identity/identity.ts` (the `Identity` class) → `src/Identity.ts`; this is what
  lets `Events.ts` sit in tier 0 with a type-only import.
- `space-export/serialized-space-writer.ts` takes `ExportableSpace` — the three
  members it actually reads — instead of `type DataSpace`.

Effect: largest SCC 4 → 2 (`identity ↔ spaces`), then 2 → none once Stage 3
lands the tags.

### Stage 3 — tag/implementation split — **done**

Only the tags whose consumers sit _beside or below_ the implementation need to
move — measured, that is six of the eighteen: `IdentityManagerService`,
`IdentityProviderService`, `IdentityLifecycleService`, `InvitationsManagerService`,
`DataSpaceManagerService` and `SigningContextProviderService`. They go to
`src/Tags.ts`, which references each implementation through a **type-only**
import: the tag keeps its exact service type without a hand-written interface,
and the import is erased on emit so it carries no runtime edge. Each
implementation module now imports its own tag from `Tags.ts`, which is the only
direction that remains at runtime.

The other twelve tags stay next to their implementations, because every consumer
already sits above them.

Effect: **acyclic** — 57 edges down to 33, largest SCC 11 → 1.
`dependency-graph.mjs --check` now exits 0 and is wired up as `client-services:graph`.

### Stage 4 — namespace modules — **done**

Every packlet moved to `src/internal/<name>/`, which is not exported, and each one
that has a public surface gained a thin `src/<Name>.ts` facade marked
`@import-as-namespace`. `index.ts` is now nothing but `export * as`, so the
package has no flat exports left — matching `@dxos/echo`, the reference for this
pattern.

| namespace                                                                                                             | internal module                                            |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Agents` `Devtools` `Diagnostics` `Invitations` `Metadata` `Space` `SpaceExport` `Spaces` `Storage` `System` `Worker` | the packlet of the same name                               |
| `IdentityManager`                                                                                                     | `internal/identity/` (`Identity` is the aggregate, tier 1) |
| `ServiceStack`                                                                                                        | `internal/services/`                                       |
| `Auth` `CredentialsDocument` `Events` `Identity` `PlatformInfo` `Readiness` `Replication` `SqliteStorage` `Tags`      | already top-level from stages 1–3                          |

`internal/logging`, `internal/network`, `internal/pipeline` have no public surface
and are reached only through the stack, so they get no facade.

17 flat symbols were imported from this package across 5 consumer packages; all
are updated to the namespace form in the same change (no compatibility
re-exports). The `./testing` subpath is unchanged.

Still open: members are not yet renamed to drop the namespace prefix
(`Spaces.DataSpaceManager` should read `Spaces.Manager`). That is a rename of the
symbols themselves rather than of the module structure, so it is worth doing as
its own pass.

### Stage 5 — specs move to their modules

Split `services/layer-specs.ts` (803 lines, 61 specs) so that each spec sits next
to the layer it wires. `ServiceStack.ts` keeps only the assembly:

```ts
export const specs = (options: Options): LayerSpec.LayerSpec[] => [
  SqliteStorage.spec,
  Metadata.spec,
  IdentityManager.spec(options),
  Spaces.spec(options),
  ...
];
```

Effect: `layer-specs.ts` stops being a second copy of the dependency graph, and a
new service is one file rather than two.

## Verification per stage

- `moon run client-services:build`, `:test`, `:lint`
- `node scripts/dependency-graph.mjs` (and `--check` from Stage 3)
- `moon run client:test`, `client-e2e:test`, `app-framework:build`,
  `composer-app:build` — the consumers the public surface touches
- `pnpm knip`, `pnpm format`
