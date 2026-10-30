# @dxos/plugin-host-cloudflare

Hosts Composer plugins on EDGE, inside a Cloudflare Dynamic Worker loaded through the Worker Loader API. The design is the
EDGE-side plugins spec (`org.dxos.app-framework.edge-plugins`).

- `PluginHost` — the host a plugin bundle starts on EDGE: activates its plugins once per isolate, `describe()`s what
  they contribute and `invoke()`s their operations. It also speaks the functions fetch protocol compute-service uses
  for Worker Loader functions. A plugin's build adds it to the bundle's `vendor/`.
- `PluginCatalog` — a plugin's operations, skills, types and activation failures, as JSON.
- `@dxos/plugin-host-cloudflare/bundle` (Node) — `buildBundle` builds a plugin package's one bundle with
  `composerPlugin`; `PluginBundle.check` and `PluginBundle.rewriteImports` are the static checks and the load-time
  rewrite of bare imports to `vendor/`; `loadBundle` loads a bundle through Worker Loader in a local workerd;
  `verifyBundle` runs all of it.

## Checking a plugin

A plugin package tagged `edge-release` in its `moon.yml` inherits `check-edge-release`:

```bash
moon run plugin-markdown:check-edge-release
```

It builds the package's bundle into `dist/plugin` (the same build `dx registry publish` uploads), builds the bundles of
the plugins in its `dependsOn` closure, and runs the bundle check below with them beside it.

## Checking a plugin bundle

`check-bundle` checks a built plugin bundle, laid out as the EDGE plugins spec describes (plugin files at the root,
shared packages in `vendor/`), before it is published:

```bash
node dist/lib/bin/check-bundle.mjs <bundle dir> [--dependency <bundle dir>]... [--no-load]
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
