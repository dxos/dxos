---
'@dxos/app-framework': minor
---

A plugin can now contribute a `HostServiceAdapter` capability that builds one of its services from a service its host serves as plain data, so the plugin's own codecs run inside an EDGE bundle. plugin-agent uses it for `BrainWire`, which serves every agent-brain call to a bundle — `wake`, `subscribe`, `subscriptions`, `unsubscribe`, `take` and `ack` included — and plugin-discord gets an optional `DiscordSource.Http` service through which its REST client sends requests when a host (EDGE's discord-service) provides one.
