//
// Copyright 2026 DXOS.org
//

import { mountLoader } from './mount';
import { DEFAULT_ROOT_ID } from './types';

//
// Production entry — bundled to a self-contained IIFE by `bootLoaderPlugin` and
// inlined into `index.html` ahead of the app bundle. Mounts the loader into the
// static backdrop using the config the plugin baked in just before this script
// (including the backdrop id, so the id has a single source). The storybook
// does NOT use this entry; it imports `mountLoader` directly so Vite compiles
// the Solid source with HMR.
//

const config = window.__BOOT_LOADER_CONFIG__ ?? {};
const el = document.getElementById(config.rootId ?? DEFAULT_ROOT_ID);
if (el) {
  mountLoader(el, config);
}
