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

`login` prompts for a method, mirroring Composer's sign-in: `atproto` (Bluesky), `email`, `device-invitation`, or `recovery-code`. You can also pass them directly, e.g. `dx account login --method atproto alice.bsky.social`.

Once logged in, `dx registry` commands sign your PDS writes through DXOS edge using the AT Protocol account connected to your identity — no app password needed. If you signed up for Composer with Bluesky it's already connected; otherwise connect one with `dx integration add` (or from Composer's settings). Log out with `dx account logout`.

> `dx account login` signs in to an **existing** identity — it doesn't create one. Create your identity in Composer first.

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

| Field         | Required | Notes                                                                                                           |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `key`         | yes      | Reverse-domain NSID (e.g. `org.dxos.plugin.excalidraw`). The plugin's globally-unique key.                      |
| `name`        | yes      | Human-readable name shown in the registry.                                                                      |
| `description` | no       | Short description shown on the plugin's detail view.                                                            |
| `author`      | no       | Author or organization name.                                                                                    |
| `icon`        | no       | `{ key, hue? }` — a [Phosphor](https://phosphoricons.com) icon name and optional display hue, e.g. `indigo`.    |
| `source`      | no       | Source repository URL.                                                                                          |
| `homePage`    | no       | Homepage URL.                                                                                                   |
| `tags`        | no       | List of tags for categorization/discovery.                                                                      |
| `screenshots` | no       | Preview images for the plugin's detail view. Each entry is a `{ light?, dark? }` record of theme-specific URLs. |

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

You don't need to publish to test your plugin against Composer. Run your plugin's Vite dev server and load it by URL:

1. Start your dev server (e.g. `vite`) — note the port.
2. In Composer, open **Settings → Plugins → Load by URL** and point it at your dev server's plugin entry (e.g. `http://localhost:5173/src/MyPlugin.tsx`).

> Loading by URL works against a **bundled build** of Composer. It does not work when running Composer from its own Vite dev server.

## Command reference

| Command                         | Purpose                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
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
