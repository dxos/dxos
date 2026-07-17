# Edge client migration — `EdgeHttpClient` → derived `EdgeApiService`

Status of the experimental migration from the hand-written `EdgeHttpClient` to an Effect-native
client derived from `@dxos/edge-protocol`'s `EdgeApi` `HttpApi` contract. Validated locally
(`tsc` + `vitest`), bypassing `moon`/CI (see **Verification**). Not release-gated yet.

## Done

- **§2 — derived client (`@dxos/edge-client`).** `edge-api-client.ts`, `edge-client-service.ts`,
  `edge-api-errors.ts`.
  - `EdgeApiService` (`Context.Tag`) with `EdgeApiService.layer(options)` (Effect consumers) and
    `EdgeApiService.make(options)` (imperative consumers — `HttpApiClient.make` over `fetch` has no
    async setup, so it runs synchronously).
  - Auth middleware reproduces `BaseHttpClient`: cached VP `Authorization`, `EDGE_CLIENT_TAG_HEADER`,
    `traceparent`; reactive 401 `WWW-Authenticate` challenge → present credential → retry once.
  - Typed errors via `mapEdgeErrors`: `EdgeRequestError` (`isRetryable`/`retryAfterMs`/`data`) and
    `EdgeAuthChallengeError` (`challenge`). Covers non-2xx, edge's **HTTP-200 `success:false`**
    graceful envelope (replayed via `HttpClientResponse.fromWeb` so the single-use body survives
    both classification and the success decoder), and `auth_challenge` bodies.
  - `withEdgeRetry` honors `retryAfterMs`, gated on `isRetryable`.
  - Out of scope (stay on the hand-written path): `anthropicAiRequest` streaming (`EdgeAiHttpClient`)
    and the WebSocket `EdgeClient`.
- **§4 proof-of-pattern — agents group.** `EdgeAgentManager` (`createAgent`, `_fetchAgentStatus`)
  now calls `client.agents.*` through `mapEdgeErrors` + `Effect.catchTag`. Wired via
  `service-host` → `service-context` (a derived `EdgeApiClientService` is provided **alongside**
  `EdgeHttpClient` while other consumers migrate; `setIdentity` runs on both).

## Key finding — §4 is gated on a §3 type-unification slice per consumer

The contract's DTOs use enums (`EdgeAgentStatus`, `OAuthProvider`, `EdgeService`) that are **distinct
nominal types** from `@dxos/protocols`' hand-written copies. A cast-free consumer migration must
first switch that consumer's shared types to `@dxos/edge-protocol` (done here for `EdgeAgentStatus`
in `edge-agent-manager.ts` + `edge-agent-service.ts`).

`@dxos/protocols` **cannot re-export** these from `@dxos/edge-protocol`: edge-protocol already
peer-depends on protocols, so `protocols → edge-protocol` is a cycle. §3 must therefore point
consumers at `@dxos/edge-protocol` directly (adding it as a dep) and delete the protocols copies once
unused — not re-export.

## Recipe (per consumer group)

1. Add `@dxos/edge-protocol` (`catalog:`) to the consumer package; `pnpm install`.
2. §3 slice: switch that group's shared enums/DTOs to import from `@dxos/edge-protocol`.
3. Replace `new EdgeHttpClient` / injected client with `EdgeApiService.layer` (Effect) or
   `EdgeApiService.make` (imperative); provide it where `EdgeHttpClient` is constructed today.
4. Replace `edge.<method>(ctx, body)` with `client.<group>.<endpoint>({ payload | path | urlParams })`
   wrapped in `mapEdgeErrors`; replace `instanceof EdgeCallFailedError` with
   `Effect.catchTag('EdgeRequestError' | 'EdgeAuthChallengeError', …)`. Drop any
   `Effect.tryPromise({ catch: () => new Error(...) })` erasure.

## Remaining §4 consumers (grep `new EdgeHttpClient` / `instanceof EdgeCallFailedError`)

- **client-services managers** (share the injected `EdgeHttpClient`; migrate then drop the
  coexistence): `notarization-plugin` (`db.notarization*`), `edge-invitation-handler`
  (`db.spaceJoin`, `EdgeAuthChallengeError` sign-retry), `identity-recovery-manager`
  (`db.identityRecover`), `DataSpaceManager` (`db.spaceCreate`).
- **standalone**: `connector-coordinator` (`kms.oauthInitiate`; needs the `OAuthProvider` §3 slice —
  `ConnectorOAuthSpec.provider`), `plugin-registry` publish (`registry.registryUpload`; uses
  `auth:true` pre-fetch — not yet reproduced), `echo-edge-replicator` (`db.spaceImport/Export`),
  `functions-runtime` (deprecated helpers), `react-edge-client` `useEdgeClient`, `@dxos/client`
  `client-edge-api` (`db.spaceExecQuery`).
- **§3 cleanup**: once all consumers import contract DTOs from `@dxos/edge-protocol`, delete the
  superseded DTOs from `@dxos/protocols/src/edge/edge.ts` (keep `EDGE_CLIENT_TAG_HEADER`/`BYOK_HEADER`
  and WS-only enums).
- **§7 Hub** and **§1.3 semver release** (un-defers `moon`/CI): unchanged from the plan.

## Verification (moon-free, per-package)

`moon`/`tsc -b` refuse the graph: `edge-client` now depends on `@dxos/compute`/`@dxos/echo`, which
depend back on `edge-client` (cycle). Typecheck per package with the non-composite
`tsconfig.check.json` (no project references; `@dxos` deps resolve to built `dist/types`):

```
pnpm --dir packages/core/mesh/edge-client exec tsc --noEmit -p tsconfig.check.json
pnpm --dir packages/sdk/client-services exec tsc --noEmit -p tsconfig.check.json
pnpm --dir packages/core/mesh/edge-client exec vitest run src/edge-api-client.test.ts
pnpm --dir packages/sdk/client-services exec vitest run src/packlets/agents/edge-agent-manager.test.ts
```

A cross-package typecheck reads `@dxos/edge-client` from its `dist/types`; after editing edge-client
source, re-emit declarations non-composite before checking dependents (`tsconfig` with
`composite:false`, `emitDeclarationOnly:true`, `references:[]`). `vitest` resolves workspace packages
from source, so it needs no rebuild.
