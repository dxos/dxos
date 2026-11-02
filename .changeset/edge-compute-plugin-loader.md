---
'@dxos/edge-compute': minor
---

`@dxos/edge-compute/plugin-loader` turns a plugin bundle and the bundles of its dependencies into the modules a Cloudflare Dynamic Worker loads: every bare import rewritten through one import map joined from their `vendor/` directories, and a main module that builds each plugin from its `manifest.json` and starts the vendored `PluginHost`. It parses with `es-module-lexer`'s JavaScript build, so it runs on workerd.
