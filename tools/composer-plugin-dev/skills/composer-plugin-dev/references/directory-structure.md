# Directory structure

Standard layout for `src/`. Same shape inside and outside the monorepo; only the build wiring around it differs.

```text
src/
  plugin.tsx              # Plugin.define(meta).pipe(...)   (FooPlugin.tsx in-repo)
  meta.ts                 # Plugin.Meta
  translations.ts         # i18n by typename + meta.id
  index.ts                # exports plugin + meta only
  blueprints/
    index.ts
    my-blueprint.ts
  capabilities/
    index.ts              # Capability.lazy() exports only
    react-surface.tsx
    operation-handler.ts
    blueprint-definition.ts
  components/             # NO @dxos/app-framework / @dxos/app-toolkit
    index.ts
    Thing/
      index.ts
      Thing.tsx
      Thing.stories.tsx
  containers/             # surface components (lazy)
    index.ts              # lazy(() => import('./X'))
    FooArticle/
      index.ts            # bridges named -> default
      FooArticle.tsx
      FooArticle.stories.tsx
  operations/
    index.ts              # OperationHandlerSet.lazy(...) + re-export defs
    definitions.ts
    create.ts
    move.ts
  types/
    index.ts              # export * as Foo from './Foo';
    Foo.ts
  cli/                    # in-repo only — headless entrypoint
    index.ts
    plugin.ts
```

## Rules

- `src/components/` and `src/containers/` contain **only** index files and per-component subdirectories.
- `src/index.ts` is minimal: re-export the plugin and meta. Other plugins import deep paths (`./types`, `./operations`) instead.
- Every barrel uses **named exports**. The only default exports are the per-container `index.ts` files (so `React.lazy` works).
- Container-to-container imports use the default form: `import OtherContainer from '../OtherContainer';`.
- Each capability lives in its **own file** with a single `default export` of `Capability.makeModule(...)`. The `capabilities/index.ts` barrel uses **only** `Capability.lazy(...)`.
