# plugin-typesafe — design

## Why

TypeSafe System One is a decision model: it answers typed questions about a state instead of
generating text. Effect ships the API for it (`Decision` / `DecisionModel` in `effect/unstable/ai`),
and `@dxos/ai` ships the System One provider (`TypeSafeResolver`) behind `AiService.decisionModel`.
What neither can supply is a key the user owns.

This plugin is that seam and nothing else. It has no surfaces, no schema, and no operations: a
plugin that wants decisions asks `AiService.decisionModel(...)`, not this plugin.

## Contributions

| Capability                        | What                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `ConnectorSpec.Connector`         | `typesafe.ai` connector; the user pastes an API key, stored as an `AccessToken`.  |
| `AppCapabilities.AiModelResolver` | `TypeSafeResolver`, keyed by that credential, chained into the space's AiService. |

## Decisions

**A resolver, not its own layer.** Decision models resolve through `AiService` like language
models do, so a consumer names a model (`ai.typesafe.model.jev.latest`) and the space decides who
serves it. The resolver contributes at Startup because `AiService` snapshots its resolvers then.

**BYOK through the connector, not settings.** The key is a space credential like every other
provider key, so `CredentialsService` resolves it and the connector UI, the vault and the
disconnect flow all work with no plugin-specific code.

**Resolve the key per call, not when the model is built.** Capturing it once means a user who
connects TypeSafe mid-session keeps getting failures until something restarts the slice, and a user
who disconnects keeps succeeding against a captured key. Per call is one query against an in-memory
credential set, which is not worth optimising away for either of those bugs.

**Missing credential is an `AiError`, not a defect.** A space with no key connected is an ordinary
state, so the decision fails with an `AuthenticationError` (`MissingKey`) the caller can turn into
"connect TypeSafe". Dying inside the layer would surface as `ServiceNotAvailable` far from the cause.

## The browser cannot call the vendor directly

`api.typesafe.ai` returns no `access-control-allow-origin` for any origin and answers the CORS
preflight with a 400, so a fetch from Composer fails before it leaves the tab — verified against
every origin tried, including `null`. This is not a sandbox artefact: the vendor simply does not
support browser callers.

Two consequences:

- **The endpoint is a setting**, defaulting to the vendor, read per call. A deployment points it at
  whatever proxies for it, and a self-hosted or regional endpoint costs no code either way.
- **The production fix is a server-side route** (EDGE), like the AI providers already have. Until
  that exists, a browser deployment needs a proxy that adds the CORS headers — and, when the proxy
  is on localhost, `access-control-allow-private-network: true` as well, or Chrome's Private
  Network Access check blocks the request before it is sent.

## Not in scope

No UI. The connector dialog is plugin-connector's, and there is nothing else to show — a decision
model has no view of its own. Anything user-facing belongs to the plugin asking the questions
(see plugin-labeler).
