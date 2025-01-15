//
// Copyright 2022 DXOS.org
//

import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// TODO(burdon): Reconcile with https://www.npmjs.com/package/pwa-asset-generator

export default defineConfig({
  // TODO(burdon): Despite being documented, other presets don't seem to have been implemented?
  preset: minimal2023Preset,
  headLinkOptions: {
    // NOTE: Must be root since /favicon.ico is served from root.
    // https://dev.to/masakudamatsu/favicon-nightmare-how-to-maintain-sanity-3al7
    basePath: '/',
  },
  images: [
    'public/icon.svg',
  ]
})
