# Edge client migration — `EdgeHttpClient` → derived `EdgeApiService`

Status of the experimental migration from the hand-written `EdgeHttpClient` to an Effect-native
client derived from `@dxos/edge-protocol`'s `EdgeApi` `HttpApi` contract. Builds and tests green
through `moon` (see **Verification**). Not release-gated yet (§1.3).

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

## Verification

```
moon run edge-client:build
moon run client-services:build
moon run edge-client:test -- src/edge-api-client.test.ts
moon run client-services:test -- src/packlets/agents/edge-agent-manager.test.ts
```

### A cycle appeared, and why it wasn't real

An earlier pass added `@dxos/compute`/`@dxos/echo`/`@dxos/echo-protocol`/`@dxos/timeframe` as direct
`edge-client` dependencies (plus matching `tsconfig.json` project references), reasoning that the
full `EdgeApi` contract's types transitively need them. That made `edge-client → compute/echo → … →
client-services → edge-client` a real cycle in moon's project graph (and in `tsc -b`'s reference
graph), since `client-services` depends on `edge-client` directly.

It turned out unnecessary: `@dxos/edge-protocol` declares those packages as **`peerDependencies`**,
and pnpm resolves a package's own peer deps into its *own* scoped `node_modules` (visible under
`node_modules/.pnpm/@dxos+edge-protocol@.../node_modules/@dxos/`) independent of what any particular
consumer declares. TypeScript resolves nested type references (e.g. a `SpaceId` type reachable
through `EdgeApi`) starting from the file that imports them — i.e. from inside `edge-protocol`'s own
resolution scope — not from `edge-client`'s. So `edge-client` never needed those four packages as
direct dependencies or project references; removing them fixed the cycle with no code changes
elsewhere. `@dxos/edge-protocol` itself needs no project reference either — it's an external
(`pkg.pr.new`) package, resolved via `node_modules` like any npm dependency, not a workspace project.

The one place this DOES apply directly: `client-services` imports `EdgeAgentStatus` from
`@dxos/edge-protocol` in its own source (`edge-agent-manager.ts`), so it correctly declares
`@dxos/edge-protocol` (`catalog:`) as its own dependency — but needs no tsconfig reference, for the
same external-package reason.

### A second, subtler issue: bare `"*"` peer ranges fork on the *consumer's* peer context

Removing the cycle didn't fully close the loop: `moon exec :build` across the whole tree turned up
`app-framework:build` failing with "two different types with this name exist, but they are
unrelated" for `DXN` — a classic dual-package-identity error, not present on `origin/main`.
`tsc --explainFiles` traced it to `@dxos/compute`'s `LayerSpec.d.ts`, imported via `@dxos/keys` —
but a *different*, peer-suffixed copy of both, distinct from the plain workspace ones every direct
`workspace:*` consumer resolves.

Cause: `@dxos/edge-protocol` declares `@dxos/compute`/`@dxos/echo`/`@dxos/echo-protocol`/`@dxos/keys`/
`@dxos/protocols`/`@dxos/timeframe` as peerDependencies with a bare `"*"` range. A bare-range peer is
satisfied from whichever peer context the *consuming* install position already sits in — it isn't
pinned to one canonical resolution. `@dxos/edge-client` (which depends on `@dxos/edge-protocol`) is
now a **direct** dependency of `app-framework`, and `app-framework` also depends on
`@effect-atom/atom`, which already forces a large, distinct peer-dependency bucket (visible in the
pre-existing `'@effect-atom/atom>@effect/experimental'` / `'>@effect/rpc'` `allowedVersions` entries
below). Resolved *through that bucket*, edge-protocol's `"*"` peer for `@dxos/compute` picked the
bucket's forked compute/keys instead of the plain ones `@dxos/compute`'s own project reference uses
— so the same-named `DXN` type existed twice, and TS refused to unify them.

Fix: pin each of those six peers to `workspace:*` unconditionally via `overrides`
(`'@dxos/edge-protocol>@dxos/compute': 'workspace:*'`, etc.) — removing the ambiguity means there's
nothing left for a consumer's peer context to redirect. After `pnpm install --force
--no-frozen-lockfile` (a plain `--no-frozen-lockfile` install doesn't relink already-installed
`.pnpm` store slots), the fork disappeared and `app-framework:build` (and the rest of `moon exec
:build`) went green. The four *regular* (non-peer) leaf deps edge-protocol pins to a `dxos/dxos`
preview build (`@dxos/errors`/`@dxos/invariant`/`@dxos/log`/`@dxos/util`) don't need the same
treatment — they're leaves with no further `.d.ts` cross-references, so no identity risk.
