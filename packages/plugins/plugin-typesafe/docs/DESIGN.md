# plugin-typesafe — design

## Why

`@dxos/ai-typesafe` is a client for a decision model: it answers typed questions about a state
instead of generating text. To be usable from a Composer operation it needs two things the package
itself cannot supply — a key the user owns, and a place in the layer stack.

This plugin is that seam and nothing else. It has no surfaces, no schema, and no operations: a
plugin that wants decisions depends on `DecisionModel`, not on this plugin.

## Contributions

| Capability                | What                                                                             |
| ------------------------- | -------------------------------------------------------------------------------- |
| `ConnectorSpec.Connector` | `typesafe.ai` connector; the user pastes an API key, stored as an `AccessToken`. |
| `Capabilities.LayerSpec`  | Space-affinity `DecisionModel`, built from that key.                             |

## Decisions

**BYOK through the connector, not settings.** The key is a space credential like every other
provider key, so `CredentialsService` resolves it and the connector UI, the vault and the
disconnect flow all work with no plugin-specific code.

**Resolve the key per call, not at slice materialisation.** Capturing it when the space slice is
built means a user who connects TypeSafe mid-session keeps getting failures until something
restarts the slice, and a user who disconnects keeps succeeding against a captured key. Per call is
one query against an in-memory credential set, which is not worth optimising away for either of
those bugs.

**Missing credential is a `DecisionError`, not a defect.** A space with no key connected is an
ordinary state — the caller should be able to tell the user to connect TypeSafe. Dying inside the
layer would take the slice with it and surface as `ServiceNotAvailable` far from the cause.

**Space affinity.** Credentials are per space, so the model is too. An application-affinity model
would have to choose a space's key arbitrarily.

## The browser cannot call the vendor directly

`api.typesafe.ai` returns no `access-control-allow-origin` for any origin and answers the CORS
preflight with a 400, so a fetch from Composer fails before it leaves the tab — verified against
every origin tried, including `null`. This is not a sandbox artefact: the vendor simply does not
support browser callers.

Two consequences:

- **The endpoint is a setting**, defaulting to the vendor. A deployment points it at whatever
  proxies for it, and a self-hosted or regional endpoint costs no code either way.
- **The production fix is a server-side route** (EDGE), like the AI providers already have. Until
  that exists, a browser deployment needs a proxy that adds the CORS headers — and, when the proxy
  is on localhost, `access-control-allow-private-network: true` as well, or Chrome's Private
  Network Access check blocks the request before it is sent.

## Not in scope

No UI. The connector dialog is plugin-connector's, and there is nothing else to show — a decision
model has no view of its own. Anything user-facing belongs to the plugin asking the questions
(see plugin-labeler).
