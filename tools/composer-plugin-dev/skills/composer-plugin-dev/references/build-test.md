# Build & verify

## Community plugin

```sh
pnpm install
pnpm build       # vite build → dist/plugin.mjs + dist/manifest.json
pnpm test        # vitest run
pnpm preview     # serve dist/ for "Load by URL" testing in Composer
```

A full pre-release check:

1. `pnpm build` — ensure no Vite errors and `dist/manifest.json` looks right.
2. `pnpm test` — smoke + operation tests pass.
3. Load via Composer Settings → Plugins → Load by URL.
4. Smoke-test the plugin manually in the running Composer.

## Inside the dxos monorepo

```sh
moon run plugin-foo:build
moon run plugin-foo:lint -- --fix
moon run plugin-foo:test
moon run plugin-foo:test-storybook
```

Repository-wide:

```sh
moon exec --on-failure continue --quiet :build
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
moon run :lint -- --fix
```

The `Auth token DEPOT_TOKEN does not exist` warning is normal. Filter it out.
