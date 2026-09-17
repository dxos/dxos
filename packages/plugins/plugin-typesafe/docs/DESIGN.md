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

## Not in scope

No UI. The connector dialog is plugin-connector's, and there is nothing else to show — a decision
model has no view of its own. Anything user-facing belongs to the plugin asking the questions
(see plugin-labeler).
