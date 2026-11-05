# @dxos/plugin-builder

Builds and checks Composer plugin bundles for EDGE, in Node. The bundle carries the runtime from
`@dxos/plugin-host-cloudflare` in its `vendor/`.

- `buildBundle` builds a plugin package's one bundle with `composerPlugin`, with the host added to `vendor/`.
- `PluginBundle.check` and `PluginBundle.rewriteImports` are the static checks and the load-time rewrite of bare imports
  to `vendor/`.
- `loadBundle` loads a bundle through Worker Loader in a local workerd.
- `verifyBundle` runs all of it.

## Checking a plugin

A plugin package tagged `edge-release` in its `moon.yml` inherits `check-edge-release`:

```bash
moon run plugin-markdown:check-edge-release
```

It builds the package's bundle into `dist/plugin` (the same build `dx registry publish` uploads) and runs the bundle
check below on it. The plugin runs alone on EDGE, so no other plugin's bundle is built beside it.

## Publishing a plugin to EDGE

The same packages inherit `publish-edge-release`, which runs `check-edge-release` and then uploads `dist/plugin` to the
EDGE registry at `DX_EDGE_BASE_URL` as a first-party plugin, authenticated with the EDGE admin key in `DX_HUB_API_KEY`:

```bash
DX_EDGE_BASE_URL=https://preview.dxos.network DX_HUB_API_KEY=... moon run plugin-markdown:publish-edge-release
moon run plugin-markdown:publish-edge-release -- --dry-run
```

It prints one line per plugin: `✓` published (or the same content was already there), `!` stale (the version already
holds other content on EDGE, and only a version bump publishes it; a warning, not a failure), or `✗` failed. The
nightly Deploy Apps run publishes every `edge-release` plugin to preview with
`moon exec --on-failure continue :publish-edge-release`.

## Checking a plugin bundle

`check-bundle` checks a built plugin bundle, laid out as the EDGE plugins spec describes (plugin files at the root,
shared packages in `vendor/`), before it is published:

```bash
check-bundle <bundle dir> [--no-load]
```

It fails when:

- the manifest or `vendor/manifest.json` is malformed;
- a module does not parse;
- an import or manifest URL names no file in the bundle;
- a bare import of the plugin is not vendored;
- a workerd module reaches a stylesheet or a browser-only body.

Unless `--no-load` is given, it then rewrites the bundle's bare imports to `vendor/`, as EDGE's loader does, imports
each workerd module in workerd through Worker Loader, and, when `vendor/` carries the host, calls `describe()`. It fails
when a module does not import, a module fails to activate, or the plugin contributes no operations, skills or types.

`check-release [--package <dir>]` builds the package's bundle and runs `check-bundle` on it.
