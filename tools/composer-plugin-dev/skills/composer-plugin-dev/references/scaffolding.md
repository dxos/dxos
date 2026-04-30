# Scaffolding a community plugin

A community plugin lives in **its own GitHub repo** and ships a single bundled module. The fastest start is to clone [`dxos/plugin-excalidraw`](https://github.com/dxos/plugin-excalidraw) and rename.

## Minimum files

```text
my-plugin/
  package.json
  vite.config.ts          # composerPlugin({ entry: 'src/plugin.tsx', meta })
  vitest.config.ts
  tsconfig.json
  .github/workflows/release.yml
  src/
    plugin.tsx            # Plugin.define(meta).pipe(...)
    meta.ts               # Plugin.Meta — id, name, description, icon, iconHue
    translations.ts
    capabilities/
      index.ts            # Capability.lazy(...) only
      react-surface.tsx
    containers/
      index.ts            # lazy(() => import('./X'))
      MyArticle/
        index.ts          # default export bridge
        MyArticle.tsx
    components/
      index.ts
    types/
      index.ts            # export * as Foo from './Foo';
      Foo.ts
    operations/
      index.ts
      definitions.ts
    blueprints/
      index.ts
      my-blueprint.ts
```

## Skeleton order

Build the smallest thing that runs, then add features:

1. `package.json` with `"private": true`, deps pinned to the **Composer host's main dist-tag** (e.g. `0.8.4-main.fcfe5033a5`).
2. `vite.config.ts` with `composerPlugin`, `react()`, `wasm()`.
3. `src/meta.ts` — id namespaced (e.g. `com.example.plugin.foo`), icon (Phosphor `ph--*--regular`), `iconHue`, `description`, `source`.
4. `src/types/Foo.ts` — one ECHO type with `make()` factory.
5. `src/translations.ts` — typename labels and `meta.id` plugin strings.
6. `src/capabilities/react-surface.tsx` — one `article` surface.
7. `src/containers/FooArticle/` — minimal `Panel.Root` shell.
8. `src/plugin.tsx` — `Plugin.define(meta).pipe(addSchemaModule, addSurfaceModule, addTranslationsModule, Plugin.make)`.

Build, then load the dev URL into Composer (Settings → Plugins → Load by URL). Iterate. Add operations, blueprints, settings as features land.

## Inside the dxos monorepo

- Live in `packages/plugins/plugin-foo/`.
- `package.json` deps are `workspace:*` for `@dxos/*` and `catalog:` for everything else.
- No `vite.config.ts`; build is driven by `moon.yml` with one `--entryPoint` per `exports` subpath.
- The plugin file is named after the plugin (e.g. `FooPlugin.tsx`), not `plugin.tsx`.
- Add a `PLUGIN.mdl` spec **before** writing code — see [specification.md](./specification.md).
- Register with `composer-app` — see [registration.md](./registration.md).
- New packages **must** include `"private": true` in `package.json`.
