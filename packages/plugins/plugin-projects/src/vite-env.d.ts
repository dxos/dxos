/// <reference types="vite/client" />

//
// Copyright 2026 DXOS.org
//

interface ImportMetaEnv {
  /** JSON `PluginToolchain` (`src/templates/composer-plugin.ts`) the app was built from; see composer-app's `vite.config.ts`. */
  readonly VITE_DX_PLUGIN_TOOLCHAIN?: string;
}
