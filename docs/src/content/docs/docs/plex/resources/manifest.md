---
title: The plugin manifest
description: Every field of dx.config.ts, and the capabilities and activation events the framework provides.
---

A plugin describes itself in `dx.config.ts`, with `Plugin.config`. The build reads it to write the plugin's
manifest, which Composer and the registry read without loading the plugin's code. See
[Plugin](/docs/plex/guides/plugin/) for an example.

## `plugin`

| Field | Required | What it is |
| --- | --- | --- |
| `author` | No | The author or organization. The registry ignores it and shows the verified publisher. |
| `dependsOn` | No | Keys of plugins this one needs at runtime. |
| `description` | No | One or two sentences, shown in the plugin list. |
| `homePage` | No | A link to the plugin's site. |
| `icon` | No | `{ key, hue }`: a Phosphor icon key and a hue. |
| `key` | Yes | The plugin's globally unique key, a reverse-domain NSID such as `com.example.plugin.bookmarks`. |
| `name` | Yes | The name people see. |
| `screenshots` | No | `{ light, dark }` image URLs for the registry. |
| `source` | No | A link to the source code. |
| `spec` | No | The plugin's spec, such as its `PLUGIN.mdl`. |
| `tags` | No | Labels for the plugin list. Composer's own plugins start with a quality tier: `system`, `beta`, `alpha` or `labs`. |

## `publish`

Optional. `dx registry publish` reads all three fields together.

| Field | What it is |
| --- | --- |
| `assetBaseUrl` | Where the built files are hosted, when not on the registry. |
| `buildCommand` | The command that builds the plugin. |
| `outputDirectory` | The folder the build writes to. |

## `modules`

The plugin's modules, each made by a maker such as `AppCapability.surface`. Each body is a dynamic import, so
reading the config loads none of the plugin's code. See [Plugins and modules](/docs/plex/concepts/plugins/).

## Framework capabilities

From `@dxos/app-framework/Capabilities`. The capabilities a workspace app adds are in
[AppCapabilities](/docs/plex/guides/app-capabilities/).

| Capability | What it holds |
| --- | --- |
| `AtomRegistry` | The atom registry every plugin's atoms live in. |
| `Command` | CLI commands. |
| `Layer` | Effect layers the app's runtime provides. |
| `LayerSpec` | Layers for operation services, with how widely each is shared. |
| `OperationHandler` | Handler sets for operations. |
| `OperationInvoker` | The invoker that runs operations. |
| `PluginManager` | The plugin manager. |
| `ReactContext` | React context providers wrapped around the app. |
| `ReactRoot` | Components rendered at the app's root. |
| `ReactSurface` | Surfaces, each with its roles and filter. |
| `UndoMapping` | How to undo an operation. |

## Activation events

From `@dxos/app-framework/ActivationEvents`. See [ActivationEvent](/docs/plex/guides/activation-event/).

| Event | When it fires |
| --- | --- |
| `CommandsRequested` | Before the CLI or devtools terminal builds its command tree. |
| `Idle` | Once, when the main thread is idle after the app is interactive. The default for a module with no `activatesOn`. |
| `PluginAssetsRequested` | Before a tool reads plugin assets, such as a spec. |
| `SpaceTemplatesRequested` | Before the app lists space templates. |
| `Startup` | Once, while the app boots. |
| `SurfacesRequested(role)` | The first time a surface of that role renders. |
