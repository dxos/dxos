//
// Copyright 2026 DXOS.org
//

// Ambient type for the virtual `#meta` module that plugins import. The runtime
// value is synthesized from the plugin's `dx.yml` at build time (by the dx-compile
// esbuild adapter and the composer vite adapter); this declaration provides its
// type so `import { meta } from '#meta'` type-checks without a per-plugin stub.
//
// Plugins opt in by adding `@dxos/app-framework/meta` to `compilerOptions.types`.
declare module '#meta' {
  export const meta: import('@dxos/app-framework').Plugin.Meta;
}
