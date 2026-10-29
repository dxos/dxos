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

## Writing a release

`--release-dir <dir>` also writes each release that passes to `<dir>/<pluginKey>/<version>/`, the files registry-service
publishes. `--entry` checks one module that exports a plugin's `make` instead of the package's exports, with
`--dependency` for each plugin it may depend on. The test plugin's release, which the EDGE e2e suite publishes when
`DX_PLUGIN_RELEASE_DIR` points at it:

```bash
node dist/lib/bin/check-release.mjs \
  --entry src/testing/test-plugin-entry.ts \
  --dependency src/testing/test-base-plugin-entry.ts \
  --release-dir /tmp/edge-releases
```
