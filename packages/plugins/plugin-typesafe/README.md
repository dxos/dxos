# @dxos/plugin-typesafe

Connects [TypeSafe](https://docs.typesafe.ai/introduction) System One (`jev`) to a space, so
`AiService.decisionModel('ai.typesafe.model.jev.latest')` resolves in every operation running there.

Two contributions, no UI:

- **Connector** (`typesafe.ai`) — optional: the user pastes their own API key, stored as an
  `AccessToken` plus a `Connection` in ECHO, exactly as the DeepSeek and Anthropic connectors do.
- **AiModelResolver** — `TypeSafeResolver` from `@dxos/ai`, routed through EDGE, so any operation can
  ask Effect `Decision`s (`probability` / `classify` / `rate`) about a state without knowing where the
  key came from.

The key is resolved per call, so connecting or disconnecting takes effect on the next question. With
no key connected the call still answers, through EDGE on the platform key; a missing key fails the
decision only when the `endpoint` override is set.

**Calls go through EDGE** (`/ai/generate/typesafe`), because the vendor's API sends no CORS headers
and a browser cannot call `api.typesafe.ai` directly. With no key connected EDGE uses the platform key
and meters the usage against the user's account; a connected key rides as `X-BYOK` and is not billed.
The `endpoint` setting bypasses EDGE for a self-hosted endpoint the browser can reach, and needs a
connected key.

The same model also runs on Cloudflare Workers AI
([`typesafe/jev`](https://developers.cloudflare.com/ai/models/typesafe/jev/)): ask for
`Model.cloudflareJev` (`com.cloudflare.model.typesafe-jev.default`) instead of `Model.typesafeJev`
(`ai.typesafe.model.jev.latest`). It goes through EDGE's `/ai/generate/workers-ai/typesafe` route on
EDGE's Cloudflare account, so no key is sent and every call is metered.

See [docs/DESIGN.md](./docs/DESIGN.md); the provider itself lives in `@dxos/ai/resolvers`.
