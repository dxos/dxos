# Publishing to the community registry

Community plugins are loaded by Composer at runtime from **GitHub releases**. The registry lives at [`dxos/community-plugins`](https://github.com/dxos/community-plugins) and syncs into Composer roughly every 5 minutes.

## End-to-end flow

1. Build the plugin → produces `dist/index.mjs` + sibling chunks/CSS + `dist/manifest.json`.
2. Cut a GitHub Release; attach all `dist/` files as assets.
3. (One-time) PR to [`dxos/community-plugins`](https://github.com/dxos/community-plugins) adding `{ "repo": "owner/repo" }` to `community-plugins.json`.
4. Composer picks up the new version on its next sync.

No further PRs are needed for updates — the registry polls the repo's latest release automatically. Composer shows an **Update** affordance when a newer version exists; users can also roll back via the version picker.

## 1. Set `@dxos/*` versions

Because `@dxos/*` dependencies are externalized by the plugin bundle, the host's copy runs at runtime — your `package.json` version only affects build-time types and APIs. Any version with a compatible API will work; an exact match isn't required.

For now, **use the latest `main` dist-tag** to build against the newest stable APIs:

```sh
npm dist-tag ls @dxos/app-framework
```

> This guidance will be updated when 0.9 ships.

## 2. GitHub Actions release workflow

Use the reusable workflow from [`dxos/community-plugins`](https://github.com/dxos/community-plugins). Add this single file to your plugin repo:

```yaml
# .github/workflows/release.yml
name: Release
on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump'
        required: true
        default: patch
        type: choice
        options: [patch, minor, major]

permissions:
  contents: write

jobs:
  release:
    uses: dxos/community-plugins/.github/workflows/release-plugin.yml@main
    with:
      bump: ${{ inputs.bump }}
    secrets: inherit
```

Trigger it from the **Actions** tab. It handles version bumping, building, committing, tagging, and uploading all `dist/` assets (with the `/`→`+` path encoding the registry service requires for multi-asset bundles).

Pass `node-version` or `pnpm-version` inputs if your project requires specific versions. The full workflow source is at [`dxos/community-plugins/.github/workflows/release-plugin.yml`](https://github.com/dxos/community-plugins/blob/main/.github/workflows/release-plugin.yml).

## 3. Local testing before release

### Dev server (no build needed)

`composerPlugin` serves a dev manifest on port 3967 by default — the same port Composer expects — so no URL configuration is needed:

```sh
pnpm dev
```

In Composer, open **Settings → Plugins** and enable the **Dev plugin** toggle. It persists across reloads.

> **Note:** Fast Refresh does not work cross-origin. Edits are picked up on the next manual page reload.

### Preview build

```sh
pnpm build && pnpm preview
```

Enable the same **Dev plugin** toggle in **Settings → Plugins** to load the preview build.

## 4. Register in the community index

Fork [`dxos/community-plugins`](https://github.com/dxos/community-plugins), add a single entry to `community-plugins.json`:

```json
{
  "plugins": [{ "repo": "dxos/plugin-excalidraw" }, { "repo": "owner/your-plugin" }]
}
```

Open a PR. After it merges, Composer's Community section lists the plugin within ~5 minutes.

## `manifest.json` shape

`composerPlugin` emits this automatically. It lists every asset in `dist/` so the host can cache them for offline use:

```json
{
  "id": "com.example.plugin.foo",
  "name": "Foo",
  "description": "...",
  "author": "...",
  "tags": ["productivity"],
  "icon": "ph--cube--regular",
  "iconHue": "indigo",
  "assets": [
    "assets/foo-abc123.css",
    "chunks/bar-def456.js",
    "index.mjs"
  ]
}
```

## Updating

For each new release:

1. Bump `version` in `package.json`.
2. (If Composer host moved) bump every `@dxos/*` dep to the new dist-tag.
3. Trigger the release workflow from the Actions tab.

No PR to `community-plugins` is needed for updates.

## Inside the dxos monorepo

In-repo plugins ship with Composer itself. There is **no GitHub release, no manifest, no community-plugins PR**. Instead, register the plugin with `composer-app` directly — see [registration.md](./registration.md).
