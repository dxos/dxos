# plugin-typesafe — design

## Why

Effect ships a decision model (`effect/unstable/ai/DecisionModel`) and a TypeSafe provider for it
(`@effect/ai-typesafe`): it answers typed decisions about an input instead of generating text. To be
usable from a Composer operation it needs two things the provider cannot supply — a route the
browser can reach with a key, and a place in the layer stack.

This plugin is that seam and nothing else. It has no surfaces, no schema, and no operations: a
plugin that wants decisions depends on `DecisionModel`, not on this plugin.

## Contributions

| Capability                | What                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `ConnectorSpec.Connector` | Optional `typesafe.ai` connector; the user pastes an API key, stored as an `AccessToken`. |
| `Capabilities.LayerSpec`  | Space-affinity `DecisionModel`, routed through EDGE.                                      |

## Decisions

**EDGE by default, BYOK optional.** Calls go through EDGE's `/ai/generate/typesafe` proxy, which
holds a platform key and meters usage per account, so TypeSafe works with nothing connected. A key
the user connects is a space credential like every other provider key: `CredentialsService`
resolves it and it rides as `X-BYOK`, which EDGE forwards unbilled.

**Effect's provider, EDGE's transport.** `@effect/ai-typesafe` is built on `HttpClient`, so it sits on
the same stack as the Anthropic and DeepSeek resolvers: `EdgeAiHttpClient` re-targets the request
onto the proxy and `Header.byokLayer` adds the connected key. Nothing TypeSafe-specific is
implemented here.

**Resolve the key per call, not at slice materialisation.** Capturing it when the space slice is
built means a user who connects TypeSafe mid-session keeps being billed on the platform key until
something restarts the slice, and a user who disconnects keeps authenticating with a captured key.
Per call is one query against an in-memory credential set, which is not worth optimising away for
either of those bugs.

**A direct `apiUrl` needs a key.** It bypasses EDGE, so there is no platform key; the connected key
is sent as a bearer token and, without one, the vendor's 401 surfaces as an `AiError` the caller can
report rather than dying inside the layer and taking the slice with it.

**Space affinity.** Credentials are per space, so the model is too. An application-affinity model
would have to choose a space's key arbitrarily.

## The browser cannot call the vendor directly

`api.typesafe.ai` returns no `access-control-allow-origin` for any origin and answers the CORS
preflight with a 400, so a fetch from Composer fails before it leaves the tab — verified against
every origin tried, including `null`. This is not a sandbox artefact: the vendor simply does not
support browser callers.

So the call is routed through EDGE, like the AI providers. The `apiUrl` setting remains for a
self-hosted or regional endpoint that does send CORS headers. It replaced an `endpoint` setting whose
default was the vendor URL; the old key is dropped on decode, so persisted settings route through
EDGE.

## Not in scope

No UI. The connector dialog is plugin-connector's, and there is nothing else to show — a decision
model has no view of its own. Anything user-facing belongs to the plugin asking the questions
(see plugin-labeler).
