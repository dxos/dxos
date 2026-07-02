# plugin-freeq design

**Date:** 2026-07-01
**Status:** Approved (brainstorming)
**Author:** Rich Burdon (with Claude)

## Summary

`@dxos/plugin-freeq` is a new Composer plugin that integrates [freeq](https://github.com/chad/freeq) — an
IRCv3 chat service that authenticates users via AT Protocol / Bluesky identities. The plugin contributes a
**live, read+write message backend** to `plugin-thread` via the existing `ThreadCapabilities.ChannelBackend`
capability. It is the first _bidirectional, streaming_ external backend (bluesky is read-only polling; the
default feed backend is local ECHO).

## Goals

- Contribute one `ThreadCapabilities.ChannelBackend` provider (`org.dxos.channel.backend.freeq`) — no changes
  to `plugin-thread`.
- Connect to a freeq server over **WebSocket** (the only browser-reachable transport), authenticate over the
  `ATPROTO-CHALLENGE` SASL mechanism, join an IRC channel, stream inbound messages live, and send outbound
  messages from the Composer composer.
- Keep messages **transient** (in-memory for the session + REST history backfill on join), matching the
  existing external-backend pattern. No ECHO writes for message content.
- Share **one WebSocket per `(serverUrl, identity)`** across multiple DXOS Channels via a connection manager.
- Register the plugin in the Composer app so it is usable end-to-end.
- Structure auth behind a `CredentialProvider` seam so a future Edge-OAuth path drops in without touching the
  connection layer.

## Non-goals (v1)

- Edge-brokered DPoP OAuth (Phase 2 — requires new DXOS Edge work; see Auth).
- End-to-end encryption (`ENC1:` AES-256-GCM).
- Peer-to-peer DMs over iroh.
- Server-to-server federation.
- Raw DID-key cryptographic-signature SASL method.
- Persisting freeq messages into ECHO for offline history/search.
- WebSocket reconnect with exponential backoff (deferred — see Addendum; only a
  minimal `onClose` that rejects a pending connect is wired in v1).

## Addendum (2026-07-01): live protocol findings & v1 scope decisions

Validated against `irc.freeq.at` with a real Bluesky test account and by reading
the freeq web-app bundle. These supersede the provisional shapes above where they
differ:

- **WebSocket endpoint path is `/irc`** (e.g. `wss://irc.freeq.at/irc`). The user
  supplies the full URL in `FreeqChannel.serverUrl`.
- **Framing: one IRC line per WebSocket frame, with no `\r\n` terminator.** The
  transport delivers each frame as a line (splitting on `\r?\n` for robustness);
  it must not require a terminator. This was the single most important correction —
  a `\r\n`-only split receives nothing from freeq.
- **SASL `ATPROTO-CHALLENGE`.** Challenge JSON is `{ session_id, nonce, timestamp }`
  (snake_case; only `nonce` is used). The `pds-session` response is base64**url** of
  `{ did, method: 'pds-session', signature: <accessJwt>, pds_url: <resolved PDS>,
challenge_nonce: <nonce> }`, transmitted in ≤400-char `AUTHENTICATE` fragments
  followed by a trailing `AUTHENTICATE +` when fragmented. `createSession` runs
  against the account's resolved PDS (not the entryway).
- **Authenticated send status.** Guest connect + read (register, JOIN, member list,
  topic) works end-to-end. The app-password `pds-session` SASL is rejected
  (`904 bad response`) by the deployed `irc.freeq.at` even when matching the
  freeq-sdk format byte-for-byte — the freeq web app authenticates via OAuth/DPoP,
  so the deployed server likely does not accept app-password `pds-session` tokens.
  **v1 ships read-capable**: the SASL/credential code is correct per the reference
  client, but authenticated send is validated later against a server that accepts
  `pds-session` (a local instance) or via the Phase-2 OAuth path.
- **`readOnly` follows the foreign-key meta default** (`Obj.getMeta(channel).keys.length > 0`).
  A per-connection guest/authenticated distinction is not reflected because `readOnly`
  is synchronous while the channel's `handle` lives in the async-loaded config; a guest
  send simply fails at the server.
- **History.** The REST `/api/v1/channels/{name}/messages` endpoint is not exposed on
  the `irc.freeq.at` deployment (returns the SPA shell); history is instead available
  via the IRC `draft/chathistory` capability. v1 keeps the REST-backfill client (it
  degrades gracefully to an empty list when unavailable); IRC-based history is a
  future enhancement.

## Background: how the backend seam works

`plugin-thread` (`packages/plugins/plugin-thread/src/types/ThreadCapabilities.ts`) defines:

```ts
interface ChannelBackendProvider {
  kind: string; // matches Channel.backend.kind
  label: string;
  icon?: string;
  createFields: Schema.Schema.AnyNoContext; // extra create-form inputs
  makeConfig: (options: Record<string, unknown>) => Obj.Any; // builds the persisted config object
  subscribe: (channel: Channel.Channel, onMessages: (messages: readonly Message.Message[]) => void) => () => void;
  send: (channel: Channel.Channel, message: Message.Message) => Effect.Effect<void, Error, Capability.Service>;
  readOnly?: (channel: Channel.Channel) => boolean;
}

export const ChannelBackend = Capability.make<ChannelBackendProvider>(`${meta.profile.key}.capability.channel-backend`);
```

- A `Channel` object (`packages/sdk/types/src/types/Channel.ts`) stores `backend.kind` (the provider id) and
  `backend.config` (a `Ref` to a provider-owned ECHO object).
- `useMessages` (`plugin-thread/src/hooks/useMessages.ts`) resolves the provider by `channel.backend.kind`,
  calls `subscribe`, and feeds the result into the `Chat` UI via `useSyncExternalStore`.
- `ChannelArticle` computes `readOnly` and, on send, invokes the `AppendChannelMessage` operation, which calls
  `provider.send`.
- The `ChannelCreatePanel` builds a form from every provider's `createFields`; a backend selector appears when
  more than one provider exists or any provider has extra fields.

Reference implementations to mirror:

- Default backend: `plugin-thread/src/capabilities/channel-backend-feed.ts` (live via ECHO reactive query).
- External backend: `plugin-bluesky/src/capabilities/channel-backend.ts` (read-only, 30s polling, transient
  `Message.Message`, cached by stable id). plugin-bluesky uses **no `@atproto` SDK** — plain Effect
  `HttpClient` XRPC calls; we follow the same approach.

## Background: freeq protocol

- **Transport (browser):** WebSocket. (freeq also offers TCP/TLS/iroh, none browser-reachable.)
- **Wire format:** IRCv3 — `PRIVMSG`/`NOTICE` with message tags (e.g. `@msgid=...`, `@content-type=...`).
- **Auth:** IRCv3 SASL with a custom mechanism `ATPROTO-CHALLENGE`:
  1. Client: `CAP LS` → `CAP REQ :sasl` → `AUTHENTICATE ATPROTO-CHALLENGE`.
  2. Server: `AUTHENTICATE <base64 JSON challenge {sessionId, nonce, ts}>`.
  3. Client: `AUTHENTICATE <base64 JSON response>` — one of: PDS session JWT (app-password),
     DPoP-bound OAuth token, or DID-key signature.
  4. Server verifies against the AT Protocol registry; DID binds to the connection/nick.
- **History (read-only REST):** `GET /api/v1/channels/{name}/messages` (paginated), plus `/channels`,
  `/channels/{name}/members`, `/stats`. All writes go through the IRC protocol.

## Auth

freeq's SASL accepts three response types; only one is fully browser-feasible today:

| Method                         | Browser-feasible | Notes                                                                                                                                                                                                     |
| ------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App-password → PDS session JWT | ✅ Yes (Phase 1) | `com.atproto.server.createSession(handle, app-password)` → `accessJwt`, presented as the PDS-session SASL response. Pure client-side.                                                                     |
| DPoP-bound OAuth token         | ⚠️ Phase 2       | DXOS Edge holds the DPoP signing key and never releases it; binding a token to freeq's nonce requires signing the challenge on Edge. Needs a new Edge endpoint. Out of scope for this plugin-only change. |
| DID-key signature              | ✗                | Identity signing key not held client-side.                                                                                                                                                                |

### CredentialProvider seam

```ts
interface SaslChallenge {
  sessionId: string;
  nonce: string;
  ts: number;
}

interface CredentialProvider {
  /** Produce the base64 SASL response payload for a freeq ATPROTO-CHALLENGE. */
  respond: (challenge: SaslChallenge) => Effect.Effect<string, FreeqAuthError, HttpClient>;
}
```

- **Phase 1 impl (`AppPasswordCredentialProvider`):** given a handle + app-password, resolve the PDS, call
  `createSession`, cache `accessJwt`/`refreshJwt`, and return the PDS-session response payload. Refresh on
  expiry via `com.atproto.server.refreshSession`.
- **Phase 2 impl (future):** round-trips the SASL challenge to a DXOS Edge signing endpoint. Slots in behind
  the same interface with no change to `IrcConnection`.

### Credential storage

- The app-password is captured in a connect form and **not persisted in plaintext**.
- The derived session (`accessJwt`/`refreshJwt`, `handle`) is persisted as an `AccessToken` ECHO object with
  `source: 'freeq'`, mirroring plugin-bluesky's credential storage. On reconnect the stored session is reused;
  a full re-login (app-password) is only needed when refresh fails.

## Architecture

### Package layout

```
packages/plugins/plugin-freeq/
├── package.json            # "private": true, name @dxos/plugin-freeq
├── moon.yml
├── dx.config.ts            # id org.dxos.plugin.freeq, name "Freeq", icon ph--dog--regular, tags [labs, integration]
├── PLUGIN.mdl
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts
    ├── plugin.ts                    # lazy plugin export
    ├── FreeqPlugin.ts               # main plugin definition + capability wiring
    ├── meta.ts
    ├── types.ts                     # FreeqChannel ECHO schema
    ├── constants.ts                 # FREEQ_BACKEND_KIND, FREEQ_SOURCE, defaults
    ├── errors.ts                    # FreeqAuthError, FreeqConnectionError (BaseError.extend)
    ├── translations.ts
    ├── capabilities/
    │   ├── index.ts
    │   ├── channel-backend.ts       # contributes ThreadCapabilities.ChannelBackend (live)
    │   └── connection-manager.ts    # contributes FreeqCapabilities.ConnectionManager
    ├── services/
    │   ├── index.ts
    │   ├── IrcProtocol.ts           # IRCv3 line parse/serialize (@import-as-namespace)
    │   ├── IrcConnection.ts         # WebSocket + SASL + JOIN/PRIVMSG state machine
    │   ├── ConnectionManager.ts     # shared-socket registry, ref-counted
    │   ├── CredentialProvider.ts    # SASL responder interface + app-password impl
    │   └── FreeqRestApi.ts          # REST history backfill (Effect HttpClient)
    └── stories/
        └── FreeqChannel.stories.tsx
```

### Components

- **`IrcProtocol`** — pure functions to parse an IRCv3 line into `{ tags, prefix, command, params }` and
  serialize the reverse. Handles tag escaping and trailing params. No external dependency. Fully unit-testable.

- **`CredentialProvider`** — the SASL-responder seam (see Auth). Phase-1 app-password implementation uses
  Effect `HttpClient` for `createSession`/`refreshSession`.

- **`IrcConnection`** — owns exactly one WebSocket. State machine: `connecting → cap-negotiation →
authenticating (SASL) → registered → joined`. Responsibilities: CAP LS/REQ/END, the `ATPROTO-CHALLENGE`
  exchange (delegating the response to a `CredentialProvider`), `NICK`/`USER`, `JOIN`/`PART`, inbound
  `PRIVMSG`/`NOTICE` dispatch keyed by channel, outbound `PRIVMSG`, `PING`/`PONG` keepalive, and reconnect with
  exponential backoff. Emits per-channel message events and membership. Guest fallback: if no credentials are
  configured, connect unauthenticated (server-permitting) and mark channels read-only.

- **`ConnectionManager`** — capability keyed by `(serverUrl, identityDid)`. `acquire()` returns an existing
  `IrcConnection` or creates one; ref-counted so multiple DXOS Channels on the same server multiplex one
  socket. `release()` decrements; the connection `PART`s the channel and closes the socket when the count hits
  zero. Exposed as `FreeqCapabilities.ConnectionManager`.

- **`FreeqRestApi`** — `getMessages(serverUrl, channel)` for history backfill on join, mapped to
  `Message.Message`. Effect `HttpClient`, timeout + bounded retry (mirrors `BlueskyApi` request pipeline).

- **`channel-backend.ts`** — the `ChannelBackendProvider`:
  - `kind` = `org.dxos.channel.backend.freeq`, `label` = "Freeq", `icon` = `ph--dog--regular`.
  - `createFields` = `{ serverUrl: string, channel: string, handle?: string }`.
  - `makeConfig` = builds a `FreeqChannel` ECHO object.
  - `subscribe` — loads `FreeqChannel`, acquires the connection, backfills history via REST, then emits a
    merged `Message.Message[]` on each inbound PRIVMSG (dedup by IRCv3 `msgid`, synthesized when absent, cached
    by id for identity stability). Returns an unsubscribe that releases the connection.
  - `send` — Effect that acquires the connection and writes a `PRIVMSG` to the channel.
  - `readOnly` — false when authenticated; true for guest connections.

### Data model

`FreeqChannel` (ECHO schema in `types.ts`, registered via `addSchemaModule`):

```ts
Schema.Struct({
  serverUrl: Schema.String, // wss://host[:port]
  channel: Schema.String, // "#general"
  handle: Schema.optional(Schema.String), // atproto handle/DID for auth binding
});
```

### Message mapping

IRC `PRIVMSG` → `Message.make({ sender: { name: <nick> }, blocks: [{ _tag: 'text', text }], created })`.

- Sender uses the IRC nick as `name` (freeq binds nick↔DID; DID mapping can enrich `sender` later).
- Transient; cached by `msgid` so identity is stable across re-renders and merges with REST backfill.

### Capability wiring (`FreeqPlugin.ts`)

Mirrors `BlueskyPlugin`:

```ts
export const FreeqPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [FreeqChannel] }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({ id: 'connection-manager', activatesOn: ActivationEvents.Startup, activate: ConnectionManager }),
  Plugin.addModule({ id: 'channel-backend', activatesOn: ActivationEvents.Startup, activate: ChannelBackend }),
  AppPlugin.addPluginAssetModule({ asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', ... } }),
  Plugin.make,
);
```

### App registration

- Add `"@dxos/plugin-freeq": "workspace:*"` to `packages/apps/composer-app/package.json`.
- In `packages/apps/composer-app/src/plugin-defs.tsx`: `import { FreeqPlugin } from '@dxos/plugin-freeq/plugin';`
  and add `FreeqPlugin(),` to the standalone-integrations block (alongside `BlueskyPlugin()`).
- Add the tsconfig reference matching the existing bluesky entry.

## Dependencies

Workspace (`workspace:*`): `@dxos/plugin-thread`, `@dxos/types`, `@dxos/echo`, `@dxos/echo-client`,
`@dxos/client`, `@dxos/plugin-client`, `@dxos/app-framework`, `@dxos/app-toolkit`. Dev: `@dxos/plugin-space`,
`@dxos/plugin-testing`, `@dxos/plugin-theme`, `@dxos/react-client`, `@dxos/react-ui`, `@dxos/storybook-utils`.
External (catalog): `effect`, `@effect/platform`. **No `@atproto/*` packages** — XRPC via `HttpClient`.
WebSocket uses the browser global; tests use a mock WebSocket (no `ws` dependency).

## Testing

vitest, `describe`/`test`, unified `TestLayer`; tests live beside modules as `*.test.ts`.

- `IrcProtocol.test.ts` — parse/serialize round-trips incl. tags, trailing params, escaping.
- `CredentialProvider.test.ts` — app-password flow with mocked `createSession`/`refreshSession`.
- `IrcConnection.test.ts` — full SASL handshake state machine against a scripted mock WebSocket that plays
  freeq's CAP/AUTHENTICATE exchange; JOIN, inbound PRIVMSG dispatch, outbound PRIVMSG, PING/PONG, reconnect.
- `ConnectionManager.test.ts` — ref-count acquire/release, shared socket per `(serverUrl, identity)`, close on
  zero.
- `channel-backend.test.ts` — subscribe emits backfill + live messages (dedup), send writes PRIVMSG, readOnly
  policy, with a mock connection.
- Manual E2E against the user-provided freeq server (WebSocket URL + test handle/app-password).
- `FreeqChannel.stories.tsx` for UI verification in Storybook (reuse the running instance on :9009).

## Implementation phases

1. Scaffold package (private, moon.yml, dx.config, tsconfig, meta, index, empty plugin) — builds.
2. `IrcProtocol` parser/serializer + tests.
3. `CredentialProvider` interface + app-password impl + tests.
4. `IrcConnection` (WebSocket + SASL + JOIN/PRIVMSG) + mock-server tests.
5. `ConnectionManager` capability + ref-count tests.
6. `FreeqChannel` schema + `FreeqRestApi` backfill + `ChannelBackend` provider + tests.
7. Wire `FreeqPlugin` (schema, connection-manager, channel-backend, translations, asset).
8. Register in composer-app (package.json, plugin-defs.tsx, tsconfig); Storybook story.
9. Manual E2E against the provided server; fixes.

## Open questions / risks

- Exact freeq `ATPROTO-CHALLENGE` JSON payload shapes (challenge + PDS-session response) must be confirmed
  against the running server / freeq source during Phase 4.
- REST message shape (`/api/v1/channels/{name}/messages`) confirmed against the server during Phase 6.
- Guest-connection behavior varies by server config; treated as best-effort read-only.
