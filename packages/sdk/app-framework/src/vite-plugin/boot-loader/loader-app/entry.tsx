//
// Copyright 2026 DXOS.org
//

import { mountLoader } from './mount.tsx';
import { DEFAULT_ROOT_ID } from './types.ts';

//
// Production entry — bundled to a self-contained IIFE by `bootLoaderPlugin` and
// inlined into `index.html` ahead of the app bundle. Mounts the loader into the
// static backdrop using the config the plugin baked in just before this script
// (including the backdrop id, so the id has a single source). The storybook
// does NOT use this entry; it imports `mountLoader` directly so Vite compiles
// the Solid source with HMR.
//

// The boot waterfall's first bound: this IIFE is injected at `body-prepend`, so it runs before
// the app's (deferred) module script is evaluated and measures how early the shell could paint
// at all, independent of bundle size. Hosts read it by name — composer's startup telemetry
// (`bootLoaderVisibleMs`) and the startup harness waterfall both do.
performance.mark('boot:html-parsed');

const config = window.__BOOT_LOADER_CONFIG__ ?? {};
const el = document.getElementById(config.rootId ?? DEFAULT_ROOT_ID);
if (el) {
  mountLoader(el, config);
}
