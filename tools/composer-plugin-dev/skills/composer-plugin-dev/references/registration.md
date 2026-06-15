# Registering with `composer-app` (in-repo only)

In-repo plugins are bundled into Composer at build time. After creating the plugin under `packages/plugins/plugin-foo/`, register it with the `composer-app` package so it loads at startup.

## Steps

1. Add `@dxos/plugin-foo` to `packages/apps/composer-app/package.json` as a `workspace:*` dependency.
2. Import and register the plugin in `composer-app`'s plugin list (search for an existing plugin name to find the right file).
3. Run `pnpm install` to update the lockfile.
4. `moon run composer-app:serve --quiet` and verify the plugin loads without errors.

## Community plugins

**Skip this entirely.** Community plugins are loaded dynamically by Composer from the registry — see [publishing.md](./publishing.md). There is no source-level registration step.
