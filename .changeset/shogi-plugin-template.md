---
'@dxos/plugin-debug': minor
'@dxos/plugin-projects': minor
---

A Shogi Plugin space template: a partial spec of a Composer plugin that puts a shogi board in every space, four planned features on the project's feature map that open it, and three planning tasks. The assistant completes the spec, draws it, files the implementation as tasks and works them in a sandbox on EDGE until the plugin is published to the reader's private plugin registry, where they install it. The template is offered only by a build that stamped its plugin toolchain, talking to an EDGE. plugin-projects' `Templates` now exports the toolchain helpers it is built from (`readToolchain`, `packageJson`, `cliSpec`, `NPMRC`, `PluginToolchain`), and `packageJson` takes the plugin's name and `@dxos/*` packages.
