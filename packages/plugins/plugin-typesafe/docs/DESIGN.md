# plugin-typesafe — design

## Why

TypeSafe System One is a decision model: it answers typed questions about a state instead of
generating text. Effect ships the API for it (`Decision` / `DecisionModel` in `effect/unstable/ai`),
and `@dxos/ai` ships the System One provider (`TypeSafeResolver`) behind `AiService.decisionModel`.
What neither can supply is a route the browser can reach.

This plugin is that seam and nothing else. It has no surfaces, no schema, and no operations: a
plugin that wants decisions asks `AiService.decisionModel(...)`, not this plugin.

## Contributions

| Capability                        | What                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `ConnectorSpec.Connector`         | Optional `typesafe.ai` connector; the user's own key, stored as an `AccessToken`. |
| `AppCapabilities.AiModelResolver` | `TypeSafeResolver` routed through EDGE, chained into the space's AiService.       |

## Decisions

**A resolver, not its own layer.** Decision models resolve through `AiService` like language
models do, so a consumer names a model (`ai.typesafe.model.jev.latest`) and the space decides who
serves it. The resolver contributes at Startup because `AiService` snapshots its resolvers then.

**EDGE by default, BYOK optional.** Calls go through EDGE's `/ai/generate/typesafe` proxy, which
holds a platform key and meters usage per account, so TypeSafe works with nothing connected. A key the
user connects is a space credential like every other provider key: `CredentialsService` resolves it,
and it rides as `X-BYOK`, which EDGE forwards unbilled. `TypeSafeResolver` knows nothing of EDGE: it
sends the key as a bearer token, and the EDGE transport moves it to `X-BYOK` because EDGE owns
`Authorization`.

**Resolve the key per call, not when the model is built.** Capturing it once means a user who
connects TypeSafe mid-session keeps getting failures until something restarts the slice, and a user
who disconnects keeps succeeding against a captured key. Per call is one query against an in-memory
credential set, which is not worth optimising away for either of those bugs.

**A direct endpoint needs a key, over HTTPS.** The `endpoint` setting bypasses EDGE, so there is no
platform key behind it; a space with none connected fails with an `AuthenticationError`
(`MissingKey`) the caller can turn into "connect TypeSafe". The key goes out as a bearer token, so the
setting must be `https` (plain `http` only on loopback), and a non-conforming value fails the decision
before the key is read.

**A failed credential lookup fails the decision.** Reading it as "no key" would send the call through
EDGE on the platform key, billing a space that brought its own. Dying inside the layer would surface as `ServiceNotAvailable` far from the cause.

## The browser cannot call the vendor directly

`api.typesafe.ai` returns no `access-control-allow-origin` for any origin and answers the CORS
preflight with a 400, so a fetch from Composer fails before it leaves the tab — verified against
every origin tried, including `null`. This is not a sandbox artefact: the vendor simply does not
support browser callers.

So the call is routed through EDGE, like the AI providers. The `endpoint` setting remains, read per
call, for a self-hosted or regional endpoint that does send CORS headers. The vendor URL was its
previous default and is still in persisted settings; it is treated as unset, since it can never work
from a browser.

## Not in scope

No UI. The connector dialog is plugin-connector's, and there is nothing else to show — a decision
model has no view of its own. Anything user-facing belongs to the plugin asking the questions
(see plugin-labeler).
