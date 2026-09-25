---
'@dxos/plugin-inbox': minor
---

A bindable type no longer names the connectors that sync it. `ConnectorSync` gains `targetTypename` — the local type a connector binds — and `connectorIdsForTarget` resolves a type's providers from the registered `Connector` capabilities. `Mailbox` and `Calendar` pass it as their `ConnectorAuthAnnotation.connectorIds` resolver instead of listing Gmail, JMAP and Google Calendar by id, which also deletes the three connector-id constants plugin-inbox had been duplicating from the provider plugins and keeping in step by hand.

The upshot: registering a `Connector` is the only step needed for it to be offered on the types it binds, and a third-party provider can bind a built-in type without the plugin that owns that type knowing the provider exists. `ConnectorAuthAnnotation` already supported a resolver (as `plugin-studio` and `plugin-blogger` use), so no new annotation machinery was needed.
