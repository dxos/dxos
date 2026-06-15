// Type override for esbuild-plugin-raw@0.4.x whose root index.d.ts switched from
// `export =` (CJS) to `export default` (ESM), breaking NodeNext module resolution.
// The dist/index.d.ts correctly uses `export = rawPlugin`; we mirror that here.
declare module 'esbuild-plugin-raw' {
  import type { Plugin } from 'esbuild';
  function rawPlugin(): Plugin;
  export = rawPlugin;
}
