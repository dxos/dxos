---
title: Publishing a plugin
description: Publish a plugin to your private registry, where Composer lists it only to you
sidebar:
  order: 3
---

A **private registry** is the list of plugins that DXOS hosts for your identity. By the end of this guide, your plugin
is in yours, and Composer lists it for you on every device.

The guide has five steps. The sections after them cover loading a plugin without publishing it, two worked examples,
shipping a spec, and a command reference.

You need a working plugin first. If you don't have one, build Stash in the learning path, which starts at
[The PLEX plugin](/docs/plex/learn/the-plex-plugin/). [`plugin-excalidraw`](https://github.com/dxos/plugin-excalidraw)
is a published plugin you can read as a reference.

:::note[Public registry]
There is also an experimental public registry, where plugins are published over AT Protocol and listed to everyone.
If you'd like to try it, reach out on [Discord](https://dxos.org/discord).
:::

## How the private registry works

DXOS hosts your plugin's bundle and records it against your DXOS identity. Composer lists the plugin in its plugin
registry only when you are signed in as that identity, and it loads the bundle on demand.

Nothing is written to AT Protocol, and no verification is needed. The first release of a plugin key claims it, so no
other identity can publish that key privately afterwards.

## Prerequisites

- A Composer plugin with a `dx.config.ts`. The plugin from the learning path is ready as it is, and
  [step 3](#3-describe-your-plugin-in-dxconfigts) says what you can add.
- A DXOS identity, the same one you use in Composer.
- The `dx` CLI, which step 1 installs.

## 1. Install the CLI

Install the CLI from npm, then check that it runs:

```bash
npm install -g @dxos/cli
dx --version
```

## 2. Log in

Log in to your DXOS identity:

```bash
dx account login
```

`login` prompts for a method, and the methods mirror Composer's sign-in: `email`, `passkey`, `atmosphere`, `composer`,
`device-invitation` or `recovery-code`. `atmosphere` is your Atmosphere account, that is, Bluesky. `composer` joins
the identity that is open in a Composer tab on this machine, once you approve it there.

To log out, run `dx account logout`.

`dx account login` signs in to an identity that already exists. It doesn't create one. Create your identity in
Composer, or run `dx account signup <access-code>` if you have an access code.

Some processes have no identity of their own, such as a CLI in a sandbox or a CI job. For these, set an API token in
`DX_API_TOKEN` instead. The token is bound to the account that minted it, so the plugin is listed to that account.

In Composer, a sandbox gets a token from its **Grant account access** action, which mints one that expires with the
sandbox.

## 3. Describe your plugin in `dx.config.ts`

`dx.config.ts` sits at the root of your plugin's package. It is the one place that holds the plugin's registry
metadata.

A **manifest** is the `manifest.json` file that the build writes from `dx.config.ts`. `dx registry publish` reads the
manifest to publish the plugin.

If you built your plugin in the learning path, your `dx.config.ts` already works. `Plugin.config` takes the `plugin`
fields that the registry reads, and `composerPlugin()` in your `vite.config.ts` builds from that file. You can add two
things:

- Registry fields, such as `source` and `screenshots`, go in `plugin`, beside `key` and `name`.
- A `publish` block goes beside `plugin` and `modules`. You need one only when your build is not `vite build` into
  `dist`.

**Example** (Adding registry fields and a publish block to Stash)

```ts
// dx.config.ts
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: StashNamespace.key,
    name: 'Stash',
    description:
      'A reading list: save links with a note, and mark them as read.',
    icon: { key: 'ph--tray-arrow-down--regular', hue: 'indigo' },
    tags: ['labs'],
    // Registry fields.
    source: 'https://github.com/your-org/stash',
    screenshots: [
      {
        light: 'https://example.com/stash-light.png',
        dark: 'https://example.com/stash-dark.png',
      },
    ],
  },
  publish: {
    buildCommand: 'vite build', // how to build the bundle
    outputDirectory: 'dist', // where the build writes manifest.json
  },
  modules: [
    // ...the modules from the learning path.
  ],
});
```

`publish` states the defaults here, so Stash publishes the same with or without it.

These are the fields of `plugin`:

| Field         | Required | Notes                                                                                                                                            |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `key`         | yes      | An NSID, a reverse-domain name such as `org.example.plugin.sketch`, whose last segment is camelCase with no hyphens. No other plugin may use it. |
| `name`        | yes      | The name the registry shows.                                                                                                                     |
| `description` | no       | A short description for the plugin's detail view.                                                                                                |
| `author`      | no       | The author's or organization's name. The registry ignores it for a published plugin, and shows the publisher.                                    |
| `icon`        | no       | `{ key, hue? }`. `key` is a [Phosphor](https://phosphoricons.com) icon name, and `hue` is an optional color such as `indigo`.                    |
| `source`      | no       | The URL of the source repository.                                                                                                                |
| `homePage`    | no       | The URL of the homepage.                                                                                                                         |
| `tags`        | no       | A list of labels that the registry groups plugins by, such as `labs`.                                                                            |
| `screenshots` | no       | Preview images for the plugin's detail view. Each entry is a `{ light?, dark? }` record of URLs, one for each theme.                             |
| `spec`        | no       | The path of the plugin's `.mdl` spec inside the package, such as `PLUGIN.mdl`. See [Ship a spec](#ship-a-spec).                                  |
| `dependsOn`   | no       | The keys of the plugins this plugin needs at runtime. Enabling the plugin enables them too.                                                      |

These are the fields of `publish`:

| Field             | Required | Notes                                                                                                                                                            |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildCommand`    | no       | The command that `dx registry publish` runs to build, unless you pass `--no-build`. If it is unset or `vite build`, the project's Vite runs in the `dx` process. |
| `outputDirectory` | no       | The directory the build writes to, which must contain `manifest.json`. `dist` by default.                                                                        |

The release's version comes from the `version` field of your `package.json`, not from `dx.config.ts`. Bump it before
you publish a new release.

Before you publish, pin every `@dxos/*` dependency to the build of the Composer that will load the plugin. The
learning path pinned them to the build these docs run. The
[first example](#example-a-plugin-with-its-own-group-in-the-navigation-tree) shows the two forms a pin takes, beside
its `package.json`.

:::caution[Match Composer's versions]
Move every `@dxos/*` dependency to a new version together. A plugin built against a mix of versions can fail to load.
:::

A plugin can also keep its modules in an entry file, and use `dx.config.ts` for its metadata alone. `Config2.make`
describes a plugin laid out that way.

**Example** (Describing a plugin that has an entry file)

```ts
import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.example.plugin.sketch', // required: an NSID that no other plugin uses
    name: 'Sketch', // required
    description: 'A canvas for quick diagrams.',
    icon: { key: 'ph--compass-tool--regular', hue: 'indigo' },
    source: 'https://github.com/your-org/your-plugin',
    tags: ['labs'],
    screenshots: [
      {
        light: 'https://example.com/screenshot-light.png',
        dark: 'https://example.com/screenshot-dark.png',
      },
    ],
  },
  publish: {
    buildCommand: 'vite build', // how to build the bundle
    outputDirectory: 'dist', // where the build writes manifest.json
  },
});
```

`Config2.make` takes `plugin` and `publish`, and no `modules`. The modules are in the entry file, which
`vite.config.ts` names for `composerPlugin`:

```ts
import { composerPlugin } from '@dxos/app-framework/vite-plugin';

export default defineConfig({
  plugins: [
    ...composerPlugin({ entry: 'src/MyPlugin.tsx' }),
    // ...react(), etc.
  ],
});
```

Without `entry`, `composerPlugin` builds such a plugin from `src/plugin.tsx`.

:::tip[Import from the config subpath]
Import `Config2` from `@dxos/app-framework/config`, not from `@dxos/app-framework`. The `/config` subpath is a small
entry point. The main entry pulls in the whole UI framework, which a build or a publish does not need.
:::

## 4. Publish

Run the publish command from your plugin directory:

```bash
dx registry publish --private
```

The command runs these steps:

1. It builds the bundle. Pass `--no-build` to skip this step and publish a pre-built `dist`.
   - If `buildCommand` is unset or is `vite build`, `dx` loads the Vite your project installs and runs it in its own
     process. Neither node nor a separate Vite process is needed.
   - If `buildCommand` is anything else, it runs in a shell.
2. It reads the manifest that the build wrote.
3. It checks the bundle by loading it the way [EDGE](/docs/edge/overview/) does. EDGE is the always-online peer that
   DXOS runs, and it hosts the registry. If a module does not activate there, the publish fails before anything is
   uploaded.
4. It uploads the bundle to DXOS and records it against your identity.

Useful flags:

| Flag               | Purpose                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `--dir <path>`     | Names the project directory that holds `dx.config.ts`. The current directory by default. |
| `--no-build`       | Skips the build and publishes the existing `dist`.                                       |
| `--dry-run`        | Builds and checks the bundle, then stops. Nothing is uploaded or recorded.               |
| `--edge-url <url>` | Uploads to the EDGE at another URL, mainly to test against a local one.                  |

## 5. Confirm it's published

The command prints the bundle's URL. In Composer, signed in as the same identity, click **Plugin Settings** in the
rail, open **Plugins**, and look under **Registry**. Your plugin is listed there, and you install it like any other
plugin.

## Updating a plugin

Bump the `version` in `package.json`, then run `dx registry publish --private` again. Each version is published once,
so a change needs a new version.

## Load a plugin without publishing it

You don't need to publish a plugin to test it in Composer. Composer loads a plugin from the URL of its manifest, so
it can load from anything that serves a manifest and the code the manifest names.

You can load a plugin in two ways, from its dev server or from a built bundle. The assistant can also build a plugin
for you.

### From your plugin's dev server

Use this loop while you work on a plugin. Run `npm run dev` in the plugin's directory, then enable the plugin under
**Dev Server** in the Plugins settings of [Composer Preview](https://preview.composer.space). Only Composer Preview
loads a plugin from a dev server. [Run it in Composer](/docs/plex/learn/run-in-composer/) walks through it.

A **dev plugin** is a plugin loaded this way. It differs from an installed plugin:

- **It is never installed.** A dev plugin is not saved in your profile or in the offline cache. If the dev server is
  down at boot, Composer logs a warning, shows it under **Dev Server**, and tries again on the next reload.
- **It can stand in for an installed plugin.** If the key in your `dx.config.ts` matches a plugin you already have,
  the dev plugin takes its place for the session. That plugin can come from the registry or be built in. **Disable**
  restores the original.
- **React fast refresh does not reach it.** It is served from another origin, so reload the app instead of waiting
  for a hot update.

### From a built bundle

1. Build the plugin. The [first example](#example-a-plugin-with-its-own-group-in-the-navigation-tree) shows a build.
2. Serve its `dist` directory, which contains `manifest.json` and `index.mjs`. Serve it with CORS if it is on
   another origin.
3. In Composer, open **Plugins**, click **Load from URL**, the cloud icon in the Plugins header, and paste the
   manifest URL.

Unlike a dev plugin, a plugin loaded this way is installed. It stays in your profile, and its files are cached for
offline use.

The URL must point at the manifest, not at a source file. The loader fetches the manifest first and imports the
entry it names.

### With the assistant

The assistant, Composer's built-in AI agent, can build a plugin for you. A project template gives a chat a parent
task with subtasks, and the chat works through them. Both templates here build the same example, a plugin named
World Clock.

To start a run, create a project from a template and delegate its tasks to an agent. Which template you see depends
on where Composer runs and which plugins are on. The two end differently:

- Composer Plugin ends with a prompt that loads the plugin by URL when Composer is the desktop app. In a browser, it
  ends with the plugin in your private registry.
- Composer Plugin (Sandbox) ends with a prompt that loads the plugin from the sandbox that built it. Nothing is
  published.

**Composer Plugin.** This template comes from the Projects plugin. The chat uses the Sandbox skill, so turn the
Sandbox plugin on first. Composer offers the template only when its build recorded the commit it was built from. In a
browser, Composer also needs EDGE to build on.

The project has a parent task and four subtasks. The first three read this guide, write the plugin, then install,
typecheck and build it. The fourth depends on where Composer runs:

- In the Composer desktop app, the chat builds in a sandbox on your computer, which holds only `bun` and `bunx`. It
  puts the sandbox's `dist` folder at a URL and shows a prompt with the manifest URL. The chat does not load the
  plugin. You do, from that prompt.
- In a browser, the chat builds in a sandbox on EDGE, which [Compute](/docs/edge/concepts/compute/) describes. It
  publishes the plugin to your private registry with `dx registry publish --private`, so nothing is loaded by URL.
  The publish acts as your account, so the chat asks you to run the sandbox's **Grant account access** action when
  the sandbox has no token. The plugin then appears under **Registry** in **Plugins**, and you install it there.

**Composer Plugin (Sandbox).** This template comes from the Sandbox plugin, and its project has six subtasks. Here is
what the chat does:

- It builds in an EDGE sandbox, with `@dxos/*` installed from [pkg.pr.new](https://pkg.pr.new) at the commit the app
  was built from. If the build recorded no commit, it uses `main`.
- It serves `dist/` from the sandbox, on a port that it exposes at a public URL.
- It shows a prompt with the manifest URL of that port. You load the plugin from the prompt.

:::caution[A bundled build of Composer]
Every way of loading a plugin by URL needs a bundled build of Composer. That is a build made with `vite build` and
served by `vite preview`, or a deployed app. A bundled Composer publishes an import map that resolves your plugin's
bare `@dxos/*`, `react` and `effect` imports to Composer's own copies. Composer's own Vite dev server has no import
map, so those imports fail there.
:::

## Examples

The two examples lay a plugin out in the two ways that step 3 describes. The first keeps its modules in an entry
file. The second, Stash, defines the whole plugin in `dx.config.ts`.

### Example: a plugin with its own group in the navigation tree

This example is a small plugin in TypeScript. It adds a group to every space's navigation tree, with one page under
it that opens as an article. It builds with the official tooling into a `manifest.json` and an `index.mjs` that
Composer loads by URL.

The plugin has five files.

`dx.config.ts` names the plugin:

```ts
// dx.config.ts
import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.example.plugin.hello', // must match the key the plugin declares; last segment camelCase
    name: 'Hello',
    icon: { key: 'ph--hand-waving--regular', hue: 'amber' },
    tags: ['labs'], // lists it under Labs in the Plugins registry
  },
});
```

`vite.config.ts` builds it with `composerPlugin`:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { composerPlugin } from '@dxos/app-framework/vite-plugin';

export default defineConfig({
  plugins: [...composerPlugin({ entry: 'src/plugin.tsx' }), react()],
  build: { outDir: 'dist' }, // any directory you serve
});
```

`tsconfig.json` configures the typecheck:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "types": [],
  },
  "include": ["src", "dx.config.ts"],
}
```

`src/plugin.tsx` defines the plugin. Its `appGraph` module adds the group and the page, and its `surface` module
renders the page's article:

```tsx
// src/plugin.tsx
import * as Effect from 'effect/Effect';
import React from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import config from '../dx.config.ts';

const meta = Plugin.getMetaFromConfig(config);
const GROUP = 'helloGroup';
const GROUP_TYPE = `${meta.profile.key}.group`;
const PAGE = 'helloPage';

const HelloArticle = () => (
  <div style={{ padding: '2rem', fontSize: '2rem' }}>Hello from a plugin!</div>
);

export default Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'appGraph',
    activatesOn: ActivationEvents.Startup,
    provides: [AppCapabilities.AppGraphBuilder],
    activate: () =>
      Effect.gen(function* () {
        // A group: an uppercase heading in each space's navtree, between CONTENT and SYSTEM.
        const group = yield* AppGraphBuilder.createExtension({
          id: 'helloGroup',
          match: AppNodeMatcher.whenSpace,
          connector: (space) =>
            Effect.succeed([
              AppNode.makeGroup({
                id: GROUP,
                type: GROUP_TYPE,
                label: 'Hello',
                space,
                position: 400,
              }),
            ]),
        });
        // A page in that group. The URL binding is what lets the deck open it.
        const page = yield* AppGraphBuilder.createExtension({
          id: 'helloPage',
          match: AppNodeMatcher.whenNavTreeGroup(GROUP_TYPE),
          url: { key: PAGE, kind: 'singleton', path: [GROUP] },
          connector: (space) =>
            Effect.succeed([
              AppGraphNode.make({
                id: PAGE,
                type: `${meta.profile.key}.page`,
                data: PAGE,
                properties: {
                  label: 'Hello',
                  icon: 'ph--article--regular',
                  selectable: true,
                  draggable: false,
                  droppable: false,
                  space,
                },
              }),
            ]),
        });
        return [
          Capability.contribute(AppCapabilities.AppGraphBuilder, [
            ...group,
            ...page,
          ]),
        ];
      }),
  }),
  Plugin.addModule({
    id: 'surface',
    activatesOn: ActivationEvents.Startup,
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.ReactSurface,
          // Renders the page's article: the node's `data` is the subject.
          Surface.create({
            id: 'helloArticle',
            filter: AppSurface.literal(AppSurface.Article, PAGE),
            component: HelloArticle,
          }),
        ),
      ]),
  }),
  Plugin.make,
);
```

`package.json` names what the build needs. Pin every `@dxos/*` package to the one version closest to the Composer you
load the plugin into:

- For Composer Preview, use the newest `@next` snapshot. Preview deploys `main` every day, and `@next` is published
  from `main` every Monday. `npm view @dxos/app-framework@next version` prints it as `<version>-next-<commit>`.
  `@dxos/plugin-*` packages are versioned apart from the SDK, so pin each to its own snapshot of the same commit, which
  `npm view <package> versions` lists.
- For a release, use its npm version.
- For one particular commit of `main`, use its pkg.pr.new build, `https://pkg.pr.new/@dxos/<package>@<commit>`.

At runtime, the plugin uses Composer's own copies of `react`, `react-dom` and `effect`, so match those versions too.
In the file below, `<the host's version>` stands for the version Composer runs:

```json
{
  "name": "hello",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@dxos/app-framework": "<version>",
    "@dxos/app-graph": "<version>",
    "@dxos/app-toolkit": "<version>",
    "effect": "<the host's version>",
    "react": "<the host's version>",
    "react-dom": "<the host's version>"
  },
  "devDependencies": {
    "@types/react": "<the host's version>",
    "@vitejs/plugin-react": "^6.0.0",
    "typescript": "^7.0.0",
    "vite": "^8.0.0"
  }
}
```

Install, typecheck, then build, from the plugin's directory:

```bash
npm install
tsc -p tsconfig.json   # vite does not typecheck
vite build             # writes dist/manifest.json and dist/index.mjs
```

Bun alone can do the same, with no node on the machine:

1. Put `node-version=24.11.1` in an `.npmrc`. Without it, pnpm skips the bundler's native binary.
2. Run `bunx @pnpm/exe@10 install`.
3. Run `bun run --bun tsc -p tsconfig.json`, then `bun run --bun vite build`.

That is how the desktop app's Composer Plugin project template builds, in a sandbox that holds nothing else.

Serve `dist/`, with CORS if it is on another origin, and load `<URL of dist>/manifest.json`. After the plugin loads,
each space's navigation tree shows a HELLO group with a Hello page under it. Select the page to open it.

The version in the manifest comes from a `package.json` next to `dx.config.ts`. Without one, the version is `0.0.0`.

Things to know:

- You can also define a plugin entirely in `dx.config.ts`, with `Plugin.config({ plugin, modules })`, as the learning
  path and the next example do. Name each module body with
  `import('./src/capabilities/x.ts', { with: { type: 'module-url' } })`. `composerPlugin` then builds from
  `dx.config.ts` instead of `src/plugin.tsx`, and writes a manifest whose module bodies are chunks of the bundle.
- Composer shares some packages through its import map: the `@dxos/*` libraries, `react`, `react-dom` and `effect`.
  The build leaves those as bare imports, so the plugin uses Composer's copies. The build bundles every other package
  you import. `@dxos/plugin-*` packages are not shared, so the build bundles whatever you use from them.
- Ids are camelCase. This covers the key's last segment, module ids, graph extension ids, node ids and surface ids.
  For example, write `org.example.plugin.helloWorld`, not `…hello-world`.
  - If the key has a hyphen, the module throws `Invalid DXN` when it is imported.
  - If an extension id or a surface id has a hyphen, it is dropped without an error.
- `AppGraphBuilder.createExtension` returns an `Effect`. `yield*` it, and contribute the extensions it yields.
- A group is a heading, not a page. It has no URL binding, and it shows only once something is under it. Its
  `position` orders it among the built-in groups, where content is 200 and system is 900.
- A `singleton` page's node id must equal its URL `key`, and `path` names the group it sits under.
- Every module lists the capabilities its `activate` returns in `provides`.
- A plugin that fails to activate is disabled. Fix it, then re-enable it from the Plugins list, or reload.
- The browser caches a module that failed to import, so reload Composer before you load a fixed copy from the same
  URL.

### Example: data, an operation and another plugin's menu

Stash is the plugin that the learning path builds, from [The PLEX plugin](/docs/plex/learn/the-plex-plugin/) on. Here
is what it does:

- It stores an ECHO type in the space.
- It adds itself to the Space plugin's create menu.
- It shows each link in an article.
- It marks links as read with an operation that people and the assistant both run.

Stash is defined entirely in `dx.config.ts`, with one file per module body. The file below is a shortened version of
the one the learning path builds. It writes the key inline, and it leaves out the `author` field and the App Graph
module:

```ts
// dx.config.ts
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

export default Plugin.config({
  plugin: {
    key: 'com.example.plugin.stash',
    name: 'Stash',
    description:
      'A reading list: save links with a note, and mark them as read.',
    icon: { key: 'ph--tray-arrow-down--regular', hue: 'indigo' },
    tags: ['labs'],
  },
  modules: [
    AppCapability.translations(
      () =>
        import('./src/translations.ts', {
          with: { type: 'module-url' },
        }),
    ),
    AppCapability.schema(
      () =>
        import('./src/capabilities/schema.ts', {
          with: { type: 'module-url' },
        }),
    ),
    SpaceCapability.createObject(
      () =>
        import('./src/capabilities/create-object.ts', {
          with: { type: 'module-url' },
        }),
    ),
    AppCapability.surface(
      () =>
        import('./src/capabilities/react-surface.ts', {
          with: { type: 'module-url' },
        }),
      {
        roles: [AppSurface.Article],
      },
    ),
    AppCapability.operationHandler(
      () =>
        import('./src/capabilities/operation-handler.ts', {
          with: { type: 'module-url' },
        }),
    ),
    AppCapability.skillDefinition(
      () =>
        import('./src/capabilities/skill-definition.ts', {
          with: { type: 'module-url' },
        }),
    ),
  ],
});
```

The type carries the annotations Composer reads: the field that labels a link, and its icon. `UserType` marks the
type as one a person creates, which puts it in the create menu and the navigation tree. The schema module registers
the type, so the app can create and list links:

```ts
// src/types/StashedLink.ts
import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

export class StashedLink extends Type.makeObject<StashedLink>(
  DXN.make('com.example.type.stashedLink', '0.1.0'),
)(
  Schema.Struct({
    title: Schema.optional(Schema.String.annotate({ title: 'Title' })),
    url: Schema.optional(Schema.String.annotate({ title: 'URL' })),
    note: Schema.optional(Schema.String.annotate({ title: 'Note' })),
    read: Schema.optional(Schema.Boolean.annotate({ title: 'Read' })),
  }).pipe(
    Annotation.LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({
      icon: 'ph--tray-arrow-down--regular',
      hue: 'indigo',
    }),
    Annotation.UserType.set(),
  ),
) {}

export const make = (
  props: Partial<Obj.MakeProps<typeof StashedLink>> = {},
): StashedLink =>
  Obj.make(StashedLink, {
    title: props.title,
    url: props.url,
    note: props.note ?? '',
    read: props.read ?? false,
  });

// src/capabilities/schema.ts
import { StashedLink } from '../types/StashedLink.ts';

export default [StashedLink];
```

Composer names a type from the plugin's translations, keyed by its typename. Without them, the create menu and the
navigation tree show the typename itself, `com.example.type.stashedLink`, and the create menu's add button has no
label:

```ts
// src/translations.ts
import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { StashedLink } from './types/StashedLink.ts';

export default [
  {
    'en-US': {
      'com.example.plugin.stash': {
        'plugin.name': 'Stash',
      },
      [Type.getTypename(StashedLink)]: {
        'typename.label': 'Stashed link',
        'typename.label_zero': 'Stashed links',
        'typename.label_one': 'Stashed link',
        'typename.label_other': 'Stashed links',
        'object-name.placeholder': 'New link',
        'add-object.label': 'Add link',
      },
    },
  },
] as const satisfies Theme.Resource[];
```

The create menu belongs to the Space plugin. It lists every `CreateObjectEntry` contribution, so Stash contributes
one. The Space plugin shows a form built from the type's fields, and calls `createObject` with what the person typed:

```ts
// src/capabilities/create-object.ts
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { StashedLink, make } from '../types/StashedLink.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(StashedLink),
      createObject: (props, options) =>
        Operation.invoke(
          SpaceOperation.AddObject,
          { object: make(props), target: options.target },
          { spaceId: options.db.spaceId },
        ),
    }),
  ),
);
```

You define the operation once, with a schema for its input and output. Its handler loads only when the operation
first runs:

```ts
// src/types/StashedLinkOperation.ts
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';

import { StashedLink } from './StashedLink.ts';

export const MarkRead = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.stashedLink.markRead'),
    name: 'Mark as read',
    description: 'Mark a link as read.',
    icon: 'ph--check-circle--regular',
  },
  // The handler resolves the reference in the link's space.
  services: [Database.Service],
  input: Schema.Struct({
    link: Ref.Ref(StashedLink).annotate({
      description: 'The link that was read.',
    }),
  }),
  output: Schema.Void,
});

// src/operations/mark-read.ts
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { StashedLink } from '../types/StashedLink.ts';
import { MarkRead } from '../types/StashedLinkOperation.ts';

const handler: Operation.WithHandler<typeof MarkRead> = MarkRead.pipe(
  Operation.withHandler(({ link: ref }) =>
    Effect.gen(function* () {
      // The assistant passes a reference by id, so look it up in the space.
      const link = yield* Database.resolve(ref, StashedLink);
      Obj.update(link, (link) => {
        link.read = true;
      });
    }),
  ),
);

export default handler;

// src/capabilities/operation-handler.ts
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MarkRead } from '../types/StashedLinkOperation.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      Capabilities.OperationHandler,
      OperationHandlerSet.lazy([
        MarkRead.pipe(
          Operation.lazyHandler(() => import('../operations/mark-read.ts')),
        ),
      ]),
    ),
  ),
);
```

A skill gives the operation to the assistant as a tool:

```ts
// src/capabilities/skill-definition.ts
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';

import { MarkRead } from '../types/StashedLinkOperation.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.SkillDefinition, {
      key: 'com.example.skill.stash',
      make: () =>
        Skill.make({
          key: 'com.example.skill.stash',
          name: 'Stash',
          tools: Skill.toolDefinitions({ operations: [MarkRead] }),
          instructions: Template.make({
            source:
              'When the user says they have read a page they stashed, find its ' +
              'link and mark it as read.',
          }),
        }),
    }),
  ),
);
```

The article surface matches any link the person opens, and edits its title, address and note:

```tsx
// src/capabilities/react-surface.ts
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { StashedLinkArticle } from '../containers/StashedLinkArticle.tsx';
import { StashedLink } from '../types/StashedLink.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'article',
        filter: AppSurface.object(AppSurface.Article, StashedLink),
        component: StashedLinkArticle,
        props: ({ role, data: { subject, attendableId } }) => ({
          role,
          subject,
          attendableId,
        }),
      }),
    ),
  ),
);

// src/containers/StashedLinkArticle.tsx
import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

import { type StashedLink } from '../types/StashedLink.ts';

export type StashedLinkArticleProps =
  AppSurface.ObjectArticleProps<StashedLink>;

export const StashedLinkArticle = ({
  role,
  subject,
}: StashedLinkArticleProps) => {
  // A snapshot that re-renders the component when the object changes, here or
  // on another peer.
  const [link] = useObject(subject);

  return (
    <Panel.Root role={role}>
      <Panel.Body asChild>
        <Layout.Flex column gap='sm' classNames='p-2'>
          <Input.Root
            placeholder='Title'
            value={link.title ?? ''}
            onChange={(event) =>
              Obj.update(subject, (subject) => {
                subject.title = event.target.value;
              })
            }
          />
          <Input.Root
            placeholder='https://'
            value={link.url ?? ''}
            onChange={(event) =>
              Obj.update(subject, (subject) => {
                subject.url = event.target.value;
              })
            }
          />
          <Input.Textarea
            placeholder='Why is this worth keeping?'
            value={link.note ?? ''}
            onChange={(event) =>
              Obj.update(subject, (subject) => {
                subject.note = event.target.value;
              })
            }
          />
          <p className='text-description'>
            {link.read ? 'Read' : 'Not read yet'}
          </p>
        </Layout.Flex>
      </Panel.Body>
    </Panel.Root>
  );
};
```

Things to know:

- Read an object you render with `useObject`, which re-renders the component on a field change. Reading
  `subject.note` directly in render does not subscribe, so an update is saved but never shown.
- Write inside `Obj.update`. A write outside it throws.
- An operation that people and the assistant both run is one definition. A person runs it from the app, and the
  skill gives it to the assistant as a tool.
- A type without `UserType` is internal. Composer does not offer it in the create menu or show it in the navigation
  tree.

The learning path builds this plugin one module at a time, with each step running in the inspector.

## Ship a spec

A plugin can ship its spec, a `PLUGIN.mdl` file beside `dx.config.ts`. A `.mdl` spec is a text file that states the
plugin's types, components and features. The registry's detail view then shows **Open Specification**, which renders
the spec with its definitions sidebar.

To ship a spec, make three changes:

1. Name the file in `dx.config.ts`: `spec: 'PLUGIN.mdl'`.
2. Contribute its text from the plugin, so the bundle carries it. The module loads the file only when the spec is
   first opened, and `pluginId` must be the plugin's key. In a plugin with an entry file, add the module there:

   ```tsx
   // src/plugin.tsx
   import * as AppCapability from '@dxos/app-toolkit/AppCapability';

   export default Plugin.define(meta).pipe(
     // ...the plugin's other modules.
     Plugin.addModule(
       AppCapability.pluginAsset({
         pluginId: meta.profile.key,
         path: 'PLUGIN.mdl',
         content: () => import('../PLUGIN.mdl?raw'),
         mimeType: 'application/x-mdl',
       }),
     ),
     Plugin.make,
   );
   ```

   In a plugin that `Plugin.config` defines, such as Stash, add the module to `modules` and give it a body of its
   own:

   ```ts
   // dx.config.ts, in `modules`
   Capability.lazyModule(
     'pluginAsset',
     {
       provides: [AppCapabilities.PluginAsset],
       activatesOn: ActivationEvents.PluginAssetsRequested,
       environments: ['browser', 'tauri'],
     },
     () => import('./src/capabilities/plugin-asset.ts', { with: { type: 'module-url' } }),
   ),
   ```

   The body imports the file and contributes its text:

   ```ts
   // src/capabilities/plugin-asset.ts
   import * as Effect from 'effect/Effect';

   import * as Capability from '@dxos/app-framework/Capability';
   import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

   import content from '../../PLUGIN.mdl?raw';

   export default Capability.makeModule(() =>
     Effect.succeed(
       Capability.contribute(AppCapabilities.PluginAsset, {
         pluginId: 'org.example.plugin.hello',
         path: 'PLUGIN.mdl',
         content,
         mimeType: 'application/x-mdl',
       }),
     ),
   );
   ```

3. Declare Vite's `?raw` imports for `tsc`, since the `tsconfig.json` of the first example loads no ambient types:

   ```ts
   // src/raw.d.ts
   declare module '*?raw' {
     const content: string;
     export default content;
   }
   ```

## Command reference

| Command                         | Purpose                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `dx account signup <code>`      | Redeems an access code to create an account, through your Atmosphere account or email. |
| `dx account login`              | Logs in to your DXOS identity.                                                         |
| `dx account logout`             | Logs out of the current profile.                                                       |
| `dx registry publish --private` | Builds and hosts the bundle, and lists it only to your identity.                       |

Run any command with `--help` for its full set of options.
