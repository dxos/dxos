---
'@dxos/plugin-debug': minor
'@dxos/plugin-projects': minor
---

Two plugin space templates, Shogi Plugin and World Clock Plugin, each a partial spec of a Composer plugin, four planned features on the project's feature map that open it, and three planning tasks. The assistant completes the spec, draws it, files the implementation as tasks and works them in a sandbox on EDGE until the plugin is published to the reader's private plugin registry, where they install it. Both share one template (`PluginSpace`) and are offered only by a build that stamped its plugin toolchain, talking to an EDGE. plugin-projects' `Templates` now exports the toolchain helpers they are built from (`readToolchain`, `packageJson`, `cliSpec`, `NPMRC`, `PluginToolchain`), and `packageJson` takes the plugin's name and `@dxos/*` packages.
