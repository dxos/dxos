# @dxos/plugin-typesafe

Connects [TypeSafe](https://docs.typesafe.ai/introduction) System One (`jev`) to a space and provides
its decision model to every operation running there.

Two contributions, no UI:

- **Connector** (`typesafe.ai`) — optional: the user pastes their own API key, stored as an
  `AccessToken` plus a `Connection` in ECHO, exactly as the DeepSeek and Anthropic connectors do.
- **LayerSpec** — a space-affinity `DecisionModel`, so any operation can ask typed questions
  (`Noul` / `Choice` / `Score`) about a state without knowing where the key came from.

**Calls go through EDGE** (`/ai/generate/typesafe`), because the vendor's API sends no CORS headers
and a browser cannot call `api.typesafe.ai` directly. With no key connected, EDGE uses the platform
key and meters the usage against the user's account; a connected key is sent as `X-BYOK` and is not
billed. The key is resolved per call, so connecting or disconnecting takes effect on the next
question.

The `endpoint` setting bypasses EDGE for a self-hosted or regional endpoint the browser can reach;
that path needs a connected key.

See [docs/DESIGN.md](./docs/DESIGN.md); the model itself lives in `@dxos/ai-typesafe`.
