# `@dxos/client-services` — dependency graph

Measured from the source tree (`src/internal/*`, `src/packlets/*` at the time of the
baseline), production files only
(`*.test.ts` excluded).

**Sections 1 and 2 record the graph as it was before the restructure**; section 3
is the target and section 5 the result. Re-running the script today therefore
reports section 5's numbers, not section 1's:

```
node packages/sdk/client-services/scripts/dependency-graph.mjs   # prints the graph
node packages/sdk/client-services/scripts/dependency-graph.mjs --check   # non-zero while a cycle remains
moon run client-services:graph                                   # the same check, in CI
```

Counting all packlet files, the baseline was 19 packlets and 57 edges; the tables
below exclude `*.test.ts` and the per-packlet `testing/` helpers, which is why
their counts are lower.

## 1. The shape before the restructure

19 packlets, 4 of them leaves. The production import graph has **one strongly
connected component of 11 packlets**:

```
agents  devices  devtools  diagnostics  identity  invitations
services  space  space-export  spaces  system
```

`testing` and `worker` sit above it; `logging`, `network`, `pipeline`,
`migrations`, `storage` are the only genuine leaves.

### Edges (production)

| from           | to                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents`       | `identity`, `services`, `spaces`                                                                                                                    |
| `devices`      | `identity`                                                                                                                                          |
| `devtools`     | `metadata`, `services`, `space`, `spaces`                                                                                                           |
| `diagnostics`  | `identity`, `services`, `spaces`                                                                                                                    |
| `identity`     | `metadata`, `services`, `space`, `spaces`                                                                                                           |
| `invitations`  | `identity`, `metadata`, `services`, `spaces`                                                                                                        |
| `metadata`     | `migrations`                                                                                                                                        |
| `services`     | `agents`, `devices`, `devtools`, `identity`, `invitations`, `logging`, `metadata`, `migrations`, `network`, `pipeline`, `space`, `spaces`, `system` |
| `space`        | `metadata`, `pipeline`, `services`                                                                                                                  |
| `space-export` | `spaces`                                                                                                                                            |
| `spaces`       | `identity`, `invitations`, `metadata`, `pipeline`, `space`, `space-export`                                                                          |
| `system`       | `diagnostics`, `identity`, `services`, `spaces`                                                                                                     |
| `worker`       | `services`                                                                                                                                          |
| `testing`      | `agents`, `identity`, `invitations`, `metadata`, `pipeline`, `services`, `space`, `spaces`                                                          |

19 of these edges are **deep imports** that bypass the target's `index.ts`
(`identity → services` alone accounts for 6).

## 2. Why the cycle exists

Three causes, in order of how much of the SCC each one is responsible for.

### 2.1 Shared kernel primitives live inside `services`

`services/` is simultaneously the **top** of the stack (it owns
`layer-specs.ts`, `client-services-stack.ts` — the aggregation of every other
packlet) and the **bottom** (it owns the primitives every packlet needs):

| file                          | imported by                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| `services/events.ts`          | `identity`, `spaces`, `space`, `agents`, `invitations`, `system`, `testing` |
| `services/stack-readiness.ts` | `identity`, `spaces`, `agents`, `devtools`, `testing`                       |
| `services/sqlite-storage.ts`  | `identity`, `testing`                                                       |
| `services/platform.ts`        | `diagnostics`, `system`                                                     |

Every one of those is a back-edge from a domain packlet into the aggregator.
None of the four files depends on anything in the package.

**Extracting those four files into a leaf collapses the 11-packlet SCC to 4**
(`identity`, `invitations`, `spaces`, `space-export`) — measured, not estimated.

### 2.2 `Context` tags are colocated with their implementations

Every service tag is declared next to the class it wraps:

```
identity/identity-manager.ts       -> IdentityManagerService, IdentityProviderService
spaces/data-space-manager.ts       -> DataSpaceManagerService, SigningContextProviderService
space/space-manager.ts             -> SpaceManagerService
invitations/invitations-manager.ts -> InvitationsManagerService
metadata/metadata-store.ts         -> IMetadataStoreService
… 18 tags in 13 files
```

A module that only wants to _declare a dependency_ (`yield* DataSpaceManagerService`)
must therefore import the module carrying the whole _implementation_, and inherits
its transitive deps. This is what makes the residual domain cycles load-bearing:

- `identity/contacts-service.ts`, `identity/identity-service.ts` → `spaces`, for
  `DataSpaceManagerService` alone.
- `spaces/spaces-service.ts` → `identity`, for `IdentityManagerService` alone.
- `spaces/data-space-manager.ts` → `invitations`, for `InvitationsManagerService` alone.

**Extracting tags + their interface types into a leaf, on top of §2.1, reduces the
graph to a single 2-cycle**: `identity ↔ spaces`.

### 2.3 Four misplaced leaf utilities

What is left after §2.1 and §2.2 is exactly four symbols in three files, none of
which has any intra-package dependency of its own:

| symbol                                            | lives in                                       | wanted by                                        |
| ------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `createAuthProvider`, `TrustedKeySetAuthVerifier` | `identity/authenticator.ts` (109 l)            | `spaces`                                         |
| `EdgeFeedReplicator`                              | `spaces/edge-feed-replicator.ts` (323 l)       | `identity`                                       |
| `openCredentialsDocument`                         | `spaces/credentials-document-store.ts` (134 l) | `identity`                                       |
| `type DataSpace`                                  | `spaces/data-space.ts`                         | `space-export` (structurally, for one writer fn) |

## 3. Target shape

Acyclic, four tiers. Arrows point downward only.

```
tier 3  aggregation   ServiceStack          (layer-specs, client-services-stack)
                      Worker, Testing
                         │
tier 2  domain        Identity  Spaces  Space  Invitations  Devtools  Agents
                      Devices   System  Diagnostics  Logging  Network
                         │
tier 1  support       Metadata  Pipeline  Storage  Replication  Auth
                         │
tier 0  kernel        Tags  Events  StackReadiness  SqliteStorage  Platform  Migrations
```

- **tier 0** has no intra-package imports at all.
- **tier 2** modules import tier 0/1 and _never each other_.
- Only **tier 3** may import tier 2, and it is the only place a `LayerSpec` list
  is assembled.

## 4. Public surface

26 symbols are imported from `@dxos/client-services` across 5 packages
(`client`, `client-e2e`, `composer-app`, `observability`, `stories-assistant`) —
so the barrel can be reshaped into namespaces cheaply.

## 5. Measured summary

|                                | packlets in the largest SCC | edges  |
| ------------------------------ | --------------------------- | ------ |
| before                         | 11                          | 57     |
| after §2.1 (kernel extraction) | 4                           | 47     |
| after §2.3 (tier-1 leaves)     | 3                           | 46     |
| after §2.2 (tag/impl split)    | **none**                    | **33** |

Every row is a measurement of the tree at that point, not an estimate. The final
row is the tree as it stands; `--check` exits 0.

Type-only imports are excluded from the edge counts: they are erased on emit and
cannot form a runtime cycle. Pass `--types` to include them.

That exclusion is safe only because the contract rule is checked separately. A tag
typed against an implementation class keeps the dependency while erasing the
import that shows it, so a runtime-edge count alone would certify exactly what
that hides. `--check` therefore also fails when a module under `src/contracts/`
imports anything from `src/internal/`, on type edges as well as runtime ones —
with `DataSpace` as the one declared exception, for the reason given in
[`REFACTOR.md`](./REFACTOR.md) §Stage 3.
