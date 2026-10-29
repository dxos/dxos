# @dxos/plugin-host-cloudflare

Hosts Composer plugins on EDGE, inside a Cloudflare Dynamic Worker loaded through the Worker Loader API. The design is the
EDGE-side plugins spec (`org.dxos.app-framework.edge-plugins`).

- `PluginHost` — the main module of a release: activates its plugins once per isolate, `describe()`s what they contribute
  and `invoke()`s their operations. It also speaks the functions fetch protocol compute-service uses for Worker Loader
  functions.
- `PluginCatalog` — a release's operations, skills, types and activation failures, as JSON.
- `PluginRelease` — release files to Worker Loader modules, the content hash that names a release, and its manifest.
- `@dxos/plugin-host-cloudflare/bundler` (Node) — `bundlePlugin` bundles a plugin's `workerd` build and the host into one
  self-contained module graph; `loadRelease` loads it through Worker Loader in a local workerd; `checkRelease` reports
  whether it is fit to publish.

## Checking a plugin

A plugin package tagged `edge-release` in its `moon.yml` inherits `check-edge-release`:

```bash
moon run plugin-markdown:check-edge-release
```

It fails when the release imports a module it does not contain, a module fails to activate, or the plugin contributes
no operations, skills or types on EDGE.
