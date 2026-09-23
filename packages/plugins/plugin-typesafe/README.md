# @dxos/plugin-typesafe

Connects [TypeSafe](https://docs.typesafe.ai/introduction) System One (`jev`) to a space, so
`AiService.decisionModel('ai.typesafe.model.jev.latest')` resolves in every operation running there.

Two contributions, no UI:

- **Connector** (`typesafe.ai`) — optional: the user pastes their own API key, stored as an
  `AccessToken` plus a `Connection` in ECHO, exactly as the DeepSeek and Anthropic connectors do.
- **AiModelResolver** — `TypeSafeResolver` from `@dxos/ai`, routed through EDGE, so any operation can
  ask Effect `Decision`s (`probability` / `classify` / `rate`) about a state without knowing where the
  key came from.

The key is resolved per call, so connecting takes effect on the next question rather than after a
restart, and disconnecting surfaces as a failed decision rather than a stale client.

**Calls go through EDGE** (`/ai/generate/typesafe`), because the vendor's API sends no CORS headers
and a browser cannot call `api.typesafe.ai` directly. With no key connected EDGE uses the platform key
and meters the usage against the user's account; a connected key rides as `X-BYOK` and is not billed.
The `endpoint` setting bypasses EDGE for a self-hosted endpoint the browser can reach, and needs a
connected key.

See [docs/DESIGN.md](./docs/DESIGN.md); the provider itself lives in `@dxos/ai/resolvers`.
