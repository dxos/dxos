---
title: Publishing a Plugin
description: Publish a community plugin to the DXOS registry over AT Protocol
sidebar:
  order: 3
---

:::caution[Experimental]
The plugin registry and all `dx registry` commands are experimental. The record format, CLI interface, and bundle hosting are subject to change without notice.
:::

This guide shows how to publish a community plugin so it appears in Composer's plugin registry. It assumes you already have a working plugin — if you don't, start with the [Plugin Tutorial](/docs/composer/tutorial) and use [`plugin-excalidraw`](https://github.com/dxos/plugin-excalidraw) as a reference implementation.

## How the registry works

The DXOS registry is **AT Protocol-native**. You don't submit your plugin to a central database — instead, you publish records to **your own** AT Protocol repository (your PDS), and the DXOS registry indexes them:

1. You publish a small set of `org.dxos.experimental.*` records (a publisher profile, a package profile, and one release per version) to your PDS using the `dx` CLI.
2. The registry's indexer ingests those records from the AT Protocol firehose and serves them to Composer.
3. Composer lists your plugin in its registry and loads the bundle on demand.

Because the records live in your own repo, you remain in control of them — updating or removing a plugin is just a record write or delete on your side.

**Discovery is gated by verification.** The indexer only surfaces plugins from publishers that DXOS has vouched for. This keeps the registry curated. You request verification once (see [Get verified](#3-get-verified)); after that you can publish and update plugins freely.

## Prerequisites

- A built Composer plugin with a `dx.config.ts` (see [Describe your plugin](#5-describe-your-plugin-in-dxconfigts)).
- A **DXOS identity** with a connected **AT Protocol account** (e.g. a [Bluesky](https://bsky.app) handle) — the same identity you use in Composer. Or, for headless use, an AT Protocol handle and an **app password**.
- The DXOS CLI.

## 1. Install the CLI

```bash
npm install -g @dxos/cli
dx --version
```

## 2. Authenticate

A **Composer account is required** in both cases below — publishing writes to your AT Protocol repo and uploads your bundle to DXOS-hosted storage, both of which are tied to a DXOS identity. The two options differ only in how you supply your AT Protocol credentials.

### Option A — Log in (recommended)

If your Composer account has a **connected AT Protocol account** (Bluesky), log in:

```bash
dx account login
```

`login` prompts for a method, mirroring Composer's sign-in: `atmosphere` (your Atmosphere account, i.e. Bluesky), `email`, `device-invitation`, or `recovery-code`. You can also pass them directly, e.g. `dx account login --method atmosphere alice.bsky.social`.

Once logged in, `dx registry` commands sign your PDS writes through DXOS edge using the AT Protocol account connected to your identity — no app password needed. If you signed up for Composer with Bluesky it's already connected; otherwise connect one with `dx integration add` (or from Composer's settings). Log out with `dx account logout`.

> `dx account login` signs in to an **existing** identity — it doesn't create one. Create your identity in Composer, or run `dx account signup <access-code>` if you have an access code (it takes the same `--method atmosphere` / `--method email` choice).

### Option B — App password

If your Composer account does **not** have a connected AT Protocol account, supply your AT Protocol credentials directly via an **app password** (not your account password — create one at [bsky.app/settings/app-passwords](https://bsky.app/settings/app-passwords)):

```bash
dx account login  # log in to your Composer account first
export ATPROTO_HANDLE=alice.bsky.social
export ATPROTO_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Every `dx registry` command also accepts `--handle` and `--app-password` explicitly. Explicit credentials take precedence over the connected AT Protocol account on your identity.

## 3. Get verified

So that your plugin is discoverable, ask the DXOS team to verify your publisher identity. Reach out on the [DXOS Discord](https://dxos.org/discord) (or by email if you have a contact) with:

- Your AT Protocol **handle** (or DID).
- A short description of the plugin(s) you intend to publish.

A DXOS verifier attests to your identity by writing a verification record for your DID. You only need to do this once — subsequent plugins and version updates from the same identity are picked up automatically.

You can publish your records before being verified; they simply won't appear in Composer until verification is in place.

## 4. Publish your publisher profile

Publish the profile that represents you (or your organization) in the registry:

```bash
dx registry publish-publisher \
  --display-name "Alice" \
  --bio "Building diagramming tools for Composer." \
  --homepage-url https://example.com \
  --contact alice@example.com
```

Only `--display-name` is required; the rest are optional.

## 5. Describe your plugin in `dx.config.ts`

`dx.config.ts` at the root of your plugin package is the **single source of truth** for your plugin's registry metadata. The build reads it to emit the manifest, and `dx registry publish` reads that manifest to write your records.

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
    outdir: 'dist', // where the build emits manifest.json
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

Field reference for `publish`:

| Field          | Required | Notes                                                                              |
| -------------- | -------- | ---------------------------------------------------------------------------------- |
| `buildCommand` | no       | Build command run by `dx registry publish` (skipped with `--no-build`).            |
| `outdir`       | no       | Directory the build emits into (must contain `manifest.json`). Defaults to `dist`. |
| `assetBaseUrl` | no       | Skip the upload and point the release at a bundle you host yourself.               |

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

## 6. Publish

From your plugin directory:

```bash
dx registry publish
```

This will:

1. Run your `build.command` (skip with `--no-build` to publish a pre-built `dist`).
2. Read the emitted `manifest.json`.
3. Upload the bundle to the DXOS edge and record the resulting `moduleUrl`.
4. Write a `package.profile` record and a `package.release` record (rkey `<key>:<version>`) to your PDS.

Useful flags:

| Flag                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `--dir <path>`           | Project directory containing `dx.config.ts` (defaults to the current directory).   |
| `--no-build`             | Skip the build and publish the existing `dist`.                                    |
| `--asset-base-url <url>` | Skip the upload and point the release at a bundle you host yourself.               |
| `--edge-url <url>`       | Override the edge used for upload (mainly for local testing against a dev worker). |

## 7. Confirm it's published

List the records now on your repo:

```bash
dx registry records
```

You should see your `publisher.profile`, the `package.profile`, and a `package.release`. Once your identity is verified, the plugin appears in Composer's registry within a few minutes (the indexer refreshes periodically). Open Composer's plugin registry and look for your plugin.

## Updating a plugin

Bump the `version` in `package.json`, then run `dx registry publish` again. Each version is published once — the hosted bundle for a version is immutable (re-publishing an existing version is rejected), so bump the version to ship changes. Users can install the latest.

## Removing a plugin

```bash
dx registry unpublish --key org.dxos.plugin.excalidraw
```

This removes the package profile and all of its release records from your PDS. The registry stops listing it on the next refresh.

## Local development

You don't need to publish to test your plugin against Composer. Composer loads a plugin from the URL of its
**`manifest.json`**, so anything that serves a manifest and the entry module it names can be loaded:

1. Serve the plugin. Either run your plugin's Vite dev server — `composerPlugin` serves a dev manifest at
   `/manifest.json` (e.g. `http://localhost:3967/manifest.json`) — or serve a built `dist` directory, which
   contains `manifest.json` and `index.mjs`.
2. In Composer, open **Plugins**, click **Load from URL** (the cloud icon in the Plugins header) and paste
   the manifest URL. An assistant that has built a plugin offers the same step inline: it shows a prompt with
   the manifest URL, and the plugin loads when you click **Load plugin**.

The URL must point at the manifest, not at a source file: the loader fetches the manifest first and imports
the entry it names.

To have the assistant build one for you, create a project from the **Composer Plugin** template (contributed
by the Coding (Dev) plugin) in a Composer served locally by `vite preview`. Its parent task and four subtasks
walk a chat through the example below, from writing the files to the load prompt; assign them to the agent to
start it.

> Loading by URL works against a **bundled build** of Composer (`vite build` + `vite preview`, or a deployed
> app). A bundled Composer publishes an import map that resolves your plugin's bare `@dxos/*`, `react` and
> `effect` imports to the host's own copies; Composer's own Vite dev server has no import map, so those
> imports fail there.

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
import { Surface } from '@dxos/app-framework/ui';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { AppSurface } from '@dxos/app-toolkit/ui';

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

Typecheck, then build, from the plugin's directory:

```bash
tsc -p tsconfig.json   # vite does not typecheck
vite build             # writes dist/manifest.json and dist/index.mjs
```

Serve `dist/` (with CORS, if it is on another origin) and load `<URL of dist>/manifest.json`. After it loads,
each space's navtree shows a HELLO group with a Hello page under it; selecting the page opens it. The version
in the manifest comes from a `package.json` next to `dx.config.ts`, or `0.0.0` without one.

Things to know:

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

### Example: data, a form and another plugin's surface

The same plugin grows an ECHO type stored in the space, a form that edits it, and a map drawn by another plugin
that follows what the reader selects. The rest of the plugin (navtree group, page, surface) is as above.

Depend on the plugin whose surface you render; enabling yours then enables it too:

```ts
// dx.config.ts
export default Config2.make({
  plugin: {
    key: 'org.example.plugin.worldClock',
    name: 'World Clock',
    icon: { key: 'ph--globe-hemisphere-west--regular', hue: 'sky' },
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.map'],
  },
});
```

Register the type in the pipe, before the other modules, so the space can store it:

```tsx
Plugin.addModule(AppCapability.schema([Clock])),
```

A page that needs the space carries it in the node's `data`, and the surface narrows on it:

```tsx
AppGraphNode.make({ id: PAGE, type: `${meta.profile.key}.page`, data: { type: PAGE, space }, properties: { ... } });

Surface.create({
  id: 'worldClockArticle',
  filter: AppSurface.subject(AppSurface.Article, isPage),
  component: WorldClockArticle,
  props: ({ data: { subject } }) => ({ db: subject.space.db }),
});
```

Things to know:

- `useQuery` re-renders when the set of objects changes, not when a field of one changes; subscribe to the fields
  you render with `useObject`, or an update is saved but never shown.
- Create the object on the first change, not in an effect on first view: the query is empty until it has loaded,
  so an effect that creates when it finds nothing creates a duplicate on every visit.
- A form is a schema; a `Schema.Literals` field renders as a select.
- Render another plugin's surface by its role; the data is the surface's input. plugin-map's `World` role draws
  the world with `markers` on it, flat (`view: 'map'`) or as a globe the reader can toggle to. Give it the object
  as `subject`: the marker whose id is selected under that object's URI is highlighted, and the globe turns to it.
- Select with `LayoutOperation.Select` (context id: the object's URI), and read the selection with
  `useSelection`, so the map and your own view agree on what is selected.
- `timezones` from `@dxos/react-ui-geo/data` gives each IANA zone its principal city's position.
- Give the map a sized box: it fills its parent, so a parent with no height draws nothing.

The imports and the article, put together. Every card has one fixed size, so opening the form moves nothing; the
map fills the page above the row of clocks, which scrolls sideways in a thin scroll area:

```tsx
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Database, DXN, Filter, Obj, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { IconButton, ScrollArea } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { timezones } from '@dxos/react-ui-geo/data';
import * as MapRole from '@dxos/plugin-map/MapRole';

// The type: one Clock per space, holding its clocks, each a timezone and where it is on the map.
const Location = Schema.Struct({ lat: Schema.Number, lng: Schema.Number });
const ClockEntry = Schema.Struct({
  timezone: Schema.String,
  location: Schema.optional(Location),
});
type ClockEntry = Schema.Schema.Type<typeof ClockEntry>;

export class Clock extends Type.makeObject<Clock>(
  DXN.make('org.example.type.worldClock', '0.2.0'),
)(Schema.Struct({ clocks: Schema.optional(Schema.Array(ClockEntry)) })) {}

type Page = { type: typeof PAGE; space: { db: Database.Database } };
const isPage = (data: unknown): data is Page =>
  typeof data === 'object' &&
  data !== null &&
  'type' in data &&
  data.type === PAGE;

// A timezone's position is its principal city, from the tz database; a zone it does not list has no pin.
const makeEntry = (timezone: string): ClockEntry => ({
  timezone,
  location: timezones[timezone],
});

const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(timer);
  }, []);
  return now;
};

// Every card has one fixed size, so the empty card lines up with the clocks and opening its form moves nothing.
const CARD: React.CSSProperties = {
  boxSizing: 'border-box',
  position: 'relative',
  flex: 'none',
  width: 240,
  height: 176,
  padding: 16,
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, currentColor 25%, transparent)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

// 24-hour and zero-padded, so every clock is the same width.
const TIME: Intl.DateTimeFormatOptions = {
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

type ClockCardProps = {
  timeZone: string;
  now: Date;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

const ClockCard = ({
  timeZone,
  now,
  selected,
  onSelect,
  onDelete,
}: ClockCardProps) => (
  <div
    data-testid='worldClock.clock'
    aria-selected={selected}
    style={{
      ...CARD,
      cursor: 'pointer',
      ...(selected && { borderColor: 'rgb(14, 165, 233)' }),
    }}
    onClick={onSelect}
  >
    <div style={{ opacity: 0.7 }}>
      {now.toLocaleDateString(undefined, { timeZone, dateStyle: 'medium' })}
    </div>
    <div style={{ fontSize: '2rem', fontVariantNumeric: 'tabular-nums' }}>
      {now.toLocaleTimeString(undefined, { timeZone, ...TIME })}
    </div>
    <div style={{ opacity: 0.7 }}>{timeZone}</div>
    {/* Last, so it paints above the text it overlaps. */}
    <div style={{ position: 'absolute', top: 4, right: 4 }}>
      <IconButton
        data-testid='worldClock.delete'
        variant='ghost'
        icon='ph--x--regular'
        iconOnly
        label='Delete clock'
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      />
    </div>
  </div>
);

// The choices are the zones with a known position, so every clock added gets a pin.
const TimezoneForm = Schema.Struct({
  timezone: Schema.Literals(Object.keys(timezones)).annotate({
    title: 'Timezone',
  }),
});

const AddClock = ({ onAdd }: { onAdd: (timeZone: string) => void }) => {
  const [adding, setAdding] = useState(false);
  return (
    <div
      data-testid='worldClock.new'
      style={{
        ...CARD,
        borderStyle: 'dashed',
        alignItems: adding ? 'stretch' : 'center',
      }}
    >
      {adding ? (
        <Form.Root
          schema={TimezoneForm}
          onSave={({ timezone }) => {
            onAdd(timezone);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        >
          <Form.Content>
            <Form.Fields />
            <Form.Actions />
          </Form.Content>
        </Form.Root>
      ) : (
        <IconButton
          data-testid='worldClock.add'
          variant='ghost'
          icon='ph--plus--regular'
          iconOnly
          size={8}
          label='Add clock'
          onClick={() => setAdding(true)}
        />
      )}
    </div>
  );
};

const WorldClockArticle = ({ db }: { db?: Database.Database }) => {
  const now = useNow();
  const { invokePromise } = useOperationInvoker();
  const [clock] = useQuery(db, Filter.type(Clock));
  // `useQuery` re-renders when the set of objects changes; `useObject` is what re-renders on a field change.
  const [stored] = useObject(clock, 'clocks');
  const clocks = stored ?? [makeEntry(localZone())];
  // The selection lives in the view state under the clock's URI, where the map surface reads it.
  const contextId = clock ? Obj.getURI(clock) : undefined;
  const selected = useSelection(contextId, 'single');
  const select = (timezone: string) =>
    contextId &&
    void invokePromise(LayoutOperation.Select, {
      contextId,
      subject: { mode: 'single', id: timezone },
    });

  // Created on the first change rather than on first view: the query is empty until it has loaded.
  const save = (next: ClockEntry[]) => {
    if (clock) {
      Obj.update(clock, (clock) => {
        clock.clocks = next;
      });
    } else {
      db?.add(Obj.make(Clock, { clocks: next }));
    }
  };
  const add = (timezone: string) =>
    !clocks.some((entry) => entry.timezone === timezone) &&
    save([...clocks, makeEntry(timezone)]);
  const remove = (timezone: string) =>
    save(clocks.filter((entry) => entry.timezone !== timezone));

  // West to east, so the row reads left to right like the map; a clock with no position goes last.
  const sorted = [...clocks].sort(
    (left, right) =>
      (left.location?.lng ?? Number.POSITIVE_INFINITY) -
      (right.location?.lng ?? Number.POSITIVE_INFINITY),
  );

  const markers = clocks.flatMap(({ timezone, location }) =>
    location ? [{ id: timezone, title: timezone, location }] : [],
  );

  return (
    // The map fills the page above the row of clocks, which scrolls sideways when it outgrows the width.
    // A grid rather than a flex column: the scroll area expands to fill whatever cell it is in.
    <div
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) min-content',
      }}
    >
      <div style={{ minHeight: 0 }}>
        <Surface.Surface
          type={MapRole.World}
          data={{ markers, subject: clock, view: 'map' }}
          limit={1}
        />
      </div>
      <ScrollArea.Root orientation='horizontal' thin>
        <ScrollArea.Viewport>
          <div style={{ display: 'flex', gap: 16, padding: 16 }}>
            {sorted.map(({ timezone }) => (
              <ClockCard
                key={timezone}
                timeZone={timezone}
                now={now}
                selected={timezone === selected}
                onSelect={() => select(timezone)}
                onDelete={() => remove(timezone)}
              />
            ))}
            <AddClock onAdd={add} />
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};
```

## Command reference

| Command                         | Purpose                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `dx account signup <code>`      | Redeem an access code to create an account, via your Atmosphere account or email.          |
| `dx account login`              | Log in to your DXOS identity; registry writes then use its connected AT Protocol account.  |
| `dx account logout`             | Log out of the current profile.                                                            |
| `dx registry publish`           | Build from `dx.config.ts`, host the bundle, and write profile + release records.           |
| `dx registry publish-publisher` | Write your `publisher.profile` record.                                                     |
| `dx registry publish-package`   | Low-level alternative to `publish`: write profile + release records from flags (no build). |
| `dx registry unpublish`         | Remove a package (profile + all releases) from your repo.                                  |
| `dx registry records`           | List the `org.dxos.experimental.*` records on your repo.                                   |

Run any command with `--help` for its full set of options.

## Reference: record types

The CLI writes these AT Protocol record types under your repo:

| NSID                                           | Purpose                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `org.dxos.experimental.publisher.profile`      | Your publisher identity (rkey `self`).                                               |
| `org.dxos.experimental.publisher.verification` | Trust attestation for a publisher DID (written by the configured verifier, not you). |
| `org.dxos.experimental.package.profile`        | A plugin's profile (rkey = the plugin `key`).                                        |
| `org.dxos.experimental.package.release`        | A specific version of a plugin (rkey `<key>:<version>`).                             |
