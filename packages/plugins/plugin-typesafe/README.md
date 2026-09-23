# @dxos/plugin-typesafe

Connects [TypeSafe](https://docs.typesafe.ai/introduction) System One (`jev`) to a space, so
`AiService.decisionModel('ai.typesafe.model.jev.latest')` resolves in every operation running there.

Two contributions, no UI:

- **Connector** (`typesafe.ai`) — the user pastes their API key, which is stored as an `AccessToken`
  plus a `Connection` in ECHO, exactly as the DeepSeek and Anthropic connectors do.
- **AiModelResolver** — `TypeSafeResolver` from `@dxos/ai`, backed by that key, so any operation can
  ask Effect `Decision`s (`probability` / `classify` / `rate`) about a state without knowing where the
  key came from.

The key is resolved per call, so connecting takes effect on the next question rather than after a
restart, and disconnecting surfaces as a failed decision rather than a stale client.

**The endpoint is configurable** (plugin settings), because the vendor's API sends no CORS headers:
a browser cannot call `api.typesafe.ai` directly, so a deployment points this at a proxy until the
call is routed through EDGE. See [docs/DESIGN.md](./docs/DESIGN.md).

See [docs/DESIGN.md](./docs/DESIGN.md); the provider itself lives in `@dxos/ai/resolvers`.
