---
dir:
  text: Building Plugins
  order: 20
---

# Quick Start

To prototype a plugin:

```bash
npm create @dxos/app-plugin@latest
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
npm create @dxos/app-plugin@latest --interactive
```

Answer `no` to the question `Include default plugins?` to generate an empty configuration.

::: warning Under Development

The Composer Extensibility APIs are under active development. The API may change often, and these docs may not be accurate.

Talk to us on [Discord](https://discord.gg/eXVfryv3sW) with feedback anytime.

:::
