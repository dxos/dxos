# `moon.yml` (in-repo only)

Skip if you're building a community plugin — moon is the dxos monorepo's task runner, not part of community packaging.

## Required shape

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
  - ts-test-storybook
  - pack
  - storybook
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/blueprints/index.ts'
      - '--entryPoint=src/cli/index.ts'
      - '--entryPoint=src/operations/index.ts'
      - '--entryPoint=src/types/index.ts'
```

**Every `exports` subpath in `package.json` must have a matching `--entryPoint`.** If the entry points and exports drift apart, builds succeed locally but type resolution breaks for other packages.

## Common tasks

```sh
moon run plugin-foo:build
moon run plugin-foo:lint -- --fix
moon run plugin-foo:test
moon run plugin-foo:test-storybook
```

For optional server-side functions (e.g. webhooks, scheduled jobs) add a `deploy-functions` task pointing to the Operation file:

```yaml
  deploy-functions:
    command: $workspaceRoot/scripts/dxnext --profile main function deploy --runtime worker-loader $workspaceRoot/packages/plugins/plugin-foo/src/operations/my-fn.ts
    preset: server
```

## Reference

- `packages/plugins/plugin-chess/moon.yml`
