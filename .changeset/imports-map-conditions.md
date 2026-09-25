---
'@dxos/app-framework': minor
---

Fix two packaging defects that only appear outside the monorepo, where a package resolves through its published manifest instead of workspace links.

A `#alias` declared in a package's `imports` map as a plain string answered every condition with the same target, and that target was TypeScript source. Because the alias survives into the emitted `.d.ts` and `.mjs`, a consumer installing the package resolved it into `node_modules/@dxos/<pkg>/src/`: tsc typechecked SDK source as if it were the consumer's own code (`skipLibCheck` does not apply, these are `.ts` files, not `.d.ts`), and Node failed outright on a specifier such as `#meta` with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. All 33 affected packages now declare `source`, `types` and `default`, so the alias resolves to `dist/` everywhere but the monorepo.

`@dxos/app-framework/testing` imported `@dxos/storybook-addon-logger/download`, which was only a devDependency, so importing that entrypoint from an installed copy threw `Cannot find package`. `StorybookErrorFallback` now lives in `@dxos/storybook-addon-logger`, which owns the download channel it calls. Stories keep the "Download logs" action: the shared storybook preview installs it through the new `setStoryErrorFallback` export. Anyone importing `StorybookErrorFallback` from `@dxos/app-framework/testing` should import it from `@dxos/storybook-addon-logger/StorybookErrorFallback` instead.
