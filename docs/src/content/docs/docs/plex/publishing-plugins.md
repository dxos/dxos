---
title: Publishing a Plugin
description: Publish a plugin to your private registry, where Composer lists it only to you
sidebar:
  order: 3
---

This guide publishes a plugin to your **private registry**, so it appears in Composer's plugin registry for you on every device. It assumes you already have a working plugin. If you don't, start with the [learning path](/docs/plex/learn/create-plugin/) and use [`plugin-excalidraw`](https://github.com/dxos/plugin-excalidraw) as a reference implementation.

:::note[Public registry]
There is also an experimental public registry, where plugins are published over AT Protocol and listed to everyone. If you'd like to try it, reach out on [Discord](https://dxos.org/discord).
:::

## How the private registry works

DXOS hosts your plugin's bundle and records it against your DXOS identity. Composer lists it in its plugin registry only when you are signed in as that identity, and loads the bundle on demand. Nothing is written to AT Protocol, and no verification is needed. The first release of a plugin key claims it, so no other identity can publish that key privately afterwards.

## Prerequisites

- A built Composer plugin with a `dx.config.ts` (see [Describe your plugin](#3-describe-your-plugin-in-dxconfigts)).
- A **DXOS identity**, the same one you use in Composer.
- The DXOS CLI.

## 1. Install the CLI

```bash
npm install -g @dxos/cli
dx --version
```

## 2. Log in

```bash
dx account login
```

`login` prompts for a method, mirroring Composer's sign-in: `atmosphere` (your Atmosphere account, i.e. Bluesky), `email`, `device-invitation`, or `recovery-code`. Log out with `dx account logout`.

> `dx account login` signs in to an **existing** identity; it doesn't create one. Create your identity in Composer, or run `dx account signup <access-code>` if you have an access code.

A process with no identity of its own, such as a CLI in a sandbox or a CI job, sets an API token in `DX_API_TOKEN` instead. The token is bound to the account that minted it, so the plugin is listed to that account. In Composer, a sandbox gets one from its **Grant account access** action, which mints a token that expires with the sandbox.

## 3. Describe your plugin in `dx.config.ts`

`dx.config.ts` at the root of your plugin package is the **single source of truth** for your plugin's registry metadata. The build reads it to emit the manifest, and `dx registry publish` reads that manifest to publish it.

```ts
import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.excalidraw', // required — a reverse-domain NSID; the plugin's globally-unique key
    name: 'Excalidraw', // required
    description: 'Professional diagramming powered by Excalidraw.',
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
    outputDirectory: 'dist', // where the build emits manifest.json
  },
});
```

> Import `Config2` from `@dxos/app-framework/config`, not from `@dxos/app-framework`. The `/config` subpath is a lightweight entry point with no heavy transitive dependencies — the main entry pulls in the full UI framework which is not needed at build/publish time.

Field reference for `plugin`:

| Field         | Required | Notes                                                                                                                                   |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `key`         | yes      | Reverse-domain NSID (e.g. `org.dxos.plugin.excalidraw`) whose last segment is camelCase — no hyphens. The plugin's globally-unique key. |
| `name`        | yes      | Human-readable name shown in the registry.                                                                                              |
| `description` | no       | Short description shown on the plugin's detail view.                                                                                    |
| `author`      | no       | Author or organization name.                                                                                                            |
| `icon`        | no       | `{ key, hue? }` — a [Phosphor](https://phosphoricons.com) icon name and optional display hue, e.g. `indigo`.                            |
| `source`      | no       | Source repository URL.                                                                                                                  |
| `homePage`    | no       | Homepage URL.                                                                                                                           |
| `tags`        | no       | List of tags for categorization/discovery.                                                                                              |
| `screenshots` | no       | Preview images for the plugin's detail view. Each entry is a `{ light?, dark? }` record of theme-specific URLs.                         |
| `spec`        | no       | Path of the plugin's `.mdl` spec inside the package, e.g. `PLUGIN.mdl`. See [Ship a spec](#ship-a-spec).                                |

Field reference for `publish`:

| Field             | Required | Notes                                                                                                                                      |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `buildCommand`    | no       | Build command run by `dx registry publish` (skipped with `--no-build`); unset or `vite build` runs the project's Vite in the `dx` process. |
| `outputDirectory` | no       | Directory the build emits into (must contain `manifest.json`). Defaults to `dist`.                                                         |

The release **version is taken from your `package.json` `version` field**, not from `dx.config.ts`. Bump it before publishing a new release.

Wire `composerPlugin` into your `vite.config.ts` so the build emits the manifest:

```ts
import { composerPlugin } from '@dxos/app-framework/vite-plugin';

export default defineConfig({
  plugins: [
    ...composerPlugin({ entry: 'src/MyPlugin.tsx' }),
    // ...react(), etc.
  ],
});
```

> Pin every `@dxos/*` dependency to the **same version** the Composer host runs, and bump them in lockstep. A plugin built against mismatched framework versions can fail to load.

## 4. Publish

From your plugin directory:

```bash
dx registry publish --private
```

This will:

1. Build the bundle (skip with `--no-build` to publish a pre-built `dist`): with no `buildCommand`, or `vite build`, `dx` loads the Vite your project installs and runs it in its own process, so neither node nor a separate Vite process is needed; any other `buildCommand` runs in a shell.
2. Read the emitted `manifest.json`.
3. Upload the bundle to DXOS and record it against your identity.

Useful flags:

| Flag               | Purpose                                                                            |
| ------------------ | ---------------------------------------------------------------------------------- |
| `--dir <path>`     | Project directory containing `dx.config.ts` (defaults to the current directory).   |
| `--no-build`       | Skip the build and publish the existing `dist`.                                    |
| `--dry-run`        | Build and check the bundle, then stop: nothing is uploaded or recorded.            |
| `--edge-url <url>` | Override the edge used for upload (mainly for local testing against a dev worker). |

## 5. Confirm it's published

The command prints the bundle's URL. Open Composer's plugin registry while signed in as the same identity, and your plugin is listed there. Enable it like any other plugin.

## Updating a plugin

Bump the `version` in `package.json`, then run `dx registry publish --private` again. Each version is published once, so bump the version to ship changes.

## Local development

You don't need to publish to test your plugin against Composer. Composer loads a plugin from the URL of its
**`manifest.json`**, so anything that serves a manifest and the entry module it names can be loaded. There are
two ways to do it.

### From your plugin's dev server

This is the loop to use while you work on a plugin. [Run it in Composer](/docs/plex/learn/run-in-composer/) walks
through it: run `vite` in the plugin's directory, then enable it under **Dev Server** in Composer's Plugins settings.

- **It is never installed.** A dev plugin is not saved in your profile or in the offline cache. If the dev
  server is down at boot, Composer logs a warning, shows it under Dev Server, and tries again on the next
  reload.
- **It can stand in for an installed plugin.** When your `dx.config.ts` key matches a plugin you already have,
  from the registry or built in, the dev plugin takes its place for the session. Disable restores the original.
- **React fast refresh does not reach it.** It is served from another origin, so reload the app rather than
  waiting for a hot update.

### From a built bundle

Build the plugin (see [the example](#example-a-plugin-with-its-own-navtree-group)) and serve its `dist`
directory, which contains `manifest.json` and `index.mjs`, with CORS if it is on another origin. In Composer,
open **Plugins**, click **Load from URL** (the cloud icon in the Plugins header) and paste the manifest URL.
Unlike a dev plugin, a plugin loaded this way is installed: it stays in your profile and its files are cached
for offline use.

The URL must point at the manifest, not at a source file: the loader fetches the manifest first and imports
the entry it names.

### With an assistant

To have the assistant build one for you, create a project from the **Composer Plugin** template in the Composer
desktop app, with the Sandbox plugin on. Its parent task and four subtasks walk a chat through building a plugin
in a sandbox on your computer, from fetching this guide to the load prompt; assign them to the agent to start
it.

In a browser, the template comes from the Dev Shell plugin and needs a Composer served locally by
`vite preview`. There the chat writes the files and checks them against the plugin's dev server. The assistant
cannot keep a dev server running, so start it yourself once the chat asks, from the Composer app directory, with
`node_modules/.bin/vite` and the folder the chat names. When the chat says the plugin is ready, turn on **Dev
Server** as above.

The **Composer Plugin (Sandbox)** template, contributed by the Sandbox plugin, runs the same example against any
bundled Composer, deployed ones included: the agent builds in an [EDGE](/docs/edge/concepts/compute/) sandbox with `@dxos/*` installed from
[pkg.pr.new](https://pkg.pr.new) at the commit the app was built from, serves `dist/` from the container, and
offers the manifest URL of the port it exposed.

> Both ways need a **bundled build** of Composer (`vite build` + `vite preview`, or a deployed app). A bundled
> Composer publishes an import map that resolves your plugin's bare `@dxos/*`, `react` and `effect` imports to
> the host's own copies; Composer's own Vite dev server has no import map, so those imports fail there.

### Example: a plugin with its own navtree group

A small plugin in TypeScript that adds a group to every space's navtree, with one page under it, opened as an
article. It builds with the official tooling into a `manifest.json` and an `index.mjs` that Composer loads by URL.

Four files:

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

```json
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
    "types": []
  },
  "include": ["src", "dx.config.ts"]
}
```

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

A `package.json` beside them names what the build needs. Pin every `@dxos/*` package to the build of the
Composer you load the plugin into: a release's npm version, or for a build of an unreleased commit of `main`,
its pkg.pr.new build (`https://pkg.pr.new/@dxos/<package>@<commit>`). `react`, `react-dom` and `effect` are
the host's own copies at runtime, so match its versions too:

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

Bun alone does too, with no node on the machine: `bunx @pnpm/exe@10 install` (with `node-version=24.11.1` in
an `.npmrc`, or pnpm skips the bundler's native binary), then `bun run --bun tsc -p tsconfig.json` and
`bun run --bun vite build`. That is how the desktop app's Composer Plugin project template builds, in a
sandbox that holds nothing else.

Serve `dist/` (with CORS, if it is on another origin) and load `<URL of dist>/manifest.json`. After it loads,
each space's navtree shows a HELLO group with a Hello page under it; selecting the page opens it. The version
in the manifest comes from a `package.json` next to `dx.config.ts`, or `0.0.0` without one.

Things to know:

- A plugin can also be defined entirely in `dx.config.ts` with `Plugin.config({ plugin, modules })`, the way
  plugins inside the DXOS repository are, naming each module body with
  `import('./src/capabilities/x.ts', { with: { type: 'module-url' } })`. When `dx.config.ts` defines the plugin,
  `composerPlugin` builds from it instead of `src/plugin.tsx` and turns it into a static manifest whose module
  bodies are chunks of the bundle; the `Plugin.define(meta).pipe(...)` layout shown here keeps working.
- Import only packages the host shares through its import map — the `@dxos/*` libraries and `react`,
  `react-dom` and `effect`; the build leaves those as bare imports. `@dxos/plugin-*` packages are not shared,
  so the build bundles whatever you use from them.
- Ids are camelCase: the key's last segment (`org.example.plugin.helloWorld`, not `…hello-world`), module ids,
  graph extension ids, node ids and surface ids. A hyphenated key makes the module throw `Invalid DXN` when it
  is imported; a hyphenated extension or surface id is dropped without an error.
- `AppGraphBuilder.createExtension` returns an `Effect`: `yield*` it and contribute the extensions it yields.
- A group is a heading, not a page: it has no URL binding and shows only once something is under it. Its
  `position` orders it among the built-in groups (content 200, system 900).
- A `singleton` page's node id must equal its URL `key`, and `path` names the group it sits under.
- Every module lists the capabilities its `activate` returns in `provides`.
- A plugin that fails to activate is disabled; fix it and re-enable it from the Plugins list (or reload).
- The browser caches a module that failed to import, so reload Composer before loading a fixed copy from the
  same URL.

### Example: data, an operation and another plugin's menu

Stash, the plugin the [learning path](/docs/plex/learn/the-plex-plugin/) builds, stores an ECHO type in the space, adds
itself to the Space plugin's create menu, shows each link in an article, and marks links as read with an operation that
people and the assistant both run. It is defined entirely in `dx.config.ts`, with one file per module body:

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

The type, with the annotations Composer reads: the field that labels a link, its icon, and `UserType`, which puts
it in pickers and the navigation tree. The schema module registers it, so the space can store it:

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

The create menu belongs to the Space plugin. It lists every `CreateObjectEntry` contribution, so Stash contributes
one; the space shows its form, built from the type's fields, and calls `createObject` with what the person typed:

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

The operation is defined once, with a schema for its input and output, and its handler loads only when it first runs:

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

The article surface matches any link the person opens, and edits its title and note:

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

- Read an object you render with `useObject`: it re-renders on a field change. Reading `subject.note` directly in
  render does not subscribe, so an update is saved but never shown.
- Write inside `Obj.update`; a write outside it throws.
- An operation that people and the assistant both run is one definition: a person runs it from the app, and
  the skill gives it to the assistant as a tool.
- A type without `UserType` is internal: Composer does not offer it in the create menu or show it in the
  navigation tree.

The [learning path](/docs/plex/learn/the-plex-plugin/) builds this plugin one module at a time, with each step running in
the inspector.

### Ship a spec

A plugin can carry its `.mdl` spec (a `PLUGIN.mdl` beside `dx.config.ts`). The registry's detail view then shows
**Open Specification**, which renders the spec with its definitions sidebar. It takes three changes:

1. Name the file in `dx.config.ts`: `spec: 'PLUGIN.mdl'`.
2. Contribute its text from the plugin, so the bundle carries it. The module loads the file only when the spec is
   first opened, and `pluginId` must be the plugin's key:

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

   When `dx.config.ts` defines the plugin with `Plugin.config`, add the module to its `modules` and give it a body
   of its own:

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

3. Declare Vite's `?raw` imports for `tsc`, since the example `tsconfig.json` loads no ambient types:

   ```ts
   // src/raw.d.ts
   declare module '*?raw' {
     const content: string;
     export default content;
   }
   ```

## Command reference

| Command                         | Purpose                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `dx account signup <code>`      | Redeem an access code to create an account, via your Atmosphere account or email. |
| `dx account login`              | Log in to your DXOS identity.                                                     |
| `dx account logout`             | Log out of the current profile.                                                   |
| `dx registry publish --private` | Build and host the bundle, and list it only to your identity.                     |

Run any command with `--help` for its full set of options.
