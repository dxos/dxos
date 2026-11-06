# @dxos/plugin-host-cloudflare

Hosts Composer plugins on EDGE, inside a Cloudflare Dynamic Worker loaded through the Worker Loader API. The design is the
EDGE-side plugins spec (`org.dxos.app-framework.edge-plugins`).

This package is the runtime a plugin's build adds to its bundle's `vendor/`; it runs on workerd. Building and checking a
bundle is `@dxos/plugin-builder`.

- `PluginHost` — the host a plugin bundle starts on EDGE: activates its plugins once per isolate, `describe()`s what
  they contribute and `invoke()`s their operations. It also speaks the functions fetch protocol compute-service uses
  for Worker Loader functions.
- `PluginCatalog` — a plugin's operations, skills, types and activation failures, as JSON.
- `PluginActivation` — activates a plugin's workerd modules and collects what they contribute.
