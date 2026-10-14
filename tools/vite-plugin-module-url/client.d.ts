//
// Copyright 2026 DXOS.org
//

/**
 * `import url from './module.ts?module-url'` — absolute URL of the module compiled as a standalone
 * ES module whose exports are preserved; pass it to `import()` in any realm (worker, iframe).
 */
declare module '*?module-url' {
  const url: string;
  export default url;
}
