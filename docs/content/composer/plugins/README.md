---
dir:
  text: Building Plugins
  order: 20
---
# Quick Start

To prototype a plugin:

```bash
npm create @dxos/plugin-template@latest
```

This will create a working plugin project with a hot reloading development server.

The plugin definition is found in `src/plugin.ts`.

```bash
npm install
npm run dev
```

This will start your development server with a core set of plugins and the plugin being prototyped.

Default plugins can be disabled when creating the project using `--interactive`

```bash
npm create @dxos/plugin-template@latest --interactive
```

Answer `no` to the question `Include default plugins?` to generate an empty configuration.

::: warning Technical Preview

The Composer Extensibility APIs are under development and subject to frequent change. We are excited to hear your feedback and ideas on [Discord](https://discord.gg/eXVfryv3sW).

:::
