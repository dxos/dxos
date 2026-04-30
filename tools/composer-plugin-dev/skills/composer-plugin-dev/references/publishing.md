# Publishing to the community registry

Community plugins are loaded by Composer at runtime from **GitHub releases**. The registry lives at [`dxos/community-plugins`](https://github.com/dxos/community-plugins) and syncs into Composer roughly every 5 minutes.

## End-to-end flow

1. Build the plugin → produces `dist/plugin.mjs` + `dist/manifest.json`.
2. Cut a GitHub Release; attach both files as assets.
3. (One-time) PR to [`dxos/community-plugins`](https://github.com/dxos/community-plugins) adding `{ "repo": "owner/repo" }` to `community-plugins.json`.
4. Composer picks up the new version on its next sync.

## 1. Pin `@dxos/*` to the Composer host

Find the Composer host's main dist-tag (e.g. `0.8.4-main.fcfe5033a5`) and pin **all** `@dxos/*` deps to it:

```sh
npm dist-tag ls @dxos/app-framework
```

Bump these in lockstep when Composer releases — see Excalidraw's release workflow for an automated bump.

## 2. GitHub Actions release workflow

Adapt this from [`dxos/plugin-excalidraw`](https://github.com/dxos/plugin-excalidraw)'s `.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags: ['v*']
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            dist/plugin.mjs
            dist/manifest.json
```

Tag a release: `git tag v0.1.0 && git push origin v0.1.0` (push the single tag — avoid `git push --tags` so unrelated local tags don't trigger releases). The workflow attaches the assets.

## 3. Local testing before release

In Composer: **Settings → Plugins → Load by URL** → point at your local `manifest.json` (e.g. via `pnpm preview`). This avoids round-tripping through GitHub for every change.

## 4. Register in the community index

Fork [`dxos/community-plugins`](https://github.com/dxos/community-plugins), add a single entry to `community-plugins.json`:

```json
{
  "plugins": [{ "repo": "dxos/plugin-excalidraw" }, { "repo": "dxos/plugin-youtube" }, { "repo": "owner/your-plugin" }]
}
```

Open a PR. After it merges, Composer's Community section lists the plugin within ~5 minutes.

## `manifest.json` shape

`composerPlugin` emits this for you. It should look like:

```json
{
  "id": "com.example.plugin.foo",
  "name": "Foo",
  "description": "...",
  "icon": "ph--cube--regular",
  "iconHue": "indigo",
  "moduleFile": "plugin.mjs",
  "version": "0.1.0"
}
```

## Updating

For each new release:

1. Bump `version` in `package.json`.
2. (If Composer host moved) bump every `@dxos/*` dep to the new dist-tag.
3. Tag and push; the workflow attaches new assets.
4. Composer picks up the new version automatically — no PR to `community-plugins` needed for updates.

## Inside the dxos monorepo

In-repo plugins ship with Composer itself. There is **no GitHub release, no manifest, no community-plugins PR**. Instead, register the plugin with `composer-app` directly — see [registration.md](./registration.md).
