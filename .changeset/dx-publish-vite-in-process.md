---
'@dxos/app-framework': minor
'@dxos/plugin-registry': minor
---

A plugin can contribute a `HostServiceAdapter` capability that builds one of its own services from a service its host serves as plain data, so the plugin's codecs run inside an EDGE bundle. plugin-agent uses it to serve every agent-brain call to a bundle through `BrainWire`, and plugin-discord adds an optional `DiscordSource.Http` service that its REST client sends requests through when the host provides one.

`dx registry publish` now runs the project's own Vite inside the `dx` process, compiled binary included, when `publish.buildCommand` is unset or `vite build`; any other command still runs in a shell. A new `--dry-run` flag builds and checks the bundle without uploading it, and a bundle built under bun no longer imports `ws` or `undici` as `node:` builtins.
